-- Mốc 9: đồng bộ dữ liệu nhập khi mất mạng. Quy tắc: thay đổi mới nhất theo TỪNG Ô thắng,
-- dựa trên thời điểm sửa trên thiết bị; nếu trên máy chủ đã có bản mới hơn thì giữ bản đó và báo xung đột.

alter table ket_qua_kiem_tra add column if not exists cap_nhat_luc timestamptz;
alter table phien_kiem_tra_phong add column if not exists cap_nhat_luc timestamptz;
alter table phien_kiem_tra add column if not exists cap_nhat_luc timestamptz;

-- Tự đóng dấu thời điểm khi sửa trực tuyến (nếu ứng dụng không truyền).
create or replace function public.dong_dau_cap_nhat() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.cap_nhat_luc is not distinct from old.cap_nhat_luc then
    new.cap_nhat_luc := coalesce(case when tg_op = 'INSERT' then new.cap_nhat_luc end, now());
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['ket_qua_kiem_tra', 'phien_kiem_tra_phong', 'phien_kiem_tra'] loop
    execute format('drop trigger if exists trg_dong_dau_cap_nhat on %I', t);
    execute format('create trigger trg_dong_dau_cap_nhat before insert or update on %I for each row execute function public.dong_dau_cap_nhat()', t);
  end loop;
end $$;

-- Ghi 1 ô kết quả từ thiết bị. Trả về 'ap_dung' hoặc 'xung_dot' (máy chủ có bản mới hơn) kèm giá trị máy chủ.
-- Chạy với quyền người gọi (RLS áp dụng): khoa khác/phiên đã khóa/tài khoản bị khóa đều bị chặn.
create or replace function public.dong_bo_ket_qua(p_pktp uuid, p_item uuid, p_trang_thai trang_thai_kq, p_ghi_chu text, p_luc timestamptz)
returns table (ket_qua text, trang_thai_may_chu trang_thai_kq, ghi_chu_may_chu text, luc_may_chu timestamptz)
language plpgsql as $$
declare v ket_qua_kiem_tra%rowtype;
begin
  select * into v from ket_qua_kiem_tra where phien_kiem_tra_phong_id = p_pktp and checklist_item_id = p_item;
  if found and v.cap_nhat_luc is not null and v.cap_nhat_luc > p_luc then
    return query select 'xung_dot'::text, v.trang_thai, v.ghi_chu, v.cap_nhat_luc;
    return;
  end if;
  if found then
    update ket_qua_kiem_tra set trang_thai = p_trang_thai, ghi_chu = p_ghi_chu, cap_nhat_luc = p_luc where id = v.id;
    if not found then raise exception 'Không có quyền ghi ô này' using errcode = '42501'; end if;
  else
    insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai, ghi_chu, cap_nhat_luc)
    values (p_pktp, p_item, p_trang_thai, p_ghi_chu, p_luc);
  end if;
  return query select 'ap_dung'::text, p_trang_thai, p_ghi_chu, p_luc;
end $$;

create or replace function public.dong_bo_phong(p_pktp uuid, p_ten_dd text, p_tong_nb int, p_luc timestamptz)
returns text language plpgsql as $$
declare v_luc timestamptz;
begin
  select cap_nhat_luc into v_luc from phien_kiem_tra_phong where id = p_pktp;
  if v_luc is not null and v_luc > p_luc then return 'xung_dot'; end if;
  update phien_kiem_tra_phong set ten_dd_phu_trach = p_ten_dd, tong_so_nguoi_benh = p_tong_nb, cap_nhat_luc = p_luc where id = p_pktp;
  if not found then raise exception 'Không có quyền ghi phòng này' using errcode = '42501'; end if;
  return 'ap_dung';
end $$;
grant execute on function public.dong_bo_ket_qua(uuid, uuid, trang_thai_kq, text, timestamptz), public.dong_bo_phong(uuid, text, int, timestamptz) to authenticated;

-- Nhật ký: bỏ qua cột kỹ thuật cap_nhat_luc khi so sánh thay đổi (định nghĩa lại hàm của Mốc 5).
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
      where to_jsonb(new) -> key is distinct from o.value and key not in ('updated_at', 'cap_nhat_luc');
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
