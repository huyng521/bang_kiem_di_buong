-- Mốc 2: ảnh minh chứng. Ảnh lưu ở Supabase Storage, bucket riêng tư "minh-chung",
-- đường dẫn: <khoa_id>/<phien_kiem_tra_id>/<ten-ngau-nhien>.jpg

-- 1. Hàm quyền dùng chung (cũng dùng cho Storage).
create or replace function public.co_quyen_xem_khoa(p_khoa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select current_vai_tro() in ('admin', 'ban_giam_doc')
      or (current_vai_tro() = 'truong_khoa' and p_khoa = current_khoa_id());
$$;

-- Ghi dữ liệu thuộc một phiên: admin luôn được; trưởng khoa chỉ phiên nháp của khoa mình.
create or replace function public.co_quyen_ghi_phien(p_phien uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select current_vai_tro() = 'admin'
      or exists (
        select 1 from phien_kiem_tra p
        where p.id = p_phien and p.trang_thai = 'draft' and not p.an
          and current_vai_tro() = 'truong_khoa' and p.khoa_id = current_khoa_id()
      );
$$;

-- 2. Bảng ảnh. khoa_id và phien_kiem_tra_id được trigger tự điền từ ô kết quả, để quy tắc
--    truy cập ảnh luôn khớp với phiên tương ứng.
do $$ begin
  create type loai_minh_chung as enum ('kiem_tra', 'khac_phuc');
exception when duplicate_object then null; end $$;

create table if not exists minh_chung_anh (
  id uuid primary key default gen_random_uuid(),
  ket_qua_kiem_tra_id uuid references ket_qua_kiem_tra(id) on delete restrict,
  hanh_dong_khac_phuc_id uuid, -- khóa ngoại thêm ở Mốc 3
  loai loai_minh_chung not null default 'kiem_tra',
  storage_path text not null unique,
  ten_file text,
  kich_thuoc_byte int,
  nguoi_tai_len_id uuid references nguoi_dung(id),
  thoi_gian_tai_len timestamptz not null default now(),
  ghi_chu text,
  khoa_id uuid not null references khoa(id),
  phien_kiem_tra_id uuid references phien_kiem_tra(id),
  constraint minh_chung_dung_mot_nguon check (num_nonnulls(ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id) = 1)
);
create index if not exists idx_mca_ket_qua on minh_chung_anh(ket_qua_kiem_tra_id);
create index if not exists idx_mca_phien on minh_chung_anh(phien_kiem_tra_id);

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
    if v_so >= 5 then
      raise exception 'Mỗi ô kết quả chỉ được tối đa 5 ảnh' using errcode = 'P0001';
    end if;
  end if;
  if new.khoa_id is null then
    raise exception 'Không xác định được khoa của ảnh' using errcode = 'P0001';
  end if;
  if new.nguoi_tai_len_id is null then
    new.nguoi_tai_len_id := current_nguoi_dung_id();
  end if;
  return new;
end $$;
drop trigger if exists trg_dien_thong_tin_minh_chung on minh_chung_anh;
create trigger trg_dien_thong_tin_minh_chung before insert on minh_chung_anh
  for each row execute function public.dien_thong_tin_minh_chung();

alter table minh_chung_anh enable row level security;
drop policy if exists mca_select on minh_chung_anh;
create policy mca_select on minh_chung_anh for select to authenticated using (co_quyen_xem_khoa(khoa_id));
drop policy if exists mca_insert on minh_chung_anh;
create policy mca_insert on minh_chung_anh for insert to authenticated
  with check (loai = 'kiem_tra' and co_quyen_ghi_phien(phien_kiem_tra_id));
drop policy if exists mca_update on minh_chung_anh;
create policy mca_update on minh_chung_anh for update to authenticated
  using (co_quyen_ghi_phien(phien_kiem_tra_id)) with check (co_quyen_ghi_phien(phien_kiem_tra_id));
drop policy if exists mca_delete on minh_chung_anh;
create policy mca_delete on minh_chung_anh for delete to authenticated
  using (co_quyen_ghi_phien(phien_kiem_tra_id));

-- 3. Bucket riêng tư + quy tắc Storage: thư mục 1 = khoa, thư mục 2 = phiên.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('minh-chung', 'minh-chung', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.thu_muc_anh(p_name text, p_vi_tri int)
returns uuid language sql immutable as $$
  select case when split_part(p_name, '/', p_vi_tri) ~ '^[0-9a-f-]{36}$'
              then split_part(p_name, '/', p_vi_tri)::uuid end;
$$;

drop policy if exists minh_chung_doc on storage.objects;
create policy minh_chung_doc on storage.objects for select to authenticated
  using (bucket_id = 'minh-chung' and public.co_quyen_xem_khoa(public.thu_muc_anh(name, 1)));
drop policy if exists minh_chung_tai_len on storage.objects;
create policy minh_chung_tai_len on storage.objects for insert to authenticated
  with check (
    bucket_id = 'minh-chung'
    and public.co_quyen_ghi_phien(public.thu_muc_anh(name, 2))
    and exists (select 1 from public.phien_kiem_tra p
                where p.id = public.thu_muc_anh(name, 2) and p.khoa_id = public.thu_muc_anh(name, 1))
  );
drop policy if exists minh_chung_xoa on storage.objects;
create policy minh_chung_xoa on storage.objects for delete to authenticated
  using (bucket_id = 'minh-chung' and public.co_quyen_ghi_phien(public.thu_muc_anh(name, 2)));
