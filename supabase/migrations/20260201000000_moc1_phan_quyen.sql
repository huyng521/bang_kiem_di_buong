-- Mốc 1: phân quyền chi tiết + quản lý tài khoản.
-- Chạy được trên dữ liệu Giai đoạn 1: chỉ thêm cột (có mặc định) và thay hàm/policy/trigger.

-- 1. Tài khoản: email (để admin tra cứu), cờ bắt đổi mật khẩu lần đầu.
alter table nguoi_dung add column if not exists email text;
alter table nguoi_dung add column if not exists phai_doi_mat_khau boolean not null default false;

-- 2. Tài khoản bị khóa (active = false) mất mọi quyền ngay lập tức, kể cả khi còn phiên đăng nhập:
--    các hàm vai trò chỉ trả về giá trị cho tài khoản đang hoạt động.
create or replace function public.current_vai_tro()
returns vai_tro language sql stable security definer set search_path = public as $$
  select vai_tro from nguoi_dung where auth_user_id = auth.uid() and active limit 1;
$$;
create or replace function public.current_khoa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select khoa_id from nguoi_dung where auth_user_id = auth.uid() and active limit 1;
$$;
create or replace function public.current_nguoi_dung_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from nguoi_dung where auth_user_id = auth.uid() and active limit 1;
$$;

-- Danh mục người dùng: chỉ người đang hoạt động mới đọc được.
drop policy if exists nguoi_dung_select on nguoi_dung;
create policy nguoi_dung_select on nguoi_dung for select to authenticated
  using (current_vai_tro() is not null);
drop policy if exists khoa_select on khoa;
create policy khoa_select on khoa for select to authenticated using (current_vai_tro() is not null);
drop policy if exists phong_benh_select on phong_benh;
create policy phong_benh_select on phong_benh for select to authenticated using (current_vai_tro() is not null);
drop policy if exists checklist_version_select on checklist_version;
create policy checklist_version_select on checklist_version for select to authenticated using (current_vai_tro() is not null);
drop policy if exists checklist_item_select on checklist_item;
create policy checklist_item_select on checklist_item for select to authenticated using (current_vai_tro() is not null);

-- 3. Trưởng khoa không được đổi các trường "hệ thống" của phiên: ẩn mềm, người kiểm tra, khoa,
--    phiên bản bảng kiểm, thời gian bắt đầu; không được mở lại phiên đã hoàn thành.
--    Admin và tác vụ phía server (không có auth.uid) không bị chặn.
create or replace function public.chan_sua_truong_he_thong_phien()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or current_vai_tro() = 'admin' then
    return new;
  end if;
  if new.an is distinct from old.an then
    raise exception 'Chỉ quản trị viên được ẩn/hiện phiên kiểm tra' using errcode = '42501';
  end if;
  if new.nguoi_kiem_tra_id is distinct from old.nguoi_kiem_tra_id
     or new.khoa_id is distinct from old.khoa_id
     or new.checklist_version_id is distinct from old.checklist_version_id
     or new.thoi_gian_bat_dau is distinct from old.thoi_gian_bat_dau then
    raise exception 'Không được thay đổi thông tin hệ thống của phiên kiểm tra' using errcode = '42501';
  end if;
  if old.trang_thai = 'hoan_thanh' and new.trang_thai <> 'hoan_thanh' then
    raise exception 'Không được mở lại phiên đã hoàn thành' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_chan_sua_truong_he_thong_phien on phien_kiem_tra;
create trigger trg_chan_sua_truong_he_thong_phien
  before update on phien_kiem_tra
  for each row execute function public.chan_sua_truong_he_thong_phien();

-- Khi tạo phiên, trưởng khoa không được tạo sẵn ở trạng thái ẩn/hoàn thành.
create or replace function public.chan_tao_phien_sai()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or current_vai_tro() = 'admin' then
    return new;
  end if;
  if new.an or new.trang_thai <> 'draft' then
    raise exception 'Phiên mới phải ở trạng thái nháp' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_chan_tao_phien_sai on phien_kiem_tra;
create trigger trg_chan_tao_phien_sai before insert on phien_kiem_tra
  for each row execute function public.chan_tao_phien_sai();

-- 4. Ngày báo cáo mặc định theo giờ Việt Nam (trước đây theo UTC, lệch ngày trước 7h sáng).
alter table phien_kiem_tra alter column ngay_bao_cao set default ((now() at time zone 'Asia/Ho_Chi_Minh')::date);
