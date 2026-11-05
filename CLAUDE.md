@AGENTS.md

# Bảng kiểm đi buồng — hướng dẫn cho người/agent làm tiếp

## Mục đích
Ứng dụng web nội bộ để Điều dưỡng/Hộ sinh Trưởng khoa đi buồng kiểm tra hằng ngày:
Phần I (15 trường tổng quan hành chính, nhập 1 lần/buổi) + Phần II (các mục bảng kiểm × từng phòng,
3 trạng thái `dat_co` / `khong_dat` / `khong_co_bo_chuan`, NULL = chưa chấm). Người dùng không biết code:
mọi báo cáo cho họ viết bằng tiếng Việt, không thuật ngữ khó.

## Công nghệ
Next.js 16 (App Router, `src/`, **`src/proxy.ts` thay cho middleware**), TypeScript, Tailwind 4,
Supabase (Postgres + Auth + Storage), exceljs, Vercel. Next.js 16 khác dữ liệu huấn luyện:
đọc `node_modules/next/dist/docs/` trước khi dùng API lạ.

Có thêm `artifact/bang-kiem-di-buong.html`: bản chạy ngay trên claude.ai (không Supabase) cho Giai đoạn 1.
Giai đoạn 2–3 chỉ làm trên bản Next.js + Supabase.

## Cấu trúc
- `supabase/migrations/*.sql` — **nguồn duy nhất** của cấu trúc database; chạy theo thứ tự tên file.
- `src/app/login` — đăng nhập; `src/app/(app)/…` — khu vực đã đăng nhập:
  `di-buong` (trưởng khoa), `bao-cao` (dashboard), `admin` (quản trị).
- `src/lib/auth.ts` — `requireUser` / `requireRole`; `src/lib/supabase/{client,server,admin}.ts`
  (`admin.ts` dùng service role key, **chỉ server**).
- `src/lib/phien.ts`, `src/lib/excel.ts` — nghiệp vụ phiên và xuất file.
- `tests/db/` — kiểm thử SQL/RLS trên Postgres nhúng (PGlite) chạy đúng các migration.

## Quy ước
- Tên bảng/cột/biến nghiệp vụ: tiếng Việt không dấu, snake_case trong SQL, camelCase trong TS.
- Kiểu Row trong `src/types/database.ts` phải là `type`, **không dùng `interface`**
  (interface làm supabase-js suy ra `never`).
- Không dùng select lồng quan hệ kiểu `khoa:khoa_id(...)` (kiểu viết tay không có Relationships) —
  truy vấn riêng rồi ghép trong JS.

## Chạy và kiểm thử
```bash
npm install
npm run dev        # cần .env.local (xem .env.local.example)
npm test           # kiểm thử RLS + công thức tỷ lệ đạt, không cần Supabase thật
npm run lint && npm run build
```

## Nguyên tắc bất biến
- Không phá Giai đoạn 1; dữ liệu cũ phải còn nguyên sau mỗi migration.
- **Không lưu thông tin định danh người bệnh** (tên, mã BN, ngày sinh, số hồ sơ…), kể cả trong ghi chú
  (chỉ nhắc người dùng đừng nhập).
- Chỉ đổi database bằng file mới trong `supabase/migrations` (không sửa migration đã chạy; không sửa tay
  trên giao diện Supabase). Migration phải chạy được trên dữ liệu đang có.
- Phân quyền ép ở database (RLS/trigger), giao diện chỉ là lớp phụ.
- Service role key chỉ ở server, không lộ ra trình duyệt, không commit.
- Ngày giờ hiển thị và tính toán theo **Asia/Ho_Chi_Minh** (dùng `src/lib/thoi-gian.ts`, trong SQL dùng
  `(now() at time zone 'Asia/Ho_Chi_Minh')::date`).
- **Không hard-code số mục kiểm tra** (35) ở bất kỳ đâu: luôn lấy theo phiên bản bảng kiểm của phiên.
- **Công thức tỷ lệ đạt duy nhất:** đạt / (đạt + không đạt), loại `khong_co_bo_chuan` và NULL; chỉ phiên
  `hoan_thanh` và chưa ẩn. Mọi màn hình/báo cáo lấy từ view `v_ket_qua_tinh_ty_le` + hàm `ty_le_dat()` —
  không tự tính riêng.

## Ma trận quyền (ép bằng RLS)
| Hành động | admin | truong_khoa | ban_giam_doc |
|---|---|---|---|
| Xem phiên | tất cả khoa | chỉ khoa mình | tất cả (chỉ xem) |
| Tạo/sửa phiên nháp | có | khoa mình, khi `draft` | không |
| Sửa phiên đã hoàn thành | có (ghi nhật ký) | không | không |
| Ẩn mềm phiên | có | không | không |
| Quản lý danh mục, tài khoản | có | không | không |
| Dashboard / xuất file | tất cả | khoa mình | tất cả |

## Quyết định đã chốt (mặc định, chủ dự án có thể đổi)
1. Người phụ trách khắc phục: nhập tên tự do.
2. Mục tiêu tỷ lệ đạt trên dashboard: 90% (sửa trong Cài đặt hệ thống).
3. Ngày phải đi buồng: thứ 2–thứ 6; giờ nhắc: 15:00.
4. Email nhắc nhở: không, chỉ thông báo trong ứng dụng.
5. Phòng Điều dưỡng/QLCL dùng vai trò admin.
6. Tên bệnh viện/đơn vị/logo: nhập ở trang Cài đặt hệ thống (mặc định để trống).
7. Tổng số giường theo khoa: có cột tùy chọn `khoa.so_giuong_ke_hoach`; chỉ tính công suất khi đã nhập.
8. Quy mô ước tính: 30 khoa × 10 phòng, ~80 tài khoản; Supabase Free, Vercel Hobby.
9. Tên phiên bản bảng kiểm hiện tại: "Ver 2".
