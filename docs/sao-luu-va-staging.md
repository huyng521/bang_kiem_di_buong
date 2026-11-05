# Quy trình an toàn khi cập nhật database

## 1. Sao lưu trước MỖI lần chạy migration
Cách đơn giản nhất, không cần cài gì thêm ngoài Node.js:

```bash
npx supabase login                     # đăng nhập 1 lần
npx supabase link --project-ref <ma-project>   # mã project lấy trong URL dashboard Supabase
npx supabase db dump --data-only -f backup/du-lieu-$(date +%Y%m%d-%H%M).sql
npx supabase db dump -f backup/cau-truc-$(date +%Y%m%d-%H%M).sql
```
Cất 2 file này ra ngoài máy (Google Drive của Phòng Điều dưỡng). Thư mục `backup/` đã bị
loại khỏi git để không lỡ đưa dữ liệu lên GitHub.

## 2. Có nên có project thử nghiệm (staging)? — Nên.
Tạo thêm 1 project Supabase thứ hai tên `bang-kiem-thu-nghiem`:
1. Supabase → New project (cùng khu vực Singapore).
2. Chạy toàn bộ migration lên project này (mục 3).
3. Trên Vercel, mỗi nhánh code chưa gộp có một bản xem trước (Preview). Vào
   Vercel → Settings → Environment Variables, đặt 3 biến Supabase của project thử nghiệm cho
   môi trường **Preview**, còn **Production** giữ project thật.
4. Thử trên link Preview trước; ổn mới gộp nhánh (merge) để chạy lên project thật.

## 3. Áp migration
```bash
npx supabase link --project-ref <ma-project-thu-nghiem>
npx supabase db push          # chạy các file mới trong supabase/migrations
```
Nếu chưa dùng CLI: mở từng file mới trong `supabase/migrations` (theo thứ tự tên) và dán vào
SQL Editor. Không dán lại file đã chạy trước đó.

## 4. Lệnh kiểm thử tự động
`npm test` chạy toàn bộ migration trên một Postgres giả lập ngay trên máy và kiểm tra phân quyền
+ công thức tỷ lệ đạt. Chạy lệnh này trước khi áp migration lên project thật.
