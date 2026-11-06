import { describe, expect, it } from "vitest";
import { kiemTraKhoa, kiemTraNguoiDung, kiemTraPhong } from "@/lib/nhap-hang-loat";

const khoa = [{ id: "k1", ten_khoa: "Khoa Nội tổng hợp" }];
describe("nhập hàng loạt — báo lỗi theo từng dòng", () => {
  it("khoa: trùng hệ thống, trùng trong file, số giường sai; bỏ dòng trống", () => {
    const r = kiemTraKhoa([["Khoa  nội tổng hợp", ""], ["Khoa Nhi", "20"], ["", ""], ["khoa nhi", ""], ["Khoa Sản", "-3"]], ["Khoa Nội tổng hợp"]);
    expect(r.map((x) => [x.dong, x.loi.length])).toEqual([[2, 1], [3, 0], [5, 1], [6, 1]]);
    expect(r[2].loi[0]).toBe("Trùng với dòng 3");
  });
  it("phòng: khoa không tồn tại, phòng đã có", () => {
    const r = kiemTraPhong([["Khoa Nội tổng hợp", "Phòng 1"], ["Khoa Ma", "Phòng 1"], ["Khoa Nội tổng hợp", "Phòng 2"]], khoa, [{ khoa_id: "k1", so_phong: "phòng 2" }]);
    expect(r.map((x) => x.loi)).toEqual([[], ["Không có khoa “Khoa Ma” trong hệ thống"], ["Phòng đã có trong khoa này"]]);
  });
  it("người dùng: vai trò tiếng Việt, email trùng/sai, trưởng khoa thiếu khoa", () => {
    const r = kiemTraNguoiDung([
      ["Lan", "LAN@bv.vn", "Trưởng khoa", "khoa nội tổng hợp"],
      ["Bình", "binh@bv", "Ban Giám đốc", ""],
      ["Cúc", "cuc@bv.vn", "Trưởng khoa", ""],
      ["Dũng", "lan@bv.vn", "Quản trị viên", ""],
    ], khoa, []);
    expect(r[0].duLieu).toMatchObject({ email: "lan@bv.vn", vai_tro: "truong_khoa", khoa_id: "k1" });
    expect(r[1].loi).toContain("Email không hợp lệ");
    expect(r[2].loi).toContain("Trưởng khoa phải có tên khoa");
    expect(r[3].loi[0]).toBe("Email trùng với dòng 2");
  });
});
