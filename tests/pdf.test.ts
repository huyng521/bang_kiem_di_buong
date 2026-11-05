// Xuất thử PDF một phiên có đủ dấu tiếng Việt; lưu ra thư mục tạm để xem bằng mắt.
import { describe, expect, it } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taoPdfPhien } from "@/lib/pdf/phien-pdf";
import type { DuLieuPhien } from "@/lib/du-lieu-phien";

export function duLieuMau(soMuc = 35, soPhong = 8): DuLieuPhien {
  const phong = Array.from({ length: soPhong }, (_, i) => ({ pktpId: `p${i}`, soPhong: `Phòng số ${i + 1}`, tenDd: "Lê Thị Ánh", tongNb: 5 + i }));
  const muc = Array.from({ length: soMuc }, (_, i) => ({
    id: `m${i}`, stt: i + 1,
    noiDung: i === 0 ? "Ăn uống, ân cần, ê kíp, ô tô, ơn nghĩa, ưu tiên, đường đi — dấu: à á ả ã ạ, ằ ắ ẳ ẵ ặ, ề ế ể ễ ệ, ỗ ộ, ờ ớ ở ỡ ợ, ừ ứ ử ữ ự, ỳ ý ỷ ỹ ỵ." : `Nội dung mục kiểm tra số ${i + 1}: bình hút đàm, bồn cầu không tắc nghẹt.`,
    ghiChuHuongDan: i === 1 ? "Người bệnh ăn qua ống thông → ĐD trực tiếp thực hiện" : null,
  }));
  const ketQua = new Map();
  const tt = ["dat_co", "dat_co", "dat_co", "khong_dat", "khong_co_bo_chuan", null] as const;
  phong.forEach((p, a) => muc.forEach((m, b) => ketQua.set(`${p.pktpId}:${m.id}`, { id: `${a}-${b}`, trangThai: tt[(a + b) % tt.length], ghiChu: a === 0 && b === 3 ? "Vòi nước rỉ, đã báo tổ bảo trì" : null })));
  return {
    phien: {
      id: "x", khoa_id: "k", nguoi_kiem_tra_id: "n", checklist_version_id: "v", thoi_gian_bat_dau: "2026-11-05T01:00:00Z", thoi_gian_hoan_thanh: "2026-11-05T03:00:00Z",
      trang_thai: "hoan_thanh", an: false, ngay_bao_cao: "2026-11-05", dd_uy_quyen_khi_vang_mat: "Phạm Thị Hồng Nhung", tong_so_nb_thuc_te: 42, so_nb_cap_1: 6, so_nb_cap_2: 20, so_nb_cap_3: 16,
      so_giuong_dv_trong: 2, so_giuong_thuong_trong: 3, so_nb_nam_bang_ca: 0, tong_so_dd_co_huu: 18, so_dd_dang_cong_tac_trong_ngay: 11, so_dd_ra_truc: 2, so_dd_nghi_bu_nghi_phep: 1, so_dd_nghi_che_do: 0,
      y_kien_van_de_nguoi_benh: "Người nhà phản ánh nước nóng yếu ở nhà vệ sinh phòng 3.", bien_phap_khac_phuc: "Đã báo Phòng Hành chính quản trị kiểm tra bình nóng lạnh.", created_at: "",
    },
    tenKhoa: "Khoa Hồi sức tích cực – Chống độc", nguoiBaoCao: "Nguyễn Thị Hương Giang",
    cauHinh: { id: 1, ten_benh_vien: "Bệnh viện Đa khoa Tỉnh", ten_don_vi_quan_ly: "Phòng Điều dưỡng", logo_path: null, muc_tieu_ty_le_dat: 90, ngay_di_buong: [1, 2, 3, 4, 5], gio_nhac_chua_di_buong: "15:00", updated_at: "" },
    logo: null, phienBan: { ten: "Ver 2", vanBan: null }, phong, muc, ketQua,
    khacPhuc: [{ id: "h", khoa_id: "k", phien_kiem_tra_id: "x", checklist_item_id: "m3", mo_ta_van_de: "Mục 4: không đạt ở Phòng số 1", bien_phap: "Tập huấn lại quy trình phòng ngừa té ngã", nguoi_phu_trach: "Điều dưỡng Hưng", han_xu_ly: "2026-11-12", muc_uu_tien: "cao", trang_thai: "dang_xu_ly", ngay_hoan_thanh: null, ghi_chu_khac_phuc: null, ly_do_huy: null, nguoi_tao_id: null, nguoi_xac_nhan_id: null, xac_nhan_luc: null, created_at: "", updated_at: "", ten_khoa: "", stt_muc: 4, ngay_phien: "2026-11-05", qua_han: false }],
  };
}

describe("PDF phiên kiểm tra", () => {
  it("tạo được PDF có nhúng font và giữ nguyên dấu tiếng Việt", async () => {
    const buf = await taoPdfPhien(duLieuMau());
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.includes(Buffer.from("BeVietnamPro"))).toBe(true);
    const dir = process.env.PDF_OUT ?? mkdtempSync(join(tmpdir(), "pdf-"));
    writeFileSync(join(dir, "phien-mau.pdf"), buf);
  }, 60_000);
  it("số mục khác 35 (ví dụ 40 mục, 3 phòng) vẫn xuất được", async () => {
    const buf = await taoPdfPhien(duLieuMau(40, 3));
    expect(buf.length).toBeGreaterThan(1000);
  }, 60_000);
});

describe("PDF báo cáo tháng", () => {
  it("tạo được", async () => {
    const { taoPdfBaoCaoThang } = await import("@/lib/pdf/bao-cao-thang-pdf");
    const buf = await taoPdfBaoCaoThang({
      thang: "2026-11", tu: "2026-11-01", den: "2026-11-30", tenKhoa: "Toàn viện", cauHinh: null, logo: null,
      theoKhoa: [{ ten_khoa: "Khoa Nội", so_phien: 20, tong_muc_ap_dung: 600, so_dat: 540, ty_le_dat: 90 }],
      theoMuc: [{ ma_muc_goc: "M-001", stt: 1, noi_dung: "Tư vấn cho người bệnh khi vào viện.", so_dat: 10, so_khong_dat: 2, so_bo_chuan: 1, ty_le_dat: 83.3 }],
      topKhongDat: [], khacPhuc: [], tyLeChung: 90,
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  }, 60_000);
});
