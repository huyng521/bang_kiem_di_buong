-- Mốc 4: cài đặt hệ thống, công thức tỷ lệ đạt dùng chung, báo cáo theo mục.

-- 1. Cài đặt hệ thống: đúng 1 dòng (id = 1).
create table if not exists cau_hinh_he_thong (
  id int primary key default 1 check (id = 1),
  ten_benh_vien text not null default '',
  ten_don_vi_quan_ly text not null default 'Phòng Điều dưỡng',
  logo_path text,
  muc_tieu_ty_le_dat numeric(5, 2) not null default 90 check (muc_tieu_ty_le_dat between 0 and 100),
  ngay_di_buong int[] not null default '{1,2,3,4,5}', -- 1 = thứ 2 … 7 = chủ nhật
  gio_nhac_chua_di_buong time not null default '15:00',
  updated_at timestamptz not null default now()
);
insert into cau_hinh_he_thong (id) values (1) on conflict (id) do nothing;
alter table cau_hinh_he_thong enable row level security;
drop policy if exists chht_select on cau_hinh_he_thong;
create policy chht_select on cau_hinh_he_thong for select to authenticated using (current_vai_tro() is not null);
drop policy if exists chht_update on cau_hinh_he_thong;
create policy chht_update on cau_hinh_he_thong for update to authenticated
  using (current_vai_tro() = 'admin') with check (current_vai_tro() = 'admin');

-- Logo: bucket riêng tư "he-thong", mọi người dùng đang hoạt động đọc được, chỉ admin ghi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('he-thong', 'he-thong', false, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;
drop policy if exists he_thong_doc on storage.objects;
create policy he_thong_doc on storage.objects for select to authenticated
  using (bucket_id = 'he-thong' and public.current_vai_tro() is not null);
drop policy if exists he_thong_ghi on storage.objects;
create policy he_thong_ghi on storage.objects for all to authenticated
  using (bucket_id = 'he-thong' and public.current_vai_tro() = 'admin')
  with check (bucket_id = 'he-thong' and public.current_vai_tro() = 'admin');

-- 2. Tổng số giường kế hoạch của khoa (không bắt buộc) — để tính công suất sử dụng giường.
alter table khoa add column if not exists so_giuong_ke_hoach int check (so_giuong_ke_hoach is null or so_giuong_ke_hoach >= 0);

-- 3. CÔNG THỨC TỶ LỆ ĐẠT DUY NHẤT.
--    ty_le_dat = đạt / (đạt + không đạt); loại "Không có/Bỏ chuẩn" và ô chưa chấm;
--    chỉ tính phiên đã hoàn thành và chưa ẩn. Mọi báo cáo lấy từ view + hàm dưới đây.
create or replace function public.ty_le_dat(p_dat bigint, p_ap_dung bigint)
returns numeric language sql immutable as $$
  select case when coalesce(p_ap_dung, 0) = 0 then null
              else round(100.0 * p_dat / p_ap_dung, 1) end;
$$;

create or replace view public.v_ket_qua_tinh_ty_le
with (security_invoker = true) as
select
  p.khoa_id,
  p.id as phien_kiem_tra_id,
  p.ngay_bao_cao,
  p.checklist_version_id,
  pp.phong_benh_id,
  kq.checklist_item_id,
  kq.trang_thai,
  (kq.trang_thai = 'dat_co')::int as dat,
  (kq.trang_thai in ('dat_co', 'khong_dat'))::int as ap_dung
from ket_qua_kiem_tra kq
join phien_kiem_tra_phong pp on pp.id = kq.phien_kiem_tra_phong_id
join phien_kiem_tra p on p.id = pp.phien_kiem_tra_id
where p.trang_thai = 'hoan_thanh' and not p.an and kq.trang_thai is not null;
grant select on public.v_ket_qua_tinh_ty_le to authenticated;

-- Báo cáo theo khoa (giữ nguyên tên/kiểu trả về của Giai đoạn 1), nay dùng view chung.
create or replace function public.bao_cao_ty_le_dat(p_tu_ngay date, p_den_ngay date)
returns table (khoa_id uuid, ten_khoa text, so_phien bigint, tong_muc_ap_dung bigint, so_dat bigint, ty_le_dat numeric)
language sql stable as $$
  select k.id, k.ten_khoa, count(distinct v.phien_kiem_tra_id),
         sum(v.ap_dung)::bigint, sum(v.dat)::bigint, ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from v_ket_qua_tinh_ty_le v join khoa k on k.id = v.khoa_id
  where v.ngay_bao_cao between p_tu_ngay and p_den_ngay
  group by k.id, k.ten_khoa
  order by k.ten_khoa;
$$;

-- Tỷ lệ đạt từng mục (lọc theo khoa nếu truyền), dùng cho báo cáo tháng.
create or replace function public.bao_cao_ty_le_theo_muc(p_tu date, p_den date, p_khoa uuid default null)
returns table (checklist_item_id uuid, stt int, noi_dung text, so_dat bigint, so_khong_dat bigint, so_bo_chuan bigint, ty_le_dat numeric)
language sql stable as $$
  select ci.id, ci.stt, ci.noi_dung,
         count(*) filter (where v.trang_thai = 'dat_co'),
         count(*) filter (where v.trang_thai = 'khong_dat'),
         count(*) filter (where v.trang_thai = 'khong_co_bo_chuan'),
         ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from v_ket_qua_tinh_ty_le v join checklist_item ci on ci.id = v.checklist_item_id
  where v.ngay_bao_cao between p_tu and p_den and (p_khoa is null or v.khoa_id = p_khoa)
  group by ci.id, ci.stt, ci.noi_dung
  order by ci.stt;
$$;
grant execute on function public.ty_le_dat(bigint, bigint), public.bao_cao_ty_le_theo_muc(date, date, uuid) to authenticated;
