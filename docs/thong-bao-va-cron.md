# Thông báo và tác vụ định kỳ

Ứng dụng tạo thông báo trong app (biểu tượng 🔔): khoa chưa đi buồng sau giờ nhắc, hành động khắc phục
còn 1 ngày đến hạn/quá hạn, phiên nháp quá 24 giờ, và bản tổng hợp các khoa chưa đi buồng gửi admin.
Mỗi sự kiện chỉ tạo **một** thông báo cho một người, chạy lại bao nhiêu lần cũng không trùng.
Email: không làm (theo quyết định mặc định ở Mốc 0).

## Cách 1 (mặc định) — Vercel Cron, 1 lần/ngày
Gói Vercel **Hobby** chỉ cho cron chạy **1 lần mỗi ngày** và giờ chạy có thể lệch trong vòng 1 tiếng
([tài liệu Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing)). File `vercel.json` đặt lịch
`0 8 * * *` (giờ UTC) = **15:00 giờ Việt Nam**, thực tế chạy trong khoảng 15:00–15:59 — khớp giờ nhắc mặc định 15:00.

Việc cần làm: trên Vercel → Project → Settings → Environment Variables, thêm `CRON_SECRET` (một chuỗi ngẫu nhiên dài,
ví dụ tạo bằng `openssl rand -hex 32`), rồi Redeploy. Kiểm tra: Vercel → Project → Cron Jobs → bấm "Run".

Nếu đổi giờ nhắc trong Cài đặt hệ thống sang giờ khác, sửa `schedule` trong `vercel.json` cho khớp
(giờ UTC = giờ Việt Nam − 7).

## Cách 2 (tùy chọn) — chạy mỗi giờ bằng pg_cron của Supabase
Nếu muốn nhắc sát giờ hơn mà không nâng gói Vercel: Supabase Dashboard → Database → Extensions → bật `pg_cron`,
rồi chạy trong SQL Editor:
```sql
select cron.schedule('thong-bao-moi-gio', '5 * * * *', $$ select public.tao_thong_bao_dinh_ky(); $$);
```
(Hàm này chỉ nhận lời gọi từ tác vụ hệ thống, không phải từ người dùng.) Hủy: `select cron.unschedule('thong-bao-moi-gio');`
