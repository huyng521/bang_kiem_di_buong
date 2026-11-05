# Ước tính dung lượng ảnh minh chứng

Mỗi ảnh sau khi nén trên điện thoại: cạnh dài ≤ 1600px, thường **250–450 KB** (tính trung bình 350 KB).

Giả định (sửa lại theo số thật của bệnh viện): 30 khoa, đi buồng 22 ngày/tháng (thứ 2–6),
mỗi buổi chụp ảnh cho các mục "Không đạt": trung bình **4 ảnh/khoa/buổi**, cộng ảnh sau khắc phục ~2 ảnh.

| | Ảnh/tháng | Dung lượng/tháng | Dung lượng/năm |
|---|---|---|---|
| Ít (4 ảnh/buổi) | 30 × 22 × 4 = 2.640 | ≈ 0,9 GB | ≈ 11 GB |
| Vừa (6 ảnh/buổi) | 3.960 | ≈ 1,4 GB | ≈ 16 GB |
| Nhiều (10 ảnh/buổi) | 6.600 | ≈ 2,3 GB | ≈ 27 GB |

Gói Supabase **Free** cho **1 GB** lưu trữ file — chỉ đủ khoảng **1 tháng** ở mức "Ít" cho toàn viện.
Gói **Pro** (25 USD/tháng) có sẵn 100 GB, đủ nhiều năm. Kiểm tra lại giá/giới hạn hiện hành tại
https://supabase.com/pricing trước khi quyết định.

Lựa chọn nếu muốn ở gói Free lâu hơn: chỉ cho chụp ảnh ở mục "Không đạt", giảm cạnh dài xuống 1200px
(~200 KB/ảnh), hoặc xóa ảnh của phiên cũ hơn 12 tháng sau khi đã xuất PDF có phụ lục ảnh.
