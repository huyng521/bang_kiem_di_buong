# Cài lên điện thoại và làm việc khi mất mạng (Mốc 9)

## Cài như một app (PWA)
Mở web trên điện thoại → menu trình duyệt → **"Thêm vào màn hình chính"** (iPhone: Safari → nút Chia sẻ →
"Thêm vào MH chính"). App có biểu tượng riêng, mở toàn màn hình.

## Đi buồng khi mất mạng
1. Khi **còn mạng**, mở phiên đi buồng → bấm **"📶 Đi buồng ở chế độ dùng được khi mất mạng"**. Phiên
   (bảng kiểm, danh sách phòng, dữ liệu đã nhập) được tải về máy.
2. Mất mạng vẫn nhập Phần I, tick từng mục, ghi chú, chụp ảnh. Dữ liệu lưu ngay trên máy.
3. Thanh trên cùng luôn cho biết: **Đã đồng bộ** / **Chưa đồng bộ — N thay đổi** / **Đang đồng bộ…** /
   **Lỗi đồng bộ — bấm để thử lại**.
4. Có mạng lại: tự gửi lên (và cứ 30 giây thử lại). Ảnh được nén và xếp hàng, tải lên sau.
5. Chỉ khi đã đồng bộ hết mới bấm được "Hoàn thành" (cả ở chế độ ngoại tuyến lẫn trang trực tuyến trên cùng máy).

## Xung đột
Mỗi ô kết quả mang thời điểm sửa trên thiết bị. Máy chủ chỉ nhận thay đổi **mới hơn** bản đang có
(mới nhất theo từng ô thắng). Nếu ô đã được sửa ở nơi khác với thời điểm mới hơn, app **giữ bản mới hơn và
hiện thông báo** cho người dùng, không ghi đè im lặng.

## Bảo mật
- Trên máy chỉ lưu số liệu vận hành của phiên (không có thông tin người bệnh).
- **Đăng xuất xóa toàn bộ dữ liệu cục bộ** (IndexedDB + bộ nhớ đệm).
- Tài khoản bị khóa: khi có mạng lại, máy chủ từ chối, app xóa dữ liệu trên máy.

## Kết quả thử (bản production, Chrome, API giả lập)
| Tình huống | Kết quả |
|---|---|
| Có mạng, chấm 1 mục | Gửi lên ngay, "Đã đồng bộ" ✓ |
| Tắt mạng giữa chừng, chấm thêm 2 mục | "Chưa đồng bộ — 2 thay đổi (đang mất mạng)", không mất dữ liệu ✓ |
| Đóng tab rồi mở lại khi vẫn mất mạng | Trang mở được từ bộ nhớ đệm, 3 ô đã chấm vẫn còn, 2 thay đổi vẫn chờ ✓ |
| Bấm hoàn thành khi còn chưa đồng bộ | Bị chặn, có thông báo ✓ |
| Có mạng lại | Tự gửi đúng thứ tự (Đạt, Không đạt, Bỏ chuẩn), "Đã đồng bộ", mở được bước hoàn thành ✓ |
| Mất mạng khi chụp ảnh | Ảnh nằm trong hàng đợi; tải lên lỗi thì báo lỗi, giữ ảnh để thử lại ✓ |

Chưa thử được: thiết bị thật (iPhone/Android) và Supabase thật — cần thử lại sau khi deploy.

## Phạm vi đã thu hẹp (cần bạn biết)
- Chế độ ngoại tuyến là **màn hình riêng** (gọn hơn trang trực tuyến): không xem lại ảnh đã chụp, không tạo
  hành động khắc phục; bước "Hoàn thành" vẫn làm ở trang trực tuyến sau khi đã đồng bộ.
- Phải mở phiên ít nhất một lần khi có mạng trên máy đó thì mới dùng ngoại tuyến được.
- Bắt đầu phiên mới cần có mạng.
