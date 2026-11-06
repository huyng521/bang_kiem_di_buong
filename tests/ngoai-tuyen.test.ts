// Mốc 9: bộ máy ngoại tuyến — mô phỏng mất mạng, đóng/mở lại trình duyệt, xung đột.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { kho } from "@/lib/ngoai-tuyen/kho";
import { dongBoPhien, ghiThayDoi, taiVeMay } from "@/lib/ngoai-tuyen/dong-bo";
import type { BanSaoPhien, ThayDoi } from "@/lib/ngoai-tuyen/kieu";

const banSao = (): BanSaoPhien => ({
  phienId: "p1", taiLuc: "", tenKhoa: "Khoa A", nguoiBaoCao: "X", coTheSua: true,
  phien: { ngay_bao_cao: "2026-11-05", trang_thai: "draft" },
  muc: [{ id: "m1", stt: 1, noi_dung: "Mục 1", ghi_chu_huong_dan: null }],
  phong: [{ pktpId: "k1", soPhong: "Phòng 1", tenDd: null, tongNb: null }],
  ketQua: {},
});
const ttKq = (tt: "dat_co" | "khong_dat", luc: string): ThayDoi => ({ loai: "ket_qua", pktpId: "k1", itemId: "m1", tt, gc: null, luc });
const matMang: typeof fetch = async () => { throw new TypeError("Failed to fetch"); };
const mayChu = (tra: (body: { thayDoi: ThayDoi[] }) => unknown, status = 200): typeof fetch =>
  (async (_u: unknown, init?: RequestInit) => new Response(JSON.stringify(tra(JSON.parse(String(init?.body ?? "{}")))), { status })) as typeof fetch;

beforeEach(async () => { await kho.xoaHet(); await kho.luuPhien(banSao()); });

describe("Ngoại tuyến", () => {
  it("mất mạng giữa chừng: thay đổi nằm trong hàng đợi, không mất", async () => {
    let p = (await kho.layPhien("p1"))!;
    p = await ghiThayDoi(p, ttKq("khong_dat", "2026-11-05T02:00:00Z"));
    const kq = await dongBoPhien("p1", matMang);
    expect(kq.loi).toBe("Chưa có mạng");
    expect(await kho.hangDoi("p1")).toHaveLength(1);
    expect(p.ketQua["k1:m1"].tt).toBe("khong_dat");
  });
  it("đóng/mở lại trình duyệt khi offline: dữ liệu và hàng đợi vẫn còn (IndexedDB)", async () => {
    const p = (await kho.layPhien("p1"))!;
    await ghiThayDoi(p, ttKq("dat_co", "2026-11-05T02:00:00Z"));
    // "mở lại": đọc lại từ kho
    expect((await kho.layPhien("p1"))!.ketQua["k1:m1"].tt).toBe("dat_co");
    expect(await kho.hangDoi("p1")).toHaveLength(1);
  });
  it("có mạng lại: gửi đúng thứ tự, xóa khỏi hàng đợi", async () => {
    let p = (await kho.layPhien("p1"))!;
    p = await ghiThayDoi(p, ttKq("khong_dat", "2026-11-05T02:00:00Z"));
    await ghiThayDoi(p, ttKq("dat_co", "2026-11-05T02:01:00Z"));
    let nhan: ThayDoi[] = [];
    const kq = await dongBoPhien("p1", mayChu((b) => { nhan = b.thayDoi; return { ketQua: b.thayDoi.map(() => ({ trang_thai: "ap_dung" })) }; }));
    expect(kq).toMatchObject({ daGui: 2, loi: null });
    expect(nhan.map((t) => (t as { tt: string }).tt)).toEqual(["khong_dat", "dat_co"]);
    expect(await kho.hangDoi("p1")).toHaveLength(0);
  });
  it("xung đột: máy chủ có bản mới hơn → giữ bản máy chủ và báo người dùng", async () => {
    const p = (await kho.layPhien("p1"))!;
    await ghiThayDoi(p, ttKq("khong_dat", "2026-11-05T02:00:00Z"));
    const kq = await dongBoPhien("p1", mayChu(() => ({ ketQua: [{ trang_thai: "xung_dot", may_chu: { tt: "dat_co", gc: null, luc: "2026-11-05T03:00:00Z" } }] })));
    expect(kq.xungDot).toHaveLength(1);
    expect((await kho.layPhien("p1"))!.ketQua["k1:m1"].tt).toBe("dat_co");
  });
  it("lỗi giữa chừng: dừng lại, giữ thay đổi chưa gửi để thử lại", async () => {
    let p = (await kho.layPhien("p1"))!;
    p = await ghiThayDoi(p, ttKq("khong_dat", "2026-11-05T02:00:00Z"));
    await ghiThayDoi(p, ttKq("dat_co", "2026-11-05T02:01:00Z"));
    const kq = await dongBoPhien("p1", mayChu(() => ({ ketQua: [{ trang_thai: "ap_dung" }, { trang_thai: "loi", thong_bao: "Phiên đã khóa" }] })));
    expect(kq.loi).toBe("Phiên đã khóa");
    expect(await kho.hangDoi("p1")).toHaveLength(1);
  });
  it("tài khoản bị khóa (403): xóa toàn bộ dữ liệu cục bộ", async () => {
    const p = (await kho.layPhien("p1"))!;
    await ghiThayDoi(p, ttKq("dat_co", "2026-11-05T02:00:00Z"));
    const kq = await dongBoPhien("p1", mayChu(() => ({}), 403));
    expect(kq.biKhoa).toBe(true);
    expect(await kho.layPhien("p1")).toBeUndefined();
  });
  it("tải lại bản mới từ máy chủ không làm mất thay đổi chưa gửi", async () => {
    const p = (await kho.layPhien("p1"))!;
    await ghiThayDoi(p, ttKq("khong_dat", "2026-11-05T02:00:00Z"));
    const moi = await taiVeMay("p1", mayChu(() => banSao()));
    expect(moi.ketQua["k1:m1"].tt).toBe("khong_dat");
  });
});
