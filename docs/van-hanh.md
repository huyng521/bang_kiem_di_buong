# Hướng dẫn vận hành (cho người quản lý hệ thống)

## 1. Những thứ cần cất giữ an toàn
| Thứ | Ở đâu | Ai giữ |
|---|---|---|
| Mật khẩu tài khoản Supabase, Vercel, GitHub | Trình quản lý mật khẩu của Phòng Điều dưỡng | 2 người (chính + dự phòng) |
| Mật khẩu database Supabase (đặt lúc tạo project) | như trên | như trên |
| `SUPABASE_SERVICE_ROLE_KEY` | Chỉ trong Vercel → Environment Variables. Không gửi qua chat/email, không lưu file | — |
| `CRON_SECRET` | Chỉ trong Vercel | — |
| File sao lưu | Ổ lưu trữ của bệnh viện, không để trên máy cá nhân | — |
Nếu nghi lộ service role key: Supabase → Project Settings → API → tạo key mới, cập nhật Vercel, Redeploy.

## 2. Sao lưu
**Kiểm tra theo trang giá Supabase (tháng 11/2026):** gói **Free không có sao lưu tự động** và project bị **tạm dừng
sau 1 tuần không dùng**; gói **Pro có sao lưu hằng ngày (giữ 7 ngày)** và không bị tạm dừng. Kiểm tra lại tại
supabase.com/pricing vì chính sách có thể đổi.

Lịch đề xuất:
- **Gói Free:** sao lưu tay **mỗi tuần** (và trước mỗi lần cập nhật database):
  ```bash
  npx supabase login
  npx supabase link --project-ref <ma-project>
  npx supabase db dump -f backup/cau-truc-$(date +%Y%m%d).sql
  npx supabase db dump --data-only -f backup/du-lieu-$(date +%Y%m%d).sql
  ```
- **Gói Pro:** dựa vào sao lưu hằng ngày của Supabase + **mỗi tháng** chạy lệnh trên để có bản giữ lâu dài.
- Bản dễ xem (không thay thế bản trên): Quản trị → **Xuất toàn bộ dữ liệu** (CSV từng bảng).
- Ảnh: Supabase Storage không nằm trong lệnh `db dump`. Nếu cần, tải bucket `minh-chung` bằng trang Storage.

## 3. Thử khôi phục (làm ít nhất 1 lần để chắc sao lưu dùng được)
1. Tạo project Supabase **thử nghiệm** (không dùng project thật).
2. SQL Editor của project thử: chạy file `backup/cau-truc-….sql`, rồi `backup/du-lieu-….sql`
   (hoặc `psql "<chuỗi kết nối project thử>" -f backup/...sql`).
3. Trỏ một bản Vercel Preview (hoặc `npm run dev` với `.env.local` của project thử) vào project thử, đăng nhập,
   mở vài phiên cũ, xuất PDF/Excel, so với hệ thống thật.
4. Ghi lại ngày thử và kết quả. Xóa project thử sau khi xong.

## 4. Cập nhật phiên bản mới của ứng dụng
1. Sao lưu (mục 2).
2. Có file mới trong `supabase/migrations`? Chạy lên project **thử nghiệm** trước (`npx supabase db push`), thử
   trên link Preview của Vercel; ổn mới chạy lên project thật.
3. Gộp (merge) nhánh code trên GitHub → Vercel tự deploy.
4. Chạy `npm test` trước khi gộp (kiểm thử phân quyền, tỷ lệ đạt, khắc phục, phiên bản…).

## 5. Sự cố thường gặp
| Hiện tượng | Cách xử lý |
|---|---|
| Không ai đăng nhập được, báo lỗi kết nối | Project Free bị tạm dừng do không dùng 1 tuần → Supabase Dashboard → Restore project |
| Một người báo "Tài khoản đã bị khóa" | Quản trị → Người dùng → Mở khóa |
| Quên mật khẩu | Người dùng bấm "Quên mật khẩu", hoặc admin bấm "Đặt lại mật khẩu" (mật khẩu tạm hiện 1 lần) |
| Không có thông báo nhắc | Vercel → Cron Jobs → xem lần chạy; kiểm tra `CRON_SECRET` (docs/thong-bao-va-cron.md) |
| Xuất PDF lỗi/thiếu dấu | Kiểm tra thư mục `src/assets/fonts` còn đủ 4 file font |
| Báo "database đầy"/chậm | Xem `docs/quy-mo-va-dung-luong.md` |
| Trưởng khoa nhập lúc mất mạng chưa thấy dữ liệu | Mở lại app trên chính máy đó khi có mạng để đồng bộ (docs/ngoai-tuyen.md) |
