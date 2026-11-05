-- =============================================================================
-- BẢNG KIỂM ĐI BUỒNG - SCHEMA CHO SUPABASE (Postgres)
-- Dán toàn bộ file này vào Supabase Dashboard -> SQL Editor -> Run
-- An toàn để chạy lại (dùng IF NOT EXISTS / OR REPLACE ở những chỗ hợp lý),
-- nhưng khuyến nghị chỉ chạy 1 lần trên project mới.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------
do $$ begin
  create type vai_tro as enum ('admin', 'truong_khoa', 'ban_giam_doc');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trang_thai_phien as enum ('draft', 'hoan_thanh');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trang_thai_kq as enum ('dat_co', 'khong_dat', 'khong_co_bo_chuan');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. BẢNG DANH MỤC
-- ---------------------------------------------------------------------------

-- Danh mục khoa
create table if not exists khoa (
  id uuid primary key default gen_random_uuid(),
  ten_khoa text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Danh sách phòng bệnh theo khoa (master data, admin cấu hình)
create table if not exists phong_benh (
  id uuid primary key default gen_random_uuid(),
  khoa_id uuid not null references khoa(id) on delete restrict,
  so_phong text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_phong_benh_khoa on phong_benh(khoa_id);

-- Người dùng (liên kết với Supabase Auth)
create table if not exists nguoi_dung (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  ho_ten text not null,
  vai_tro vai_tro not null,
  khoa_id uuid references khoa(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint nguoi_dung_khoa_check check (
    (vai_tro = 'truong_khoa' and khoa_id is not null)
    or (vai_tro in ('admin', 'ban_giam_doc'))
  )
);
create index if not exists idx_nguoi_dung_khoa on nguoi_dung(khoa_id);

-- Phiên bản bảng kiểm
create table if not exists checklist_version (
  id uuid primary key default gen_random_uuid(),
  ten_phien_ban text not null,
  ngay_hieu_luc date not null,
  ghi_chu_van_ban_can_cu text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Từng mục trong bảng kiểm, thuộc 1 phiên bản
create table if not exists checklist_item (
  id uuid primary key default gen_random_uuid(),
  checklist_version_id uuid not null references checklist_version(id) on delete cascade,
  stt int not null,
  noi_dung text not null,
  ghi_chu_huong_dan text,
  active boolean not null default true,
  unique (checklist_version_id, stt)
);

-- ---------------------------------------------------------------------------
-- 3. BẢNG NGHIỆP VỤ (phiên đi buồng)
-- ---------------------------------------------------------------------------

-- Một buổi đi buồng kiểm tra (1 lần/ngày/khoa)
create table if not exists phien_kiem_tra (
  id uuid primary key default gen_random_uuid(),
  khoa_id uuid not null references khoa(id) on delete restrict,
  nguoi_kiem_tra_id uuid not null references nguoi_dung(id) on delete restrict,
  checklist_version_id uuid not null references checklist_version(id) on delete restrict,
  thoi_gian_bat_dau timestamptz not null default now(),
  thoi_gian_hoan_thanh timestamptz,
  trang_thai trang_thai_phien not null default 'draft',
  -- Soft delete: chỉ admin được đánh dấu ẩn, KHÔNG bao giờ hard delete phiên đã hoàn thành.
  an boolean not null default false,

  -- PHẦN I: Tổng quan hành chính
  ngay_bao_cao date not null default current_date,
  dd_uy_quyen_khi_vang_mat text,
  tong_so_nb_thuc_te int,
  so_nb_cap_1 int,
  so_nb_cap_2 int,
  so_nb_cap_3 int,
  so_giuong_dv_trong int,
  so_giuong_thuong_trong int,
  so_nb_nam_bang_ca int not null default 0,
  tong_so_dd_co_huu int,
  so_dd_dang_cong_tac_trong_ngay int,
  so_dd_ra_truc int,
  so_dd_nghi_bu_nghi_phep int,
  so_dd_nghi_che_do int not null default 0,

  -- Ghi chú chung cuối buổi
  y_kien_van_de_nguoi_benh text,
  bien_phap_khac_phuc text,

  created_at timestamptz not null default now(),

  constraint phien_kt_so_khong_am check (
    coalesce(tong_so_nb_thuc_te, 0) >= 0 and
    coalesce(so_nb_cap_1, 0) >= 0 and
    coalesce(so_nb_cap_2, 0) >= 0 and
    coalesce(so_nb_cap_3, 0) >= 0 and
    coalesce(so_giuong_dv_trong, 0) >= 0 and
    coalesce(so_giuong_thuong_trong, 0) >= 0 and
    so_nb_nam_bang_ca >= 0 and
    coalesce(tong_so_dd_co_huu, 0) >= 0 and
    coalesce(so_dd_dang_cong_tac_trong_ngay, 0) >= 0 and
    coalesce(so_dd_ra_truc, 0) >= 0 and
    coalesce(so_dd_nghi_bu_nghi_phep, 0) >= 0 and
    so_dd_nghi_che_do >= 0
  )
);
create index if not exists idx_phien_kt_khoa on phien_kiem_tra(khoa_id);
create index if not exists idx_phien_kt_ngay on phien_kiem_tra(ngay_bao_cao);

-- Từng phòng được kiểm tra trong 1 phiên
create table if not exists phien_kiem_tra_phong (
  id uuid primary key default gen_random_uuid(),
  phien_kiem_tra_id uuid not null references phien_kiem_tra(id) on delete cascade,
  phong_benh_id uuid not null references phong_benh(id) on delete restrict,
  ten_dd_phu_trach text,
  tong_so_nguoi_benh int,
  created_at timestamptz not null default now(),
  unique (phien_kiem_tra_id, phong_benh_id)
);
create index if not exists idx_pktp_phien on phien_kiem_tra_phong(phien_kiem_tra_id);

-- Kết quả từng mục x từng phòng trong phiên kiểm tra
create table if not exists ket_qua_kiem_tra (
  id uuid primary key default gen_random_uuid(),
  phien_kiem_tra_phong_id uuid not null references phien_kiem_tra_phong(id) on delete cascade,
  checklist_item_id uuid not null references checklist_item(id) on delete restrict,
  -- mặc định NULL = chưa chấm, KHÔNG tự set "Đạt"
  trang_thai trang_thai_kq,
  ghi_chu text,
  unique (phien_kiem_tra_phong_id, checklist_item_id)
);
create index if not exists idx_kqkt_phong on ket_qua_kiem_tra(phien_kiem_tra_phong_id);

-- ---------------------------------------------------------------------------
-- 4. HELPER FUNCTIONS (dùng cho RLS) - SECURITY DEFINER để tránh đệ quy RLS
-- ---------------------------------------------------------------------------
create or replace function public.current_vai_tro()
returns vai_tro
language sql
stable
security definer
set search_path = public
as $$
  select vai_tro from nguoi_dung where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_khoa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select khoa_id from nguoi_dung where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_nguoi_dung_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from nguoi_dung where auth_user_id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table khoa enable row level security;
alter table phong_benh enable row level security;
alter table nguoi_dung enable row level security;
alter table checklist_version enable row level security;
alter table checklist_item enable row level security;
alter table phien_kiem_tra enable row level security;
alter table phien_kiem_tra_phong enable row level security;
alter table ket_qua_kiem_tra enable row level security;

-- khoa: ai đăng nhập cũng xem được (cần cho dropdown, báo cáo); chỉ admin sửa
drop policy if exists khoa_select on khoa;
create policy khoa_select on khoa for select to authenticated using (true);
drop policy if exists khoa_admin_write on khoa;
create policy khoa_admin_write on khoa for all to authenticated
  using (current_vai_tro() = 'admin') with check (current_vai_tro() = 'admin');

-- phong_benh: ai đăng nhập cũng xem được; chỉ admin sửa
drop policy if exists phong_benh_select on phong_benh;
create policy phong_benh_select on phong_benh for select to authenticated using (true);
drop policy if exists phong_benh_admin_write on phong_benh;
create policy phong_benh_admin_write on phong_benh for all to authenticated
  using (current_vai_tro() = 'admin') with check (current_vai_tro() = 'admin');

-- nguoi_dung: ai đăng nhập cũng xem được tên (để hiển thị "người kiểm tra"); chỉ admin sửa
drop policy if exists nguoi_dung_select on nguoi_dung;
create policy nguoi_dung_select on nguoi_dung for select to authenticated using (true);
drop policy if exists nguoi_dung_admin_write on nguoi_dung;
create policy nguoi_dung_admin_write on nguoi_dung for all to authenticated
  using (current_vai_tro() = 'admin') with check (current_vai_tro() = 'admin');

-- checklist_version / checklist_item: ai đăng nhập cũng xem được; chỉ admin sửa
drop policy if exists checklist_version_select on checklist_version;
create policy checklist_version_select on checklist_version for select to authenticated using (true);
drop policy if exists checklist_version_admin_write on checklist_version;
create policy checklist_version_admin_write on checklist_version for all to authenticated
  using (current_vai_tro() = 'admin') with check (current_vai_tro() = 'admin');

drop policy if exists checklist_item_select on checklist_item;
create policy checklist_item_select on checklist_item for select to authenticated using (true);
drop policy if exists checklist_item_admin_write on checklist_item;
create policy checklist_item_admin_write on checklist_item for all to authenticated
  using (current_vai_tro() = 'admin') with check (current_vai_tro() = 'admin');

-- phien_kiem_tra:
--   xem: admin/ban_giam_doc xem tất cả; truong_khoa chỉ xem khoa mình
--   thêm: truong_khoa chỉ thêm cho khoa mình, tự gán mình là người kiểm tra; admin thêm tự do
--   sửa: truong_khoa chỉ sửa phiên khoa mình khi còn draft; admin sửa mọi lúc (kể cả đánh dấu ẩn)
--   xóa: không ai được xóa cứng (không có policy delete)
drop policy if exists phien_kt_select on phien_kiem_tra;
create policy phien_kt_select on phien_kiem_tra for select to authenticated using (
  current_vai_tro() in ('admin', 'ban_giam_doc')
  or (current_vai_tro() = 'truong_khoa' and khoa_id = current_khoa_id())
);

drop policy if exists phien_kt_insert on phien_kiem_tra;
create policy phien_kt_insert on phien_kiem_tra for insert to authenticated with check (
  current_vai_tro() = 'admin'
  or (
    current_vai_tro() = 'truong_khoa'
    and khoa_id = current_khoa_id()
    and nguoi_kiem_tra_id = current_nguoi_dung_id()
  )
);

drop policy if exists phien_kt_update on phien_kiem_tra;
create policy phien_kt_update on phien_kiem_tra for update to authenticated using (
  current_vai_tro() = 'admin'
  or (current_vai_tro() = 'truong_khoa' and khoa_id = current_khoa_id() and trang_thai = 'draft')
) with check (
  current_vai_tro() = 'admin'
  or (current_vai_tro() = 'truong_khoa' and khoa_id = current_khoa_id())
);

-- phien_kiem_tra_phong: quyền theo phiên cha
drop policy if exists pktp_select on phien_kiem_tra_phong;
create policy pktp_select on phien_kiem_tra_phong for select to authenticated using (
  exists (
    select 1 from phien_kiem_tra p where p.id = phien_kiem_tra_id
    and (
      current_vai_tro() in ('admin', 'ban_giam_doc')
      or (current_vai_tro() = 'truong_khoa' and p.khoa_id = current_khoa_id())
    )
  )
);

drop policy if exists pktp_write on phien_kiem_tra_phong;
create policy pktp_write on phien_kiem_tra_phong for all to authenticated using (
  exists (
    select 1 from phien_kiem_tra p where p.id = phien_kiem_tra_id
    and (
      current_vai_tro() = 'admin'
      or (current_vai_tro() = 'truong_khoa' and p.khoa_id = current_khoa_id() and p.trang_thai = 'draft')
    )
  )
) with check (
  exists (
    select 1 from phien_kiem_tra p where p.id = phien_kiem_tra_id
    and (
      current_vai_tro() = 'admin'
      or (current_vai_tro() = 'truong_khoa' and p.khoa_id = current_khoa_id() and p.trang_thai = 'draft')
    )
  )
);

-- ket_qua_kiem_tra: quyền theo phiên ông bà (qua phien_kiem_tra_phong)
drop policy if exists kqkt_select on ket_qua_kiem_tra;
create policy kqkt_select on ket_qua_kiem_tra for select to authenticated using (
  exists (
    select 1 from phien_kiem_tra_phong pp join phien_kiem_tra p on p.id = pp.phien_kiem_tra_id
    where pp.id = phien_kiem_tra_phong_id
    and (
      current_vai_tro() in ('admin', 'ban_giam_doc')
      or (current_vai_tro() = 'truong_khoa' and p.khoa_id = current_khoa_id())
    )
  )
);

drop policy if exists kqkt_write on ket_qua_kiem_tra;
create policy kqkt_write on ket_qua_kiem_tra for all to authenticated using (
  exists (
    select 1 from phien_kiem_tra_phong pp join phien_kiem_tra p on p.id = pp.phien_kiem_tra_id
    where pp.id = phien_kiem_tra_phong_id
    and (
      current_vai_tro() = 'admin'
      or (current_vai_tro() = 'truong_khoa' and p.khoa_id = current_khoa_id() and p.trang_thai = 'draft')
    )
  )
) with check (
  exists (
    select 1 from phien_kiem_tra_phong pp join phien_kiem_tra p on p.id = pp.phien_kiem_tra_id
    where pp.id = phien_kiem_tra_phong_id
    and (
      current_vai_tro() = 'admin'
      or (current_vai_tro() = 'truong_khoa' and p.khoa_id = current_khoa_id() and p.trang_thai = 'draft')
    )
  )
);

-- ---------------------------------------------------------------------------
-- 6. HÀM BÁO CÁO: tỷ lệ đạt theo khoa trong khoảng ngày (dùng cho dashboard)
--    Loại trừ khong_co_bo_chuan khỏi mẫu số. Chỉ tính phiên đã hoàn thành, chưa ẩn.
--    Hàm SQL thường (không security definer) nên vẫn tôn trọng RLS của người gọi:
--    ban_giam_doc/admin thấy tất cả khoa, truong_khoa chỉ thấy khoa mình.
-- ---------------------------------------------------------------------------
create or replace function public.bao_cao_ty_le_dat(p_tu_ngay date, p_den_ngay date)
returns table (
  khoa_id uuid,
  ten_khoa text,
  so_phien bigint,
  tong_muc_ap_dung bigint,
  so_dat bigint,
  ty_le_dat numeric
)
language sql
stable
as $$
  select
    k.id as khoa_id,
    k.ten_khoa,
    count(distinct p.id) as so_phien,
    count(kq.id) filter (where kq.trang_thai in ('dat_co', 'khong_dat')) as tong_muc_ap_dung,
    count(kq.id) filter (where kq.trang_thai = 'dat_co') as so_dat,
    case
      when count(kq.id) filter (where kq.trang_thai in ('dat_co', 'khong_dat')) = 0 then null
      else round(
        100.0 * count(kq.id) filter (where kq.trang_thai = 'dat_co')
        / count(kq.id) filter (where kq.trang_thai in ('dat_co', 'khong_dat')),
        1
      )
    end as ty_le_dat
  from khoa k
  join phien_kiem_tra p
    on p.khoa_id = k.id
    and p.trang_thai = 'hoan_thanh'
    and p.an = false
    and p.ngay_bao_cao between p_tu_ngay and p_den_ngay
  join phien_kiem_tra_phong pp on pp.phien_kiem_tra_id = p.id
  join ket_qua_kiem_tra kq on kq.phien_kiem_tra_phong_id = pp.id
  group by k.id, k.ten_khoa
  order by k.ten_khoa;
$$;

grant execute on function public.bao_cao_ty_le_dat(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. SEED: Phiên bản bảng kiểm mặc định + 35 mục (nguyên văn)
-- ---------------------------------------------------------------------------
do $$
declare
  v_id uuid;
begin
  if not exists (select 1 from checklist_version) then
    insert into checklist_version (ten_phien_ban, ngay_hieu_luc, ghi_chu_van_ban_can_cu, active)
    values ('Phiên bản 1', current_date, 'Theo Thông tư 31/2021/TT-BYT và Bộ tiêu chí chất lượng bệnh viện', true)
    returning id into v_id;

    insert into checklist_item (checklist_version_id, stt, noi_dung, ghi_chu_huong_dan, active) values
    (v_id, 1, 'Tư vấn cho người bệnh khi vào viện.', null, true),
    (v_id, 2, 'Hướng dẫn người bệnh chế độ ăn.', 'Người bệnh ăn qua ống thông → ĐD trực tiếp thực hiện', true),
    (v_id, 3, 'Hướng dẫn người bệnh thực hiện vệ sinh tay.', null, true),
    (v_id, 4, 'Hướng dẫn phòng ngừa người bệnh té ngã.', null, true),
    (v_id, 5, 'Hướng dẫn thân nhân cách chăm sóc người bệnh', 'Chăm sóc cấp I: ĐD thực hiện; Chăm sóc cấp II, III: ĐD hướng dẫn cách chăm sóc', true),
    (v_id, 6, 'Hướng dẫn phòng ngừa người bệnh loét tỳ đè.', null, true),
    (v_id, 7, 'Hướng dẫn người bệnh dùng thuốc.', null, true),
    (v_id, 8, 'Hướng dẫn người bệnh trước xuất viện.', null, true),
    (v_id, 9, 'Mỗi người bệnh chỉ được đăng ký một người nuôi bệnh; người nuôi bệnh có trách nhiệm đeo thẻ nuôi bệnh và thực hiện các quy định của bệnh viện.', null, true),
    (v_id, 10, 'Không có thân nhân trong phòng bệnh trong giờ làm việc theo quy định', 'trừ những trường hợp bệnh nặng cho phép', true),
    (v_id, 11, 'Thân nhân được ở lại nuôi bệnh tại các phòng bệnh nặng phải được khoác áo choàng theo quy định.', null, true),
    (v_id, 12, 'Giường bệnh chắc chắn, sạch sẽ; drap không nhăn nhúm, không sờn rách.', null, true),
    (v_id, 13, 'Nệm có bị rách, xẹp, vạt giường lún, gãy?', null, true),
    (v_id, 14, 'Gầm giường sạch thoáng không để nhiều vật dụng cá nhân.', null, true),
    (v_id, 15, 'Bánh xe giường cố định được, tay quay/thanh chắn giường hoạt động tốt.', null, true),
    (v_id, 16, 'Phòng bệnh ngăn nắp, sạch sẽ; không phơi phóng trong phòng bệnh.', null, true),
    (v_id, 17, 'Tủ đầu giường lau chùi sạch sẽ, gọn gàng; không lót giấy báo tủ đầu giường.', null, true),
    (v_id, 18, 'Máy lạnh không chảy nước.', null, true),
    (v_id, 19, 'Tường, cửa không bám bụi.', null, true),
    (v_id, 20, 'Khu vực hành lang sạch sẽ, gọn gàng.', null, true),
    (v_id, 21, 'Có bảng cảnh báo đối với khu vực đang làm vệ sinh, ướt, trơn trợt.', null, true),
    (v_id, 22, 'Nhà vệ sinh sạch sẽ, không mùi hôi.', null, true),
    (v_id, 23, 'Sàn nhà vệ sinh khô ráo, không trơn trợt, không có nước đọng.', null, true),
    (v_id, 24, 'Hệ thống nước có đủ để sinh hoạt, hệ thống đèn chiếu sáng hoạt động tốt.', null, true),
    (v_id, 25, 'Van khóa nước không rỉ nước.', null, true),
    (v_id, 26, 'Bồn cầu không hư, không tắt ngẹt, không ngẹt nước.', null, true),
    (v_id, 27, 'Thùng rác có nắp đậy kín, rác không đầy tràn.', null, true),
    (v_id, 28, 'Băng ca có song chắn; bánh xe hoạt động tốt.', null, true),
    (v_id, 29, 'Xe ngồi có đầy đủ dây ràng, bàn đạp chân.', null, true),
    (v_id, 30, 'Hệ thống trụ treo dịch truyền chắc chắn, an toàn.', null, true),
    (v_id, 31, 'Các ổ điện chắc chắn - an toàn chống cháy nổ.', null, true),
    (v_id, 32, 'Thiết bị y tế được lau chùi vệ sinh sạch sẽ.', null, true),
    (v_id, 33, 'Bình hút đàm khi không sử dụng: không đổ Dakin vào bình hút đàm; Luôn đậy kín nắp bình, có nút che (đậy) kín đầu ống hút.', null, true),
    (v_id, 34, 'Bình làm ẩm oxy phải châm nước cất vô khuẩn khi có người bệnh thở oxy.', null, true),
    (v_id, 35, 'Phải khóa van oxy khi không sử dụng.', null, true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Hết. Sau khi chạy file này, vào Authentication -> Users tạo tài khoản đăng
-- nhập đầu tiên, rồi vào Table Editor -> nguoi_dung thêm 1 dòng với
-- auth_user_id = id vừa tạo, vai_tro = 'admin' để có tài khoản quản trị đầu tiên.
-- ---------------------------------------------------------------------------
