-- Mốc 5: nhật ký thao tác. Ghi tự động bằng trigger; chỉ thêm, không sửa/xóa được.

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  thoi_gian timestamptz not null default now(),
  nguoi_dung_id uuid,
  vai_tro vai_tro,
  hanh_dong text not null,       -- tao / sua / xoa / hoan_thanh / an_phien / khoa_tai_khoan / mo_khoa / doi_vai_tro / dang_nhap / xuat_file ...
  doi_tuong_loai text not null,  -- tên bảng hoặc loại file
  doi_tuong_id text,
  khoa_id uuid,
  gia_tri_cu jsonb,
  gia_tri_moi jsonb
);
create index if not exists idx_audit_thoi_gian on audit_log (thoi_gian desc);
create index if not exists idx_audit_doi_tuong on audit_log (doi_tuong_loai, doi_tuong_id);
create index if not exists idx_audit_nguoi on audit_log (nguoi_dung_id, thoi_gian desc);
create index if not exists idx_audit_khoa on audit_log (khoa_id, thoi_gian desc);

alter table audit_log enable row level security;
drop policy if exists audit_select on audit_log;
create policy audit_select on audit_log for select to authenticated using (current_vai_tro() = 'admin');
-- Không có policy insert/update/delete: người dùng không ghi trực tiếp được.

-- Chặn sửa/xóa kể cả với khóa quản trị (service role) — nhật ký bất biến.
create or replace function public.chan_sua_nhat_ky() returns trigger language plpgsql as $$
begin
  raise exception 'Nhật ký thao tác chỉ được thêm, không được sửa hoặc xóa' using errcode = '42501';
end $$;
drop trigger if exists trg_chan_sua_nhat_ky on audit_log;
create trigger trg_chan_sua_nhat_ky before update or delete on audit_log
  for each row execute function public.chan_sua_nhat_ky();
drop trigger if exists trg_chan_xoa_het_nhat_ky on audit_log;
create trigger trg_chan_xoa_het_nhat_ky before truncate on audit_log
  for each statement execute function public.chan_sua_nhat_ky();

-- Trigger ghi nhật ký dùng chung. Với UPDATE chỉ lưu các cột thay đổi.
create or replace function public.ghi_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cu jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_moi jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_dong jsonb := coalesce(v_moi, v_cu);
  v_hanh_dong text := case tg_op when 'INSERT' then 'tao' when 'UPDATE' then 'sua' else 'xoa' end;
  v_khoa uuid;
  v_id text;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, value) into v_cu from jsonb_each(to_jsonb(old)) o
      where to_jsonb(new) -> key is distinct from o.value and key not in ('updated_at');
    if v_cu is null then return null; end if; -- cập nhật không đổi gì: bỏ qua
    select jsonb_object_agg(key, to_jsonb(new) -> key) into v_moi from jsonb_object_keys(v_cu) key;
  end if;

  v_id := coalesce(v_dong ->> 'id', v_dong ->> 'auth_user_id',
                   concat_ws(':', v_dong ->> 'phien_kiem_tra_id', v_dong ->> 'checklist_item_id'),
                   concat_ws(':', v_dong ->> 'hanh_dong_id', v_dong ->> 'ket_qua_kiem_tra_id'));

  -- Xác định khoa của đối tượng.
  if tg_table_name = 'khoa' then
    v_khoa := (v_dong ->> 'id')::uuid;
  elsif v_dong ? 'khoa_id' then
    v_khoa := (v_dong ->> 'khoa_id')::uuid;
  elsif tg_table_name = 'phien_kiem_tra_phong' then
    select khoa_id into v_khoa from phien_kiem_tra where id = (v_dong ->> 'phien_kiem_tra_id')::uuid;
  elsif tg_table_name = 'ket_qua_kiem_tra' then
    select p.khoa_id into v_khoa from phien_kiem_tra_phong pp join phien_kiem_tra p on p.id = pp.phien_kiem_tra_id
      where pp.id = (v_dong ->> 'phien_kiem_tra_phong_id')::uuid;
  elsif tg_table_name = 'hanh_dong_khac_phuc_ket_qua' then
    select khoa_id into v_khoa from hanh_dong_khac_phuc where id = (v_dong ->> 'hanh_dong_id')::uuid;
  end if;

  -- Tên hành động cụ thể hơn cho các thay đổi quan trọng.
  if tg_op = 'UPDATE' then
    if tg_table_name = 'phien_kiem_tra' and v_moi ->> 'trang_thai' = 'hoan_thanh' then v_hanh_dong := 'hoan_thanh';
    elsif tg_table_name = 'phien_kiem_tra' and v_moi ? 'an' then
      v_hanh_dong := case when (v_moi ->> 'an')::boolean then 'an_phien' else 'hien_phien' end;
    elsif tg_table_name = 'nguoi_dung' and v_moi ? 'active' then
      v_hanh_dong := case when (v_moi ->> 'active')::boolean then 'mo_khoa' else 'khoa_tai_khoan' end;
    elsif tg_table_name = 'nguoi_dung' and (v_moi ? 'vai_tro' or v_moi ? 'khoa_id') then v_hanh_dong := 'doi_vai_tro';
    elsif tg_table_name = 'hanh_dong_khac_phuc' and v_moi ? 'trang_thai' then v_hanh_dong := 'doi_trang_thai';
    end if;
  end if;

  insert into audit_log (nguoi_dung_id, vai_tro, hanh_dong, doi_tuong_loai, doi_tuong_id, khoa_id, gia_tri_cu, gia_tri_moi)
  values (current_nguoi_dung_id(), current_vai_tro(), v_hanh_dong, tg_table_name, v_id, v_khoa,
          case when tg_op = 'INSERT' then null else v_cu end,
          case when tg_op = 'DELETE' then null else v_moi end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'phien_kiem_tra', 'phien_kiem_tra_phong', 'ket_qua_kiem_tra', 'hanh_dong_khac_phuc', 'hanh_dong_khac_phuc_ket_qua',
    'khac_phuc_bo_qua', 'minh_chung_anh', 'checklist_version', 'checklist_item', 'khoa', 'phong_benh', 'nguoi_dung', 'cau_hinh_he_thong'
  ] loop
    execute format('drop trigger if exists trg_audit on %I', t);
    execute format('create trigger trg_audit after insert or update or delete on %I for each row execute function public.ghi_audit()', t);
  end loop;
end $$;

-- Sự kiện không phải thay đổi dữ liệu (đăng nhập, xuất file): ứng dụng gọi hàm này.
-- Người ghi luôn là người đang đăng nhập; chỉ nhận các loại sự kiện cho phép.
create or replace function public.ghi_nhat_ky(p_hanh_dong text, p_doi_tuong_loai text, p_doi_tuong_id text default null,
                                              p_khoa_id uuid default null, p_chi_tiet jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_hanh_dong not in ('dang_nhap', 'dang_xuat', 'xuat_file', 'doi_mat_khau', 'dat_lai_mat_khau') then
    raise exception 'Loại sự kiện không hợp lệ' using errcode = '22023';
  end if;
  if current_nguoi_dung_id() is null then return; end if;
  insert into audit_log (nguoi_dung_id, vai_tro, hanh_dong, doi_tuong_loai, doi_tuong_id, khoa_id, gia_tri_moi)
  values (current_nguoi_dung_id(), current_vai_tro(), p_hanh_dong, left(p_doi_tuong_loai, 50), left(p_doi_tuong_id, 100), p_khoa_id, p_chi_tiet);
end $$;
grant execute on function public.ghi_nhat_ky(text, text, text, uuid, jsonb) to authenticated;
