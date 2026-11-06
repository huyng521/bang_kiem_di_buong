# Hướng dẫn cho Quản trị viên (Phòng Điều dưỡng/QLCL)

## Thiết lập ban đầu
1. **Cài đặt hệ thống:** tên bệnh viện, tên đơn vị, logo (in trên PDF/Excel), mục tiêu tỷ lệ đạt, ngày phải đi buồng, giờ nhắc.
2. **Nhập hàng loạt từ Excel** (Quản trị → Nhập hàng loạt): làm lần lượt Khoa → Phòng bệnh → Người dùng.
   Tải file mẫu, điền, "Kiểm tra và xem trước" → sửa dòng lỗi (hoặc chọn bỏ qua dòng lỗi) → Áp dụng.
   Với người dùng: **tải danh sách mật khẩu tạm ngay** (chỉ tải được một lần), gửi riêng từng người, rồi xóa file.

## Tài khoản
Quản trị → Người dùng: tạo (mật khẩu tạm hiện 1 lần), đổi vai trò/khoa, **Khóa** (chặn ngay lập tức, không xóa),
**Đặt lại mật khẩu**. Không tự khóa/hạ quyền chính mình.

## Cập nhật bảng kiểm khi có văn bản mới
Quản trị → Bảng kiểm và phiên bản:
1. **Tạo phiên bản mới** (nhân bản từ bản đang hiệu lực).
2. Sửa trong bản nháp: thêm mục, sửa câu chữ, bỏ mục, kéo thả đổi thứ tự. Khi sửa mục cũ, chọn
   *"Chỉ chỉnh câu chữ (giữ mã)"* hoặc *"Đây là tiêu chí mới (cấp mã mới)"*.
3. Xem phần **So sánh** (thêm/sửa/bỏ) để rà soát.
4. **Công bố:** nhập số hiệu, ngày ban hành, trích yếu văn bản căn cứ, ngày hiệu lực (≥ hôm nay).
   Từ ngày hiệu lực, phiên mới dùng bản mới; phiên cũ và phiên đang làm dở giữ bản cũ.
Bản đã công bố không sửa được (kể cả admin) — muốn đổi phải tạo phiên bản mới.

## Nhật ký thao tác
Quản trị → Nhật ký thao tác: lọc theo người, khoa, hành động, đối tượng, ngày; xuất Excel. Không ai sửa/xóa được nhật ký.

## Phiên kiểm tra
Admin sửa được phiên đã hoàn thành (được ghi nhật ký) và **Ẩn phiên** (không xóa; xem lại/hiện lại ở Quản trị).

## Sao lưu
Quản trị → Xuất toàn bộ dữ liệu (CSV). Sao lưu chính: xem `docs/van-hanh.md`.
