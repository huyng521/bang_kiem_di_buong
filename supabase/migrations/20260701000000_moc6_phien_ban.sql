-- Mốc 6: phiên bản bảng kiểm. Bản đã công bố/hết hiệu lực và các mục của nó không sửa/xóa được;
-- mỗi thời điểm chỉ một phiên bản hiệu lực; phiên mới tự lấy phiên bản hiệu lực lúc bắt đầu.

do $$ begin
  create type trang_thai_phien_ban as enum ('nhap', 'da_cong_bo', 'het_hieu_luc');
exception when duplicate_object then null; end $$;

alter table checklist_version add column if not exists trang_thai trang_thai_phien_ban not null default 'nhap';
alter table checklist_version add column if not exists so_hieu_van_ban text;
alter table checklist_version add column if not exists ngay_ban_hanh date;
alter table checklist_version add column if not exists trich_yeu text;
alter table checklist_version add column if not exists nguoi_cong_bo_id uuid references nguoi_dung(id);
alter table checklist_version add column if not exists cong_bo_luc timestamptz;
alter table checklist_version add column if not exists nhan_ban_tu_id uuid references checklist_version(id);
alter table checklist_item add column if not exists ma_muc_goc text;

-- 1. Dữ liệu cũ: mọi phiên bản hiện có là "đã công bố"; nếu chỉ có một phiên bản thì đặt tên "Ver 2".
update checklist_version set trang_thai = 'da_cong_bo', cong_bo_luc = coalesce(cong_bo_luc, created_at)
  where trang_thai = 'nhap';
update checklist_version set ten_phien_ban = 'Ver 2'
  where (select count(*) from checklist_version) = 1;
-- Mã mục gốc ổn định xuyên phiên bản: M-001 … theo số thứ tự.
update checklist_item set ma_muc_goc = 'M-' || lpad(stt::text, 3, '0') where ma_muc_goc is null;
alter table checklist_item alter column ma_muc_goc set not null;
create unique index if not exists uq_item_ma_trong_phien_ban on checklist_item (checklist_version_id, ma_muc_goc);

-- Không cho hai phiên bản (đã công bố/hết hiệu lực) trùng ngày hiệu lực; chỉ một bản nháp tại một thời điểm.
create unique index if not exists uq_phien_ban_ngay_hieu_luc on checklist_version (ngay_hieu_luc) where trang_thai <> 'nhap';
create unique index if not exists uq_mot_ban_nhap on checklist_version ((true)) where trang_thai = 'nhap';

-- 2. Phiên bản hiệu lực tại một ngày = bản đã công bố có ngày hiệu lực lớn nhất ≤ ngày đó.
create or replace function public.phien_ban_hieu_luc(p_ngay date default null)
returns uuid language sql stable security definer set search_path = public as $$
  select id from checklist_version
  where trang_thai in ('da_cong_bo', 'het_hieu_luc')
    and ngay_hieu_luc <= coalesce(p_ngay, (now() at time zone 'Asia/Ho_Chi_Minh')::date)
  order by ngay_hieu_luc desc limit 1;
$$;
grant execute on function public.phien_ban_hieu_luc(date) to authenticated;

-- Cập nhật nhãn "hết hiệu lực" cho các bản cũ hơn bản đang hiệu lực (gọi khi cần, không bắt buộc cho đúng dữ liệu).
create or replace function public.cap_nhat_het_hieu_luc()
returns void language plpgsql security definer set search_path = public as $$
declare v_hien uuid := phien_ban_hieu_luc();
begin
  perform set_config('app.cho_doi_trang_thai_phien_ban', 'on', true);
  update checklist_version v set trang_thai = 'het_hieu_luc'
  where v.trang_thai = 'da_cong_bo' and v_hien is not null and v.id <> v_hien
    and v.ngay_hieu_luc < (select ngay_hieu_luc from checklist_version where id = v_hien);
  perform set_config('app.cho_doi_trang_thai_phien_ban', 'off', true);
end $$;

-- 3. Khóa phiên bản đã công bố/hết hiệu lực.
create or replace function public.khoa_phien_ban() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.trang_thai <> 'nhap' then
      raise exception 'Phiên bản đã công bố không xóa được' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.trang_thai <> 'nhap' then
    -- Chỉ cho đổi nhãn đã công bố → hết hiệu lực (qua cap_nhat_het_hieu_luc), không đổi gì khác.
    if current_setting('app.cho_doi_trang_thai_phien_ban', true) = 'on'
       and (to_jsonb(new) - 'trang_thai') = (to_jsonb(old) - 'trang_thai') then
      return new;
    end if;
    raise exception 'Phiên bản đã công bố không sửa được — hãy tạo phiên bản mới' using errcode = '42501';
  end if;
  if new.trang_thai <> 'nhap' and current_setting('app.dang_cong_bo', true) is distinct from 'on' then
    raise exception 'Chỉ công bố qua chức năng "Công bố"' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_khoa_phien_ban on checklist_version;
create trigger trg_khoa_phien_ban before update or delete on checklist_version
  for each row execute function public.khoa_phien_ban();

create or replace function public.khoa_muc_phien_ban() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_tt trang_thai_phien_ban;
begin
  select trang_thai into v_tt from checklist_version
    where id = case when tg_op = 'DELETE' then old.checklist_version_id else new.checklist_version_id end;
  if v_tt is distinct from 'nhap' then
    raise exception 'Mục của phiên bản đã công bố không sửa/xóa được — hãy tạo phiên bản mới' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.checklist_version_id <> new.checklist_version_id then
    raise exception 'Không chuyển mục sang phiên bản khác' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_khoa_muc_phien_ban on checklist_item;
create trigger trg_khoa_muc_phien_ban before insert or update or delete on checklist_item
  for each row execute function public.khoa_muc_phien_ban();

-- Bản nháp chỉ admin thấy.
drop policy if exists checklist_version_select on checklist_version;
create policy checklist_version_select on checklist_version for select to authenticated
  using (current_vai_tro() is not null and (trang_thai <> 'nhap' or current_vai_tro() = 'admin'));
drop policy if exists checklist_item_select on checklist_item;
create policy checklist_item_select on checklist_item for select to authenticated using (
  current_vai_tro() is not null and exists (
    select 1 from checklist_version v where v.id = checklist_version_id and (v.trang_thai <> 'nhap' or current_vai_tro() = 'admin')
  )
);

-- 4. Tạo phiên bản mới: nhân bản từ bản đang hiệu lực, trạng thái nháp.
create or replace function public.tao_phien_ban_moi(p_ten text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_goc uuid := phien_ban_hieu_luc(); v_moi uuid;
begin
  if current_vai_tro() is distinct from 'admin' then raise exception 'Chỉ quản trị viên' using errcode = '42501'; end if;
  if exists (select 1 from checklist_version where trang_thai = 'nhap') then
    raise exception 'Đang có một bản nháp, hãy hoàn tất hoặc xóa bản nháp đó trước' using errcode = 'P0001';
  end if;
  insert into checklist_version (ten_phien_ban, ngay_hieu_luc, trang_thai, nhan_ban_tu_id, active)
  values (coalesce(nullif(trim(p_ten), ''), 'Phiên bản mới'), (now() at time zone 'Asia/Ho_Chi_Minh')::date, 'nhap', v_goc, true)
  returning id into v_moi;
  insert into checklist_item (checklist_version_id, stt, noi_dung, ghi_chu_huong_dan, active, ma_muc_goc)
  select v_moi, row_number() over (order by stt), noi_dung, ghi_chu_huong_dan, true, ma_muc_goc
  from checklist_item where checklist_version_id = v_goc and active;
  return v_moi;
end $$;

-- Mã cho tiêu chí mới: lớn hơn mọi mã đã từng dùng.
create or replace function public.ma_muc_moi()
returns text language sql volatile security definer set search_path = public as $$
  select 'M-' || lpad((coalesce(max(substring(ma_muc_goc from 3)::int), 0) + 1)::text, 3, '0')
  from checklist_item where ma_muc_goc ~ '^M-[0-9]+$';
$$;

-- Đổi thứ tự các mục trong bản nháp theo danh sách id.
create or replace function public.sap_xep_muc(p_version uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_vai_tro() is distinct from 'admin' then raise exception 'Chỉ quản trị viên' using errcode = '42501'; end if;
  update checklist_item set stt = stt + 100000 where checklist_version_id = p_version;
  update checklist_item ci set stt = x.thu_tu
    from unnest(p_ids) with ordinality as x(id, thu_tu)
    where ci.id = x.id and ci.checklist_version_id = p_version;
  -- mục không có trong danh sách (nếu có) xếp cuối
  update checklist_item ci set stt = x.n
    from (select id, array_length(p_ids, 1) + row_number() over (order by stt) as n
          from checklist_item where checklist_version_id = p_version and stt > 100000) x
    where ci.id = x.id;
end $$;

-- Công bố: bắt buộc văn bản căn cứ và ngày hiệu lực không trước hôm nay.
create or replace function public.cong_bo_phien_ban(p_id uuid, p_so_hieu text, p_ngay_ban_hanh date, p_trich_yeu text, p_ngay_hieu_luc date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_vai_tro() is distinct from 'admin' then raise exception 'Chỉ quản trị viên' using errcode = '42501'; end if;
  if coalesce(trim(p_so_hieu), '') = '' or p_ngay_ban_hanh is null or coalesce(trim(p_trich_yeu), '') = '' then
    raise exception 'Phải nhập đủ số hiệu, ngày ban hành và trích yếu văn bản căn cứ' using errcode = '23514';
  end if;
  if p_ngay_hieu_luc is null or p_ngay_hieu_luc < (now() at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception 'Ngày hiệu lực không được trước hôm nay' using errcode = '23514';
  end if;
  if not exists (select 1 from checklist_item where checklist_version_id = p_id and active) then
    raise exception 'Phiên bản phải có ít nhất một mục' using errcode = '23514';
  end if;
  if exists (select 1 from checklist_version where trang_thai <> 'nhap' and ngay_hieu_luc = p_ngay_hieu_luc) then
    raise exception 'Đã có phiên bản khác hiệu lực đúng ngày này' using errcode = '23505';
  end if;
  perform set_config('app.dang_cong_bo', 'on', true);
  update checklist_version
     set trang_thai = 'da_cong_bo', so_hieu_van_ban = trim(p_so_hieu), ngay_ban_hanh = p_ngay_ban_hanh,
         trich_yeu = trim(p_trich_yeu), ngay_hieu_luc = p_ngay_hieu_luc,
         ghi_chu_van_ban_can_cu = trim(p_so_hieu) || ' ngày ' || to_char(p_ngay_ban_hanh, 'DD/MM/YYYY') || ': ' || trim(p_trich_yeu),
         nguoi_cong_bo_id = current_nguoi_dung_id(), cong_bo_luc = now()
   where id = p_id and trang_thai = 'nhap';
  if not found then raise exception 'Không tìm thấy bản nháp' using errcode = 'P0002'; end if;
  perform set_config('app.dang_cong_bo', 'off', true);
  insert into audit_log (nguoi_dung_id, vai_tro, hanh_dong, doi_tuong_loai, doi_tuong_id, gia_tri_moi)
  values (current_nguoi_dung_id(), current_vai_tro(), 'cong_bo', 'checklist_version', p_id::text,
          jsonb_build_object('so_hieu', p_so_hieu, 'ngay_hieu_luc', p_ngay_hieu_luc));
  perform cap_nhat_het_hieu_luc();
end $$;
grant execute on function public.tao_phien_ban_moi(text), public.ma_muc_moi(), public.sap_xep_muc(uuid, uuid[]),
  public.cong_bo_phien_ban(uuid, text, date, text, date), public.cap_nhat_het_hieu_luc() to authenticated;

-- 5. Phiên mới tự lấy phiên bản hiệu lực tại thời điểm bắt đầu (người dùng không chọn được).
create or replace function public.gan_phien_ban_cho_phien() returns trigger
language plpgsql security definer set search_path = public as $$
declare v uuid := phien_ban_hieu_luc();
begin
  if auth.uid() is not null and v is not null then
    new.checklist_version_id := v;
  end if;
  if new.checklist_version_id is null then
    raise exception 'Chưa có phiên bản bảng kiểm nào đang hiệu lực' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists trg_gan_phien_ban on phien_kiem_tra;
create trigger trg_gan_phien_ban before insert on phien_kiem_tra
  for each row execute function public.gan_phien_ban_cho_phien();

-- 6. Thống kê theo mục xuyên phiên bản: gom theo mã mục gốc, lấy nội dung của phiên bản mới nhất.
drop function if exists public.bao_cao_ty_le_theo_muc(date, date, uuid);
create function public.bao_cao_ty_le_theo_muc(p_tu date, p_den date, p_khoa uuid default null)
returns table (ma_muc_goc text, stt int, noi_dung text, so_dat bigint, so_khong_dat bigint, so_bo_chuan bigint, ty_le_dat numeric)
language sql stable as $$
  with t as (
    select ci.ma_muc_goc,
           count(*) filter (where v.trang_thai = 'dat_co') d,
           count(*) filter (where v.trang_thai = 'khong_dat') k,
           count(*) filter (where v.trang_thai = 'khong_co_bo_chuan') n,
           sum(v.dat)::bigint sd, sum(v.ap_dung)::bigint sa
    from v_ket_qua_tinh_ty_le v join checklist_item ci on ci.id = v.checklist_item_id
    where v.ngay_bao_cao between p_tu and p_den and (p_khoa is null or v.khoa_id = p_khoa)
    group by ci.ma_muc_goc
  ),
  moi_nhat as (
    select distinct on (ci.ma_muc_goc) ci.ma_muc_goc, ci.stt, ci.noi_dung
    from checklist_item ci join checklist_version cv on cv.id = ci.checklist_version_id
    where cv.trang_thai <> 'nhap'
    order by ci.ma_muc_goc, cv.ngay_hieu_luc desc
  )
  select t.ma_muc_goc, m.stt, m.noi_dung, t.d, t.k, t.n, ty_le_dat(t.sd, t.sa)
  from t join moi_nhat m using (ma_muc_goc)
  order by m.stt;
$$;
grant execute on function public.bao_cao_ty_le_theo_muc(date, date, uuid) to authenticated;

-- View có thêm mã mục gốc để so sánh xuyên phiên bản.
create or replace view public.v_ket_qua_tinh_ty_le
with (security_invoker = true) as
select
  p.khoa_id, p.id as phien_kiem_tra_id, p.ngay_bao_cao, p.checklist_version_id, pp.phong_benh_id,
  kq.checklist_item_id, kq.trang_thai,
  (kq.trang_thai = 'dat_co')::int as dat,
  (kq.trang_thai in ('dat_co', 'khong_dat'))::int as ap_dung,
  ci.ma_muc_goc
from ket_qua_kiem_tra kq
join phien_kiem_tra_phong pp on pp.id = kq.phien_kiem_tra_phong_id
join phien_kiem_tra p on p.id = pp.phien_kiem_tra_id
join checklist_item ci on ci.id = kq.checklist_item_id
where p.trang_thai = 'hoan_thanh' and not p.an and kq.trang_thai is not null;
