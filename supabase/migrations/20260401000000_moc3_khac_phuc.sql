-- Mốc 3: theo dõi khắc phục (corrective action). Không xóa cứng; mọi đổi trạng thái được ghi lịch sử.

do $$ begin
  create type muc_uu_tien as enum ('thap', 'trung_binh', 'cao');
exception when duplicate_object then null; end $$;
do $$ begin
  create type trang_thai_khac_phuc as enum ('moi', 'dang_xu_ly', 'da_khac_phuc', 'da_xac_nhan', 'huy');
exception when duplicate_object then null; end $$;

create table if not exists hanh_dong_khac_phuc (
  id uuid primary key default gen_random_uuid(),
  khoa_id uuid not null references khoa(id),
  phien_kiem_tra_id uuid not null references phien_kiem_tra(id),
  checklist_item_id uuid not null references checklist_item(id),
  mo_ta_van_de text not null,
  bien_phap text,
  nguoi_phu_trach text,
  han_xu_ly date,
  muc_uu_tien muc_uu_tien not null default 'trung_binh',
  trang_thai trang_thai_khac_phuc not null default 'moi',
  ngay_hoan_thanh date,
  ghi_chu_khac_phuc text,
  ly_do_huy text,
  nguoi_tao_id uuid references nguoi_dung(id),
  nguoi_xac_nhan_id uuid references nguoi_dung(id),
  xac_nhan_luc timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_hdkp_khoa_tt on hanh_dong_khac_phuc(khoa_id, trang_thai);
create index if not exists idx_hdkp_phien on hanh_dong_khac_phuc(phien_kiem_tra_id);

-- 1 hành động gắn với nhiều phòng "Không đạt" của cùng một mục.
create table if not exists hanh_dong_khac_phuc_ket_qua (
  hanh_dong_id uuid not null references hanh_dong_khac_phuc(id),
  ket_qua_kiem_tra_id uuid not null references ket_qua_kiem_tra(id),
  primary key (hanh_dong_id, ket_qua_kiem_tra_id)
);

-- Mục "Không đạt" trưởng khoa chủ động bỏ qua (không tạo hành động) — để đánh dấu rõ.
create table if not exists khac_phuc_bo_qua (
  phien_kiem_tra_id uuid not null references phien_kiem_tra(id),
  checklist_item_id uuid not null references checklist_item(id),
  khoa_id uuid not null references khoa(id),
  nguoi_id uuid references nguoi_dung(id) default current_nguoi_dung_id(),
  luc timestamptz not null default now(),
  primary key (phien_kiem_tra_id, checklist_item_id)
);

create table if not exists hanh_dong_khac_phuc_lich_su (
  id bigint generated always as identity primary key,
  hanh_dong_id uuid not null references hanh_dong_khac_phuc(id),
  tu_trang_thai trang_thai_khac_phuc,
  den_trang_thai trang_thai_khac_phuc not null,
  ghi_chu text,
  nguoi_id uuid references nguoi_dung(id),
  luc timestamptz not null default now()
);
create index if not exists idx_hdkp_ls on hanh_dong_khac_phuc_lich_su(hanh_dong_id);

-- Quyền ghi một hành động: admin luôn được; trưởng khoa: khoa mình, khi chưa kết thúc.
create or replace function public.co_quyen_ghi_hanh_dong(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select current_vai_tro() = 'admin'
      or exists (select 1 from hanh_dong_khac_phuc h
                 where h.id = p_id and current_vai_tro() = 'truong_khoa'
                   and h.khoa_id = current_khoa_id()
                   and h.trang_thai not in ('da_xac_nhan', 'huy'));
$$;

-- Quy tắc chuyển trạng thái + tự điền thông tin.
create or replace function public.kiem_tra_hanh_dong_khac_phuc()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  la_admin boolean := auth.uid() is null or current_vai_tro() = 'admin';
  hop_le boolean;
begin
  if tg_op = 'INSERT' then
    new.nguoi_tao_id := coalesce(new.nguoi_tao_id, current_nguoi_dung_id());
    new.trang_thai := 'moi';
    -- khoa phải khớp phiên
    if not exists (select 1 from phien_kiem_tra p where p.id = new.phien_kiem_tra_id and p.khoa_id = new.khoa_id) then
      raise exception 'Hành động phải thuộc đúng khoa của phiên kiểm tra' using errcode = '42501';
    end if;
    return new;
  end if;

  new.updated_at := now();
  if not la_admin and (new.khoa_id <> old.khoa_id or new.phien_kiem_tra_id <> old.phien_kiem_tra_id
      or new.checklist_item_id <> old.checklist_item_id or new.nguoi_tao_id is distinct from old.nguoi_tao_id) then
    raise exception 'Không được đổi khoa/phiên/mục của hành động khắc phục' using errcode = '42501';
  end if;

  if new.trang_thai <> old.trang_thai then
    hop_le := case old.trang_thai
      when 'moi' then new.trang_thai in ('dang_xu_ly', 'da_khac_phuc', 'huy')
      when 'dang_xu_ly' then new.trang_thai in ('da_khac_phuc', 'huy')
      when 'da_khac_phuc' then new.trang_thai in ('da_xac_nhan', 'dang_xu_ly', 'huy')
      else la_admin -- đã xác nhận/hủy: chỉ admin mở lại
    end;
    if not hop_le then
      raise exception 'Không chuyển được từ "%" sang "%"', old.trang_thai, new.trang_thai using errcode = '42501';
    end if;
    if new.trang_thai = 'huy' and coalesce(trim(new.ly_do_huy), '') = '' then
      raise exception 'Hủy hành động phải ghi lý do' using errcode = '23514';
    end if;
    if new.trang_thai = 'da_khac_phuc' and new.ngay_hoan_thanh is null then
      new.ngay_hoan_thanh := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
    end if;
    if new.trang_thai = 'da_xac_nhan' then
      new.nguoi_xac_nhan_id := current_nguoi_dung_id();
      new.xac_nhan_luc := now();
    end if;
    insert into hanh_dong_khac_phuc_lich_su (hanh_dong_id, tu_trang_thai, den_trang_thai, ghi_chu, nguoi_id)
      values (new.id, old.trang_thai, new.trang_thai,
              case when new.trang_thai = 'huy' then new.ly_do_huy else new.ghi_chu_khac_phuc end,
              current_nguoi_dung_id());
  end if;
  return new;
end $$;
drop trigger if exists trg_kiem_tra_hdkp on hanh_dong_khac_phuc;
create trigger trg_kiem_tra_hdkp before insert or update on hanh_dong_khac_phuc
  for each row execute function public.kiem_tra_hanh_dong_khac_phuc();
-- Lịch sử của bản ghi mới phải ghi SAU khi bản ghi tồn tại (khóa ngoại).
create or replace function public.ghi_lich_su_tao_hanh_dong() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into hanh_dong_khac_phuc_lich_su (hanh_dong_id, tu_trang_thai, den_trang_thai, nguoi_id)
    values (new.id, null, 'moi', current_nguoi_dung_id());
  return new;
end $$;
drop trigger if exists trg_lich_su_tao_hdkp on hanh_dong_khac_phuc;
create trigger trg_lich_su_tao_hdkp after insert on hanh_dong_khac_phuc
  for each row execute function public.ghi_lich_su_tao_hanh_dong();

-- RLS
alter table hanh_dong_khac_phuc enable row level security;
alter table hanh_dong_khac_phuc_ket_qua enable row level security;
alter table khac_phuc_bo_qua enable row level security;
alter table hanh_dong_khac_phuc_lich_su enable row level security;

drop policy if exists hdkp_select on hanh_dong_khac_phuc;
create policy hdkp_select on hanh_dong_khac_phuc for select to authenticated using (co_quyen_xem_khoa(khoa_id));
drop policy if exists hdkp_insert on hanh_dong_khac_phuc;
create policy hdkp_insert on hanh_dong_khac_phuc for insert to authenticated with check (
  current_vai_tro() = 'admin' or (current_vai_tro() = 'truong_khoa' and khoa_id = current_khoa_id())
);
drop policy if exists hdkp_update on hanh_dong_khac_phuc;
create policy hdkp_update on hanh_dong_khac_phuc for update to authenticated
  using (co_quyen_ghi_hanh_dong(id))
  with check (current_vai_tro() = 'admin' or (current_vai_tro() = 'truong_khoa' and khoa_id = current_khoa_id()));

drop policy if exists hdkpkq_select on hanh_dong_khac_phuc_ket_qua;
create policy hdkpkq_select on hanh_dong_khac_phuc_ket_qua for select to authenticated using (
  exists (select 1 from hanh_dong_khac_phuc h where h.id = hanh_dong_id and co_quyen_xem_khoa(h.khoa_id))
);
drop policy if exists hdkpkq_insert on hanh_dong_khac_phuc_ket_qua;
create policy hdkpkq_insert on hanh_dong_khac_phuc_ket_qua for insert to authenticated with check (
  co_quyen_ghi_hanh_dong(hanh_dong_id)
  and exists (
    select 1 from hanh_dong_khac_phuc h
    join ket_qua_kiem_tra kq on kq.id = ket_qua_kiem_tra_id
    join phien_kiem_tra_phong pp on pp.id = kq.phien_kiem_tra_phong_id
    where h.id = hanh_dong_id and pp.phien_kiem_tra_id = h.phien_kiem_tra_id and kq.checklist_item_id = h.checklist_item_id
  )
);

drop policy if exists kpbq_select on khac_phuc_bo_qua;
create policy kpbq_select on khac_phuc_bo_qua for select to authenticated using (co_quyen_xem_khoa(khoa_id));
drop policy if exists kpbq_insert on khac_phuc_bo_qua;
create policy kpbq_insert on khac_phuc_bo_qua for insert to authenticated with check (
  (current_vai_tro() = 'admin' or (current_vai_tro() = 'truong_khoa' and khoa_id = current_khoa_id()))
  and exists (select 1 from phien_kiem_tra p where p.id = phien_kiem_tra_id and p.khoa_id = khoa_id)
);
drop policy if exists kpbq_delete on khac_phuc_bo_qua;
create policy kpbq_delete on khac_phuc_bo_qua for delete to authenticated using (
  current_vai_tro() = 'admin' or (current_vai_tro() = 'truong_khoa' and khoa_id = current_khoa_id())
);

drop policy if exists hdkpls_select on hanh_dong_khac_phuc_lich_su;
create policy hdkpls_select on hanh_dong_khac_phuc_lich_su for select to authenticated using (
  exists (select 1 from hanh_dong_khac_phuc h where h.id = hanh_dong_id and co_quyen_xem_khoa(h.khoa_id))
);
-- lịch sử chỉ do trigger ghi (security definer): không có policy insert/update/delete.

-- Ảnh sau khắc phục: đường dẫn <khoa_id>/<hanh_dong_id>/<ten>.jpg
alter table minh_chung_anh drop constraint if exists minh_chung_anh_hanh_dong_fk;
alter table minh_chung_anh add constraint minh_chung_anh_hanh_dong_fk
  foreign key (hanh_dong_khac_phuc_id) references hanh_dong_khac_phuc(id) on delete restrict;
create index if not exists idx_mca_hanh_dong on minh_chung_anh(hanh_dong_khac_phuc_id);

create or replace function public.dien_thong_tin_minh_chung()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_so int;
begin
  if new.ket_qua_kiem_tra_id is not null then
    select p.id, p.khoa_id into new.phien_kiem_tra_id, new.khoa_id
    from ket_qua_kiem_tra kq
    join phien_kiem_tra_phong pp on pp.id = kq.phien_kiem_tra_phong_id
    join phien_kiem_tra p on p.id = pp.phien_kiem_tra_id
    where kq.id = new.ket_qua_kiem_tra_id;
    new.loai := 'kiem_tra';
    select count(*) into v_so from minh_chung_anh where ket_qua_kiem_tra_id = new.ket_qua_kiem_tra_id;
  else
    select h.phien_kiem_tra_id, h.khoa_id into new.phien_kiem_tra_id, new.khoa_id
    from hanh_dong_khac_phuc h where h.id = new.hanh_dong_khac_phuc_id;
    new.loai := 'khac_phuc';
    select count(*) into v_so from minh_chung_anh where hanh_dong_khac_phuc_id = new.hanh_dong_khac_phuc_id;
  end if;
  if v_so >= 5 then
    raise exception 'Mỗi ô kết quả chỉ được tối đa 5 ảnh' using errcode = 'P0001';
  end if;
  if new.khoa_id is null then
    raise exception 'Không xác định được khoa của ảnh' using errcode = 'P0001';
  end if;
  if new.nguoi_tai_len_id is null then
    new.nguoi_tai_len_id := current_nguoi_dung_id();
  end if;
  return new;
end $$;

create or replace function public.co_quyen_ghi_anh(p_loai loai_minh_chung, p_phien uuid, p_hanh_dong uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case when p_loai = 'kiem_tra' then co_quyen_ghi_phien(p_phien)
              else co_quyen_ghi_hanh_dong(p_hanh_dong) end;
$$;
drop policy if exists mca_insert on minh_chung_anh;
create policy mca_insert on minh_chung_anh for insert to authenticated
  with check (co_quyen_ghi_anh(loai, phien_kiem_tra_id, hanh_dong_khac_phuc_id));
drop policy if exists mca_update on minh_chung_anh;
create policy mca_update on minh_chung_anh for update to authenticated
  using (co_quyen_ghi_anh(loai, phien_kiem_tra_id, hanh_dong_khac_phuc_id))
  with check (co_quyen_ghi_anh(loai, phien_kiem_tra_id, hanh_dong_khac_phuc_id));
drop policy if exists mca_delete on minh_chung_anh;
create policy mca_delete on minh_chung_anh for delete to authenticated
  using (co_quyen_ghi_anh(loai, phien_kiem_tra_id, hanh_dong_khac_phuc_id));

drop policy if exists minh_chung_tai_len on storage.objects;
create policy minh_chung_tai_len on storage.objects for insert to authenticated
  with check (
    bucket_id = 'minh-chung' and (
      (public.co_quyen_ghi_phien(public.thu_muc_anh(name, 2))
        and exists (select 1 from public.phien_kiem_tra p where p.id = public.thu_muc_anh(name, 2) and p.khoa_id = public.thu_muc_anh(name, 1)))
      or
      (public.co_quyen_ghi_hanh_dong(public.thu_muc_anh(name, 2))
        and exists (select 1 from public.hanh_dong_khac_phuc h where h.id = public.thu_muc_anh(name, 2) and h.khoa_id = public.thu_muc_anh(name, 1)))
    )
  );
drop policy if exists minh_chung_xoa on storage.objects;
create policy minh_chung_xoa on storage.objects for delete to authenticated
  using (bucket_id = 'minh-chung' and (public.co_quyen_ghi_phien(public.thu_muc_anh(name, 2))
                                       or public.co_quyen_ghi_hanh_dong(public.thu_muc_anh(name, 2))));

-- Thống kê khắc phục theo khoa (tôn trọng RLS của người gọi).
create or replace function public.thong_ke_khac_phuc(p_tu date, p_den date)
returns table (khoa_id uuid, so_tong bigint, so_mo bigint, so_qua_han bigint, so_da_xac_nhan bigint, so_huy bigint, tb_ngay_khac_phuc numeric)
language sql stable as $$
  select h.khoa_id,
    count(*),
    count(*) filter (where h.trang_thai in ('moi', 'dang_xu_ly', 'da_khac_phuc')),
    count(*) filter (where h.trang_thai in ('moi', 'dang_xu_ly')
                     and h.han_xu_ly < (now() at time zone 'Asia/Ho_Chi_Minh')::date),
    count(*) filter (where h.trang_thai = 'da_xac_nhan'),
    count(*) filter (where h.trang_thai = 'huy'),
    round(avg(h.ngay_hoan_thanh - (h.created_at at time zone 'Asia/Ho_Chi_Minh')::date)
          filter (where h.ngay_hoan_thanh is not null), 1)
  from hanh_dong_khac_phuc h
  where (h.created_at at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den
  group by h.khoa_id;
$$;
grant execute on function public.thong_ke_khac_phuc(date, date) to authenticated;
