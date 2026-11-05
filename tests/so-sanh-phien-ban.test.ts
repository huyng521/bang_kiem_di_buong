import { describe, expect, it } from "vitest";
import { soSanhPhienBan } from "@/lib/so-sanh-phien-ban";

const m = (ma: string, stt: number, noi_dung: string) => ({ ma_muc_goc: ma, stt, noi_dung, ghi_chu_huong_dan: null });
describe("so sánh phiên bản", () => {
  it("nhận ra mục thêm, bỏ, sửa câu chữ, đổi thứ tự", () => {
    const r = soSanhPhienBan(
      [m("M-001", 1, "A"), m("M-002", 2, "B"), m("M-003", 3, "C")],
      [m("M-002", 1, "B"), m("M-001", 2, "A sửa"), m("M-036", 3, "Mới")],
    );
    expect(r.them.map((x) => x.ma_muc_goc)).toEqual(["M-036"]);
    expect(r.bo.map((x) => x.ma_muc_goc)).toEqual(["M-003"]);
    expect(r.sua.map((x) => x.ma)).toEqual(["M-001"]);
    expect(r.doiThuTu).toHaveLength(2);
  });
});
