-- Mốc 10: index phục vụ báo cáo/dashboard khi dữ liệu toàn viện lớn dần.
create index if not exists idx_phien_hoan_thanh_khoa_ngay on phien_kiem_tra (khoa_id, ngay_bao_cao)
  where trang_thai = 'hoan_thanh' and not an;
create index if not exists idx_phien_hoan_thanh_ngay on phien_kiem_tra (ngay_bao_cao)
  where trang_thai = 'hoan_thanh' and not an;
create index if not exists idx_pktp_phong on phien_kiem_tra_phong (phong_benh_id);
create index if not exists idx_kqkt_muc on ket_qua_kiem_tra (checklist_item_id);
create index if not exists idx_hdkp_han_mo on hanh_dong_khac_phuc (han_xu_ly) where trang_thai in ('moi', 'dang_xu_ly');
create index if not exists idx_phien_nhap on phien_kiem_tra (thoi_gian_bat_dau) where trang_thai = 'draft' and not an;

-- Nguồn dữ liệu tính tỷ lệ đạt dùng chung, tối ưu cho dữ liệu lớn:
--  * lọc khoảng ngày trước (dùng index), * kiểm tra quyền MỘT lần mỗi truy vấn thay vì RLS từng dòng.
-- Quyền vẫn đúng như ma trận: admin/ban giám đốc mọi khoa, trưởng khoa chỉ khoa mình, tài khoản khóa không thấy gì.
create or replace function public.ket_qua_trong_khoang(p_tu date, p_den date)
returns table (khoa_id uuid, phien_kiem_tra_id uuid, ngay_bao_cao date, checklist_version_id uuid, phong_benh_id uuid,
               checklist_item_id uuid, trang_thai trang_thai_kq, dat int, ap_dung int, ma_muc_goc text)
language sql stable security definer set search_path = public as $$
  with q as (select current_vai_tro() vt, current_khoa_id() kid)
  select p.khoa_id, p.id, p.ngay_bao_cao, p.checklist_version_id, pp.phong_benh_id, kq.checklist_item_id, kq.trang_thai,
         (kq.trang_thai = 'dat_co')::int, (kq.trang_thai in ('dat_co', 'khong_dat'))::int, ci.ma_muc_goc
  from q, phien_kiem_tra p
  join phien_kiem_tra_phong pp on pp.phien_kiem_tra_id = p.id
  join ket_qua_kiem_tra kq on kq.phien_kiem_tra_phong_id = pp.id
  join checklist_item ci on ci.id = kq.checklist_item_id
  where p.trang_thai = 'hoan_thanh' and not p.an and kq.trang_thai is not null
    and p.ngay_bao_cao between p_tu and p_den
    and (q.vt in ('admin', 'ban_giam_doc') or (q.vt = 'truong_khoa' and p.khoa_id = q.kid));
$$;
grant execute on function public.ket_qua_trong_khoang(date, date) to authenticated;

create or replace function public.bao_cao_ty_le_dat(p_tu_ngay date, p_den_ngay date)
returns table (khoa_id uuid, ten_khoa text, so_phien bigint, tong_muc_ap_dung bigint, so_dat bigint, ty_le_dat numeric)
language sql stable as $$
  select k.id, k.ten_khoa, count(distinct v.phien_kiem_tra_id), sum(v.ap_dung)::bigint, sum(v.dat)::bigint,
         ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from ket_qua_trong_khoang(p_tu_ngay, p_den_ngay) v join khoa k on k.id = v.khoa_id
  group by k.id, k.ten_khoa order by k.ten_khoa;
$$;

create or replace function public.bao_cao_ty_le_theo_muc(p_tu date, p_den date, p_khoa uuid default null)
returns table (ma_muc_goc text, stt int, noi_dung text, so_dat bigint, so_khong_dat bigint, so_bo_chuan bigint, ty_le_dat numeric)
language sql stable as $$
  with t as (
    select v.ma_muc_goc, count(*) filter (where v.trang_thai = 'dat_co') d, count(*) filter (where v.trang_thai = 'khong_dat') k,
           count(*) filter (where v.trang_thai = 'khong_co_bo_chuan') n, sum(v.dat)::bigint sd, sum(v.ap_dung)::bigint sa
    from ket_qua_trong_khoang(p_tu, p_den) v where p_khoa is null or v.khoa_id = p_khoa group by 1
  ), moi_nhat as (
    select distinct on (ci.ma_muc_goc) ci.ma_muc_goc, ci.stt, ci.noi_dung
    from checklist_item ci join checklist_version cv on cv.id = ci.checklist_version_id
    where cv.trang_thai <> 'nhap' order by ci.ma_muc_goc, cv.ngay_hieu_luc desc
  )
  select t.ma_muc_goc, m.stt, m.noi_dung, t.d, t.k, t.n, ty_le_dat(t.sd, t.sa) from t join moi_nhat m using (ma_muc_goc) order by m.stt;
$$;

create or replace function public.db_xu_huong(p_tu date, p_den date, p_don_vi text default 'thang', p_khoa uuid[] default null, p_phong uuid default null)
returns table (ky date, khoa_id uuid, so_dat bigint, so_ap_dung bigint, ty_le_dat numeric)
language sql stable as $$
  select dau_ky(v.ngay_bao_cao, p_don_vi), v.khoa_id, sum(v.dat)::bigint, sum(v.ap_dung)::bigint, ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from ket_qua_trong_khoang(p_tu, p_den) v
  where (p_khoa is null or v.khoa_id = any(p_khoa)) and (p_phong is null or v.phong_benh_id = p_phong)
  group by 1, 2 order by 1, 2;
$$;

create or replace function public.db_theo_phong(p_tu date, p_den date, p_khoa uuid)
returns table (phong_benh_id uuid, so_phong text, so_dat bigint, so_ap_dung bigint, ty_le_dat numeric)
language sql stable as $$
  select v.phong_benh_id, pb.so_phong, sum(v.dat)::bigint, sum(v.ap_dung)::bigint, ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from ket_qua_trong_khoang(p_tu, p_den) v join phong_benh pb on pb.id = v.phong_benh_id
  where v.khoa_id = p_khoa group by 1, 2 order by 2;
$$;

create or replace function public.db_theo_muc(p_tu date, p_den date, p_khoa uuid default null, p_phong uuid default null)
returns table (ma_muc_goc text, stt int, noi_dung text, so_dat bigint, so_khong_dat bigint, ty_le_dat numeric)
language sql stable as $$
  with t as (
    select v.ma_muc_goc, sum(v.dat)::bigint d, (sum(v.ap_dung) - sum(v.dat))::bigint k, sum(v.ap_dung)::bigint a
    from ket_qua_trong_khoang(p_tu, p_den) v
    where (p_khoa is null or v.khoa_id = p_khoa) and (p_phong is null or v.phong_benh_id = p_phong) group by 1
  ), moi_nhat as (
    select distinct on (ci.ma_muc_goc) ci.ma_muc_goc, ci.stt, ci.noi_dung
    from checklist_item ci join checklist_version cv on cv.id = ci.checklist_version_id
    where cv.trang_thai <> 'nhap' order by ci.ma_muc_goc, cv.ngay_hieu_luc desc
  )
  select t.ma_muc_goc, m.stt, m.noi_dung, t.d, t.k, ty_le_dat(t.d, t.a) from t join moi_nhat m using (ma_muc_goc) order by m.stt;
$$;

create or replace function public.db_nhiet_khoa_muc(p_tu date, p_den date)
returns table (khoa_id uuid, ma_muc_goc text, so_ap_dung bigint, ty_le_dat numeric)
language sql stable as $$
  select v.khoa_id, v.ma_muc_goc, sum(v.ap_dung)::bigint, ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from ket_qua_trong_khoang(p_tu, p_den) v group by 1, 2;
$$;
