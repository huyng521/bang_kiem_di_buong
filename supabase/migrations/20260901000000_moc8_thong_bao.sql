-- Mốc 8: thông báo trong ứng dụng. Sinh bởi tác vụ định kỳ (cron) gọi tao_thong_bao_dinh_ky().
-- Mỗi sự kiện chỉ tạo một thông báo cho một người (khóa duy nhất nguoi_dung_id + khoa_su_kien).

create table if not exists thong_bao (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references nguoi_dung(id) on delete cascade,
  loai text not null,            -- chua_di_buong / kp_sap_han / kp_qua_han / phien_nhap_24h / tong_hop_chua_di
  tieu_de text not null,
  noi_dung text,
  lien_ket text,
  da_doc boolean not null default false,
  khoa_su_kien text not null,
  created_at timestamptz not null default now(),
  unique (nguoi_dung_id, khoa_su_kien)
);
create index if not exists idx_thong_bao_chua_doc on thong_bao (nguoi_dung_id, da_doc, created_at desc);

alter table thong_bao enable row level security;
drop policy if exists tb_select on thong_bao;
create policy tb_select on thong_bao for select to authenticated using (nguoi_dung_id = current_nguoi_dung_id());
drop policy if exists tb_update on thong_bao;
create policy tb_update on thong_bao for update to authenticated
  using (nguoi_dung_id = current_nguoi_dung_id()) with check (nguoi_dung_id = current_nguoi_dung_id());
-- Không có policy insert/delete: chỉ hàm hệ thống tạo thông báo.

-- Người dùng chỉ được đổi cờ đã đọc.
create or replace function public.chi_doi_da_doc() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (to_jsonb(new) - 'da_doc') <> (to_jsonb(old) - 'da_doc') then
    raise exception 'Chỉ được đánh dấu đã đọc' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_chi_doi_da_doc on thong_bao;
create trigger trg_chi_doi_da_doc before update on thong_bao for each row execute function public.chi_doi_da_doc();

-- Sinh thông báo. p_luc cho phép kiểm thử với giờ giả định; mặc định là bây giờ.
create or replace function public.tao_thong_bao_dinh_ky(p_luc timestamptz default now())
returns int language plpgsql security definer set search_path = public as $$
declare
  v_gio_vn timestamp := p_luc at time zone 'Asia/Ho_Chi_Minh';
  v_ngay date := v_gio_vn::date;
  v_cfg cau_hinh_he_thong%rowtype;
  v_la_ngay_phai boolean;
  v_qua_gio boolean;
  v_so int := 0;
  v_n int;
  v_ds text;
begin
  if auth.uid() is not null then
    raise exception 'Chỉ tác vụ hệ thống được sinh thông báo' using errcode = '42501';
  end if;
  select * into v_cfg from cau_hinh_he_thong where id = 1;
  v_la_ngay_phai := extract(isodow from v_ngay)::int = any(v_cfg.ngay_di_buong);
  v_qua_gio := v_gio_vn::time >= v_cfg.gio_nhac_chua_di_buong;

  -- 1. Trưởng khoa: khoa chưa đi buồng hôm nay (ngày bắt buộc, sau giờ nhắc).
  if v_la_ngay_phai and v_qua_gio then
    insert into thong_bao (nguoi_dung_id, loai, tieu_de, noi_dung, lien_ket, khoa_su_kien)
    select nd.id, 'chua_di_buong', 'Khoa chưa hoàn thành đi buồng hôm nay',
           'Đã quá ' || to_char(v_cfg.gio_nhac_chua_di_buong, 'HH24:MI') || ' ngày ' || to_char(v_ngay, 'DD/MM/YYYY') || ' mà ' || k.ten_khoa || ' chưa có phiên đi buồng hoàn thành.',
           '/di-buong', 'chua_di_buong:' || v_ngay
    from nguoi_dung nd join khoa k on k.id = nd.khoa_id
    where nd.active and nd.vai_tro = 'truong_khoa' and k.active
      and not exists (select 1 from phien_kiem_tra p where p.khoa_id = k.id and p.ngay_bao_cao = v_ngay and p.trang_thai = 'hoan_thanh' and not p.an)
    on conflict (nguoi_dung_id, khoa_su_kien) do nothing;
    get diagnostics v_n = row_count; v_so := v_so + v_n;

    -- 4. Admin: tổng hợp các khoa chưa đi buồng trong ngày.
    select string_agg(k.ten_khoa, ', ' order by k.ten_khoa) into v_ds from khoa k
    where k.active and not exists (select 1 from phien_kiem_tra p where p.khoa_id = k.id and p.ngay_bao_cao = v_ngay and p.trang_thai = 'hoan_thanh' and not p.an);
    if v_ds is not null then
      insert into thong_bao (nguoi_dung_id, loai, tieu_de, noi_dung, lien_ket, khoa_su_kien)
      select nd.id, 'tong_hop_chua_di', 'Các khoa chưa đi buồng hôm nay', v_ds, '/bao-cao', 'tong_hop_chua_di:' || v_ngay
      from nguoi_dung nd where nd.active and nd.vai_tro = 'admin'
      on conflict (nguoi_dung_id, khoa_su_kien) do nothing;
      get diagnostics v_n = row_count; v_so := v_so + v_n;
    end if;
  end if;

  -- 2. Trưởng khoa: hành động khắc phục còn 1 ngày đến hạn, và quá hạn.
  insert into thong_bao (nguoi_dung_id, loai, tieu_de, noi_dung, lien_ket, khoa_su_kien)
  select nd.id,
         case when h.han_xu_ly < v_ngay then 'kp_qua_han' else 'kp_sap_han' end,
         case when h.han_xu_ly < v_ngay then 'Hành động khắc phục đã quá hạn' else 'Hành động khắc phục còn 1 ngày đến hạn' end,
         left(coalesce(h.bien_phap, h.mo_ta_van_de), 200) || ' (hạn ' || to_char(h.han_xu_ly, 'DD/MM/YYYY') || ')',
         '/khac-phuc/' || h.id,
         case when h.han_xu_ly < v_ngay then 'kp_qua_han:' else 'kp_sap_han:' end || h.id
  from hanh_dong_khac_phuc h
  join nguoi_dung nd on nd.khoa_id = h.khoa_id and nd.active and nd.vai_tro = 'truong_khoa'
  where h.trang_thai in ('moi', 'dang_xu_ly') and h.han_xu_ly is not null
    and (h.han_xu_ly = v_ngay + 1 or h.han_xu_ly < v_ngay)
  on conflict (nguoi_dung_id, khoa_su_kien) do nothing;
  get diagnostics v_n = row_count; v_so := v_so + v_n;

  -- 3. Trưởng khoa: phiên nháp quá 24 giờ chưa hoàn thành.
  insert into thong_bao (nguoi_dung_id, loai, tieu_de, noi_dung, lien_ket, khoa_su_kien)
  select nd.id, 'phien_nhap_24h', 'Phiên đi buồng chưa hoàn thành quá 24 giờ',
         'Phiên ngày ' || to_char(p.ngay_bao_cao, 'DD/MM/YYYY') || ' vẫn đang ở trạng thái nháp.',
         '/di-buong/' || p.id, 'phien_nhap_24h:' || p.id
  from phien_kiem_tra p join nguoi_dung nd on nd.khoa_id = p.khoa_id and nd.active and nd.vai_tro = 'truong_khoa'
  where p.trang_thai = 'draft' and not p.an and p.thoi_gian_bat_dau < p_luc - interval '24 hours'
  on conflict (nguoi_dung_id, khoa_su_kien) do nothing;
  get diagnostics v_n = row_count; v_so := v_so + v_n;

  return v_so;
end $$;
-- Chỉ tác vụ hệ thống (khóa quản trị, qua đường dẫn cron có mật khẩu) được gọi.
revoke execute on function public.tao_thong_bao_dinh_ky(timestamptz) from public, authenticated, anon;
