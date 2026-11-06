# Danh sách rà soát trước khi dùng toàn viện
*(để trao đổi với Phòng CNTT và Phòng Quản lý chất lượng — đây là các điểm cần kiểm tra, KHÔNG phải kết luận tuân thủ pháp lý)*

## Dữ liệu lưu ở đâu
- [ ] Database và file ảnh: Supabase, khu vực máy chủ đã chọn khi tạo project (đề xuất Singapore). Xác nhận khu vực thực tế.
- [ ] Ứng dụng web: Vercel. Xác nhận khu vực chạy hàm máy chủ.
- [ ] Mã nguồn: GitHub (không chứa dữ liệu, không chứa khóa bí mật).
- [ ] Dữ liệu tạm trên điện thoại (chế độ mất mạng): IndexedDB của trình duyệt, xóa khi đăng xuất.

## Loại dữ liệu
- [ ] Ứng dụng **không có trường** tên/mã/ngày sinh/số hồ sơ người bệnh. Rủi ro còn lại: người dùng tự gõ vào ô ghi chú,
      chụp ảnh có người bệnh. Đã có nhắc trên giao diện — cần quy định nội bộ + tập huấn.
- [ ] Dữ liệu cá nhân của **nhân viên**: họ tên, email công vụ, nhật ký thao tác (ai làm gì, lúc nào). Xác định cơ sở xử lý,
      thông báo cho nhân viên theo **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân.
- [ ] Ảnh có thể vô tình chứa dữ liệu nhạy cảm → quy trình rà soát/xóa ảnh.

## Ai có quyền truy cập
- [ ] Trong app: theo ma trận quyền (CLAUDE.md), ép ở database, có kiểm thử tự động.
- [ ] Người có tài khoản Supabase/Vercel/GitHub của dự án (truy cập toàn bộ dữ liệu) — liệt kê, tối thiểu hóa, bật xác thực 2 lớp.
- [ ] Nhà cung cấp dịch vụ (Supabase, Vercel) — đọc điều khoản xử lý dữ liệu (DPA).

## Điều khoản gói dịch vụ
- [ ] Gói Free/Hobby có phù hợp dùng cho cơ sở y tế/công việc chính thức không (Vercel Hobby dành cho mục đích phi thương mại
      cá nhân — kiểm tra điều khoản hiện hành). Cân nhắc gói trả phí đứng tên bệnh viện.
- [ ] Cam kết sẵn sàng (SLA), sao lưu, thời gian lưu giữ dữ liệu; Free bị tạm dừng sau 1 tuần không dùng.
- [ ] Quy định nội bộ về lưu trữ dữ liệu trên đám mây ngoài nước (nếu có).

## Bảo mật vận hành
- [ ] Ai giữ khóa service role, CRON_SECRET; quy trình thay khóa khi nhân sự nghỉ việc.
- [ ] Đã thử khôi phục từ bản sao lưu ít nhất 1 lần (docs/van-hanh.md mục 3).
- [ ] Thời hạn lưu giữ dữ liệu kiểm tra và nhật ký (bao nhiêu năm) — phục vụ kiểm định Bộ tiêu chí chất lượng.
- [ ] Quy trình khi nhân viên nghỉ việc: khóa tài khoản trong ngày.
- [ ] Tên miền riêng của bệnh viện (thay cho *.vercel.app) nếu cần.
