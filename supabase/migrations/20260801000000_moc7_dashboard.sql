-- Mốc 7: hàm tổng hợp cho dashboard. Tất cả là hàm SQL thường (security invoker) nên tôn trọng RLS:
-- trưởng khoa chỉ nhận số liệu khoa mình. Tỷ lệ đạt luôn qua view v_ket_qua_tinh_ty_le + ty_le_dat().

-- Đầu kỳ theo đơn vị thời gian.
create or replace function public.dau_ky(p_ngay date, p_don_vi text)
returns date language sql immutable as $$
  select case p_don_vi
    when 'tuan' then date_trunc('week', p_ngay)::date
    when 'quy' then date_trunc('quarter', p_ngay)::date
    else date_trunc('month', p_ngay)::date end;
$$;

-- Xu hướng tỷ lệ đạt theo kỳ (tuần/tháng/quý), tách theo khoa.
create or replace function public.db_xu_huong(p_tu date, p_den date, p_don_vi text default 'thang',
                                              p_khoa uuid[] default null, p_phong uuid default null)
returns table (ky date, khoa_id uuid, so_dat bigint, so_ap_dung bigint, ty_le_dat numeric)
language sql stable as $$
  select dau_ky(v.ngay_bao_cao, p_don_vi), v.khoa_id, sum(v.dat)::bigint, sum(v.ap_dung)::bigint,
         ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from v_ket_qua_tinh_ty_le v
  where v.ngay_bao_cao between p_tu and p_den
    and (p_khoa is null or v.khoa_id = any(p_khoa))
    and (p_phong is null or v.phong_benh_id = p_phong)
  group by 1, 2 order by 1, 2;
$$;

-- Tỷ lệ đạt theo phòng của một khoa.
create or replace function public.db_theo_phong(p_tu date, p_den date, p_khoa uuid)
returns table (phong_benh_id uuid, so_phong text, so_dat bigint, so_ap_dung bigint, ty_le_dat numeric)
language sql stable as $$
  select v.phong_benh_id, pb.so_phong, sum(v.dat)::bigint, sum(v.ap_dung)::bigint, ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from v_ket_qua_tinh_ty_le v join phong_benh pb on pb.id = v.phong_benh_id
  where v.ngay_bao_cao between p_tu and p_den and v.khoa_id = p_khoa
  group by 1, 2 order by 2;
$$;

-- Theo mục (gom theo mã mục gốc), lọc khoa/phòng tùy chọn — dùng cho top không đạt.
create or replace function public.db_theo_muc(p_tu date, p_den date, p_khoa uuid default null, p_phong uuid default null)
returns table (ma_muc_goc text, stt int, noi_dung text, so_dat bigint, so_khong_dat bigint, ty_le_dat numeric)
language sql stable as $$
  with t as (
    select v.ma_muc_goc, sum(v.dat)::bigint d, (sum(v.ap_dung) - sum(v.dat))::bigint k, sum(v.ap_dung)::bigint a
    from v_ket_qua_tinh_ty_le v
    where v.ngay_bao_cao between p_tu and p_den and (p_khoa is null or v.khoa_id = p_khoa) and (p_phong is null or v.phong_benh_id = p_phong)
    group by 1
  ), moi_nhat as (
    select distinct on (ci.ma_muc_goc) ci.ma_muc_goc, ci.stt, ci.noi_dung
    from checklist_item ci join checklist_version cv on cv.id = ci.checklist_version_id
    where cv.trang_thai <> 'nhap' order by ci.ma_muc_goc, cv.ngay_hieu_luc desc
  )
  select t.ma_muc_goc, m.stt, m.noi_dung, t.d, t.k, ty_le_dat(t.d, t.a) from t join moi_nhat m using (ma_muc_goc) order by m.stt;
$$;

-- Bảng nhiệt khoa × mục.
create or replace function public.db_nhiet_khoa_muc(p_tu date, p_den date)
returns table (khoa_id uuid, ma_muc_goc text, so_ap_dung bigint, ty_le_dat numeric)
language sql stable as $$
  select v.khoa_id, v.ma_muc_goc, sum(v.ap_dung)::bigint, ty_le_dat(sum(v.dat)::bigint, sum(v.ap_dung)::bigint)
  from v_ket_qua_tinh_ty_le v where v.ngay_bao_cao between p_tu and p_den group by 1, 2;
$$;

-- Mức độ tuân thủ đi buồng: số ngày phải đi buồng (theo cài đặt, tới hôm nay) có phiên hoàn thành.
create or replace function public.db_tuan_thu(p_tu date, p_den date)
returns table (khoa_id uuid, ten_khoa text, so_ngay_phai int, so_ngay_co_phien int, ty_le numeric)
language sql stable as $$
  with cfg as (select ngay_di_buong from cau_hinh_he_thong where id = 1),
  ngay as (
    select d::date as ngay from generate_series(p_tu, least(p_den, (now() at time zone 'Asia/Ho_Chi_Minh')::date), interval '1 day') d, cfg
    where extract(isodow from d)::int = any(cfg.ngay_di_buong)
  ),
  co as (
    select p.khoa_id, count(distinct p.ngay_bao_cao) n from phien_kiem_tra p join ngay on ngay.ngay = p.ngay_bao_cao
    where p.trang_thai = 'hoan_thanh' and not p.an group by 1
  )
  select k.id, k.ten_khoa, (select count(*) from ngay)::int, coalesce(co.n, 0)::int,
         case when (select count(*) from ngay) = 0 then null else round(100.0 * coalesce(co.n, 0) / (select count(*) from ngay), 1) end
  from khoa k left join co on co.khoa_id = k.id
  where k.active and co_quyen_xem_khoa(k.id)
  order by 5 nulls last, 2;
$$;

-- Khoa chưa hoàn thành đi buồng hôm nay (kèm cờ đang làm dở).
create or replace function public.db_chua_di_buong_hom_nay()
returns table (khoa_id uuid, ten_khoa text, dang_lam_do boolean, la_ngay_phai boolean)
language sql stable as $$
  with h as (select (now() at time zone 'Asia/Ho_Chi_Minh')::date d)
  select k.id, k.ten_khoa,
         exists (select 1 from phien_kiem_tra p, h where p.khoa_id = k.id and p.ngay_bao_cao = h.d and p.trang_thai = 'draft' and not p.an),
         extract(isodow from (select d from h))::int = any((select ngay_di_buong from cau_hinh_he_thong where id = 1)::int[])
  from khoa k
  where k.active and co_quyen_xem_khoa(k.id)
    and not exists (select 1 from phien_kiem_tra p, h where p.khoa_id = k.id and p.ngay_bao_cao = h.d and p.trang_thai = 'hoan_thanh' and not p.an)
  order by k.ten_khoa;
$$;

-- Tổng hợp Phần I theo kỳ. Tỷ số người bệnh/điều dưỡng = tổng NB thực tế ÷ số ĐD/HS đang công tác trong ngày.
-- Công suất giường (chỉ khi khoa có số giường kế hoạch) = (giường KH − giường trống DV − giường trống thường) ÷ giường KH.
create or replace function public.db_phan_1(p_tu date, p_den date, p_don_vi text default 'thang', p_khoa uuid default null)
returns table (ky date, so_phien bigint, nb_tb numeric, cap_1_tb numeric, cap_2_tb numeric, cap_3_tb numeric,
               giuong_dv_trong_tb numeric, giuong_thuong_trong_tb numeric, bang_ca_tb numeric,
               dd_cong_tac_tb numeric, dd_ra_truc_tb numeric, dd_nghi_tb numeric, ty_so_nb_dd numeric, cong_suat_giuong numeric)
language sql stable as $$
  select dau_ky(p.ngay_bao_cao, p_don_vi), count(*),
    round(avg(p.tong_so_nb_thuc_te), 1), round(avg(p.so_nb_cap_1), 1), round(avg(p.so_nb_cap_2), 1), round(avg(p.so_nb_cap_3), 1),
    round(avg(p.so_giuong_dv_trong), 1), round(avg(p.so_giuong_thuong_trong), 1), round(avg(p.so_nb_nam_bang_ca), 1),
    round(avg(p.so_dd_dang_cong_tac_trong_ngay), 1), round(avg(p.so_dd_ra_truc), 1),
    round(avg(coalesce(p.so_dd_nghi_bu_nghi_phep, 0) + p.so_dd_nghi_che_do), 1),
    round(sum(p.tong_so_nb_thuc_te)::numeric / nullif(sum(p.so_dd_dang_cong_tac_trong_ngay), 0), 2),
    round(avg(100.0 * (k.so_giuong_ke_hoach - coalesce(p.so_giuong_dv_trong, 0) - coalesce(p.so_giuong_thuong_trong, 0))
              / nullif(k.so_giuong_ke_hoach, 0)), 1)
  from phien_kiem_tra p join khoa k on k.id = p.khoa_id
  where p.trang_thai = 'hoan_thanh' and not p.an and p.ngay_bao_cao between p_tu and p_den and (p_khoa is null or p.khoa_id = p_khoa)
  group by 1 order by 1;
$$;

grant execute on function public.dau_ky(date, text), public.db_xu_huong(date, date, text, uuid[], uuid), public.db_theo_phong(date, date, uuid),
  public.db_theo_muc(date, date, uuid, uuid), public.db_nhiet_khoa_muc(date, date), public.db_tuan_thu(date, date),
  public.db_chua_di_buong_hom_nay(), public.db_phan_1(date, date, text, uuid) to authenticated;
