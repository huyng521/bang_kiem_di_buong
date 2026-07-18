# Bảng kiểm đi buồng

Ứng dụng web nội bộ giúp Điều dưỡng/Hộ sinh Trưởng khoa thực hiện "đi buồng"
kiểm tra hằng ngày theo bảng kiểm 35 mục, thay cho ghi tay trên giấy.

Tài liệu này viết cho người **không rành kỹ thuật** — làm theo từng bước, có
chỉ dẫn bấm nút ở đâu.

---

## 1. Tổng quan hệ thống dùng gì

- **Next.js**: phần mềm chạy cả giao diện lẫn xử lý dữ liệu (không cần server riêng).
- **Supabase**: nơi lưu trữ dữ liệu (giống một "Excel khổng lồ" có bảo mật) +
  quản lý tài khoản đăng nhập. Có giao diện web để tự xem/sửa dữ liệu.
- **Vercel**: nơi "chạy" website cho mọi người truy cập, miễn phí ở quy mô nhỏ.

Bạn cần tạo tài khoản (miễn phí) ở 2 nơi: **supabase.com** và **vercel.com**.
Có thể đăng nhập bằng tài khoản GitHub cho nhanh.

---

## 2. Bước 1 — Tạo project Supabase (nơi lưu dữ liệu)

1. Vào https://supabase.com → đăng nhập → **New project**.
2. Đặt tên project (vd. `bang-kiem-di-buong`), đặt mật khẩu database (lưu lại
   mật khẩu này ở nơi an toàn), chọn khu vực gần Việt Nam nhất (vd Singapore).
3. Đợi khoảng 1–2 phút để Supabase khởi tạo xong.
4. Vào mục **SQL Editor** (biểu tượng ở thanh bên trái) → **New query**.
5. Mở file `supabase/schema.sql` trong project này, copy **toàn bộ nội dung**,
   dán vào ô soạn thảo trên Supabase → bấm **Run**.
   - Việc này tạo toàn bộ bảng dữ liệu, phân quyền, và nạp sẵn 35 mục kiểm tra.
   - Nếu thấy dòng "Success. No rows returned" là đã chạy đúng.
6. Vào **Project Settings** (biểu tượng bánh răng) → **API**. Bạn sẽ cần 3 giá
   trị ở đây cho bước sau:
   - **Project URL**
   - **anon public key**
   - **service_role key** (bấm "Reveal" để xem) — giữ bí mật giá trị này, không
     chia sẻ cho ai, không dán lên nơi công khai.

---

## 3. Bước 2 — Tạo tài khoản quản trị (admin) đầu tiên

1. Trong Supabase, vào **Authentication** → **Users** → **Add user** → **Create new user**.
2. Nhập email và mật khẩu cho tài khoản admin đầu tiên của bạn → bấm tạo. Nhớ
   tick "Auto Confirm User" nếu có tuỳ chọn đó.
3. Copy **User UID** vừa tạo (chuỗi ký tự dài).
4. Vào **Table Editor** → chọn bảng `nguoi_dung` → **Insert row**:
   - `auth_user_id`: dán User UID vừa copy.
   - `ho_ten`: tên của bạn.
   - `vai_tro`: chọn `admin`.
   - `khoa_id`: để trống.
   - `active`: bật (true).
5. Lưu lại. Đây là tài khoản bạn sẽ dùng để đăng nhập vào ứng dụng với quyền
   quản trị viên (tạo khoa, phòng bệnh, tài khoản Trưởng khoa...).

---

## 4. Bước 3 — Chạy thử trên máy (tuỳ chọn, để kiểm tra trước khi deploy)

Nếu bạn có người hỗ trợ kỹ thuật chạy trên máy tính:

```bash
npm install
cp .env.local.example .env.local
# Mở file .env.local, dán 3 giá trị URL / anon key / service role key ở Bước 1.6
npm run dev
```

Mở trình duyệt vào `http://localhost:3000`, đăng nhập bằng tài khoản admin ở Bước 2.

---

## 5. Bước 4 — Đưa lên Vercel (để mọi người dùng qua Internet)

1. Đưa code này lên GitHub (nếu Claude Code đã làm sẵn, bỏ qua bước này).
2. Vào https://vercel.com → **Add New** → **Project** → chọn repository GitHub
   vừa tạo → **Import**.
3. Ở màn hình cấu hình, mở mục **Environment Variables**, thêm 3 biến (copy từ
   Bước 1.6):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Bấm **Deploy**. Đợi 1–2 phút.
5. Sau khi xong, Vercel cho bạn 1 đường link dạng
   `https://ten-du-an.vercel.app` — đây là địa chỉ mọi người sẽ dùng để truy
   cập ứng dụng (có thể gắn tên miền riêng của bệnh viện sau nếu cần).

Từ nay, mỗi khi code được cập nhật, Vercel sẽ tự build lại và cập nhật link
này (không cần làm lại từ đầu).

---

## 6. Bước 5 — Thiết lập dữ liệu ban đầu (sau khi đăng nhập bằng admin)

Đăng nhập vào link Vercel bằng tài khoản admin đã tạo, vào mục **Quản trị**:

1. **Danh mục Khoa** → thêm các khoa của bệnh viện (vd. Khoa Nội, Khoa Ngoại...).
2. **Danh mục Phòng bệnh** → chọn từng khoa, thêm các phòng bệnh của khoa đó.
3. **Người dùng** → tạo tài khoản cho từng Điều dưỡng/Hộ sinh Trưởng khoa (chọn
   vai trò "Điều dưỡng/Hộ sinh Trưởng khoa" và gán đúng khoa phụ trách), và tài
   khoản cho Ban Giám đốc (vai trò "Ban Giám đốc" — chỉ xem báo cáo).
4. **Mục bảng kiểm (35 mục)** → nội dung 35 mục đã được nạp sẵn đúng văn bản
   gốc; chỉ cần sửa nếu sau này có thay đổi từ quy định của bệnh viện.

Sau đó, Trưởng khoa đăng nhập bằng tài khoản được cấp, bấm **"Bắt đầu đi
buồng"** để bắt đầu sử dụng.

---

## 7. Cấu trúc chức năng (Giai đoạn 1 — đã hoàn thành)

- Đăng nhập + phân quyền 3 vai trò: `admin`, `truong_khoa`, `ban_giam_doc`.
- Trưởng khoa: bắt đầu đi buồng → nhập Phần I (tổng quan hành chính, 15
  trường) → nhập Phần II (35 mục kiểm tra cho từng phòng, tự động lưu nháp) →
  ghi ý kiến người bệnh/biện pháp khắc phục → hoàn thành (khóa phiên).
- Xem lại lịch sử các phiên đã kiểm tra, lọc theo ngày.
- Xuất Excel cho từng phiên (đầy đủ Phần I + ma trận 35 mục theo từng phòng).
- Dashboard tỷ lệ đạt theo khoa cho Ban Giám đốc/Admin (loại trừ mục "Không
  có/Bỏ chuẩn" khỏi mẫu số).
- Quản trị: CRUD khoa, phòng bệnh, người dùng, nội dung 35 mục kiểm tra.

### Chưa làm ở Giai đoạn 1 (theo đúng phạm vi đã thống nhất)

Ảnh minh chứng đính kèm, theo dõi khắc phục dạng workflow, chế độ
offline/PWA, versioning checklist phức tạp, nhắc nhở/thông báo tự động, xuất
PDF. Các mục này để dành cho Giai đoạn 2–3.

---

## 8. Một số lưu ý kỹ thuật (cho người kế thừa code sau này)

- `supabase/schema.sql`: nguồn sự thật cho toàn bộ cấu trúc database, RLS
  (row level security theo vai trò), và hàm báo cáo `bao_cao_ty_le_dat`. Chạy
  lại an toàn (idempotent) trên project mới.
- Next.js 16 đổi `middleware.ts` thành `src/proxy.ts` (export hàm `proxy`) —
  dùng để làm mới session Supabase và chặn truy cập khi chưa đăng nhập; việc
  kiểm tra vai trò chi tiết được làm lại ở `src/lib/auth.ts` trong từng trang.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng trong `src/lib/supabase/admin.ts`
  (server-only), phục vụ việc admin tạo tài khoản đăng nhập mới. Không bao
  giờ đưa biến này vào code chạy ở trình duyệt.
