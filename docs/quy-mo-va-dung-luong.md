# Quy mô toàn viện: dung lượng và tốc độ (Mốc 10)

## Số liệu đo được
Mô phỏng 30 khoa × 10 phòng × 35 mục × 90 ngày = **945.000 dòng kết quả** (`tests/quy-mo/mo-phong.ts`), và đo riêng
nhật ký thao tác (`tests/quy-mo/do-nhat-ky.ts`):

| Thành phần | Dung lượng thực đo |
|---|---|
| 1 ô kết quả (dòng + index) | ~208 byte |
| Nhật ký cho 1 ô (chấm + 20% sửa lại) | ~655 byte |
| Phần I, phòng trong phiên, khắc phục, thông báo | nhỏ (< 3% tổng) |

## Ước tính theo năm (30 khoa × 10 phòng × 35 mục)
| Số ngày đi buồng/năm | Ô kết quả | Bảng kết quả | Nhật ký | **Tổng database** |
|---|---|---|---|---|
| 261 (thứ 2–6, mặc định) | 2,74 triệu | ~0,57 GB | ~1,8 GB | **~2,4 GB/năm** |
| 365 (cả tuần) | 3,83 triệu | ~0,80 GB | ~2,5 GB | **~3,3 GB/năm** |

Ảnh minh chứng nằm riêng ở Storage: ~11–27 GB/năm (xem `docs/dung-luong-anh.md`).

**Kết luận:** gói Supabase **Free (500 MB database, 1 GB file)** chỉ đủ khoảng **2–3 tháng** dữ liệu toàn viện
(chủ yếu do nhật ký), ảnh đầy sau khoảng 1 tháng. Đủ để chạy thử 1–3 khoa, **không đủ cho toàn viện**.

## Tốc độ dashboard
Ban đầu, truy vấn dashboard trên 945.000 dòng mất **~40 giây** vì phân quyền bị kiểm tra trên từng dòng.
Đã sửa (Mốc 10): kiểm tra quyền một lần mỗi truy vấn + lọc ngày trước bằng index → **1,5–5,7 giây** trên Postgres
mô phỏng (WASM, chậm hơn máy chủ thật nhiều lần). Phân quyền vẫn được kiểm thử tự động.

## Các phương án — CẦN ANH/CHỊ CHỌN
1. **Nâng Supabase Pro** (khoảng 25 USD/tháng; theo trang giá, có kèm sao lưu hằng ngày và dung lượng database/file
   lớn hơn nhiều so với Free — kiểm tra con số hiện hành tại supabase.com/pricing). *Đề xuất* — đơn giản, an toàn,
   đủ nhiều năm, có sao lưu tự động.
2. **Gọn nhật ký**: không ghi nhật ký từng lần chấm ô khi phiên còn nháp (vẫn ghi mọi thay đổi sau khi phiên đã hoàn
   thành, mọi thao tác admin, khắc phục, tài khoản…). Giảm ~80% dung lượng nhật ký → tổng ~0,8 GB/năm. Cần
   anh/chị đồng ý vì giảm mức chi tiết "ai sửa ô nào lúc nào" trong lúc đang đi buồng.
3. **Bảng tổng hợp tháng + lưu trữ dữ liệu cũ**: sau 2 năm, chuyển dữ liệu chi tiết sang file lưu trữ (giữ bảng
   tổng hợp để vẽ xu hướng). Phức tạp hơn; chỉ cần khi đã dùng nhiều năm.

Có thể kết hợp 1 + 2. Chưa phương án nào được áp dụng — chờ anh/chị chọn.
