import "server-only";
import ExcelJS from "exceljs";
import { KY_HIEU, khoaKq, napDuLieuPhien } from "@/lib/du-lieu-phien";
import { themSheetKhacPhuc } from "@/lib/excel-khac-phuc";
import { hienNgay, hienNgayGio } from "@/lib/thoi-gian";
import type { TrangThaiKq } from "@/types/database";

const NHAN: Record<TrangThaiKq, string> = { dat_co: "Đạt", khong_dat: "Không đạt", khong_co_bo_chuan: "Không có/BC" };
const NEN: Record<TrangThaiKq, string> = { dat_co: "FFC6EFCE", khong_dat: "FFFFC7CE", khong_co_bo_chuan: "FFE7E6E6" };

/** Excel một phiên: Phần I + ma trận phòng × mục (đúng phiên bản bảng kiểm của phiên) + sheet khắc phục. */
export async function xuatExcelPhien(phienId: string): Promise<Buffer> {
  const d = await napDuLieuPhien(phienId);
  const wb = new ExcelJS.Workbook();
  wb.creator = d.cauHinh?.ten_don_vi_quan_ly || "Bảng kiểm đi buồng";
  const ws = wb.addWorksheet("Bảng kiểm đi buồng", { pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const thin = { style: "thin" as const, color: { argb: "FF9AA9AB" } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const cuoi = Math.max(3, 2 + d.phong.length);
  let r = 1;
  const dongTieuDe = (text: string, opts: Partial<ExcelJS.Style> = {}) => {
    ws.mergeCells(r, 1, r, cuoi);
    ws.getCell(r, 1).value = text;
    Object.assign(ws.getCell(r, 1), { style: { alignment: { horizontal: "center" }, ...opts } });
    r++;
  };
  if (d.cauHinh?.ten_benh_vien) dongTieuDe(d.cauHinh.ten_benh_vien.toUpperCase(), { font: { bold: true } });
  dongTieuDe(d.cauHinh?.ten_don_vi_quan_ly || "Phòng Điều dưỡng");
  dongTieuDe("BẢNG KIỂM ĐI BUỒNG CỦA ĐIỀU DƯỠNG/HỘ SINH TRƯỞNG KHOA", { font: { bold: true, size: 14 } });
  dongTieuDe(`${d.tenKhoa} — Ngày ${hienNgay(d.phien.ngay_bao_cao)}${d.phienBan.ten ? ` — Bảng kiểm: ${d.phienBan.ten}` : ""}`);
  r++;

  ws.getCell(r++, 1).value = "PHẦN I: TỔNG QUAN HÀNH CHÍNH";
  ws.getCell(r - 1, 1).font = { bold: true };
  const p = d.phien;
  const phanI: [string, string | number][] = [
    ["Ngày báo cáo", hienNgay(p.ngay_bao_cao)], ["Họ và tên người báo cáo", d.nguoiBaoCao],
    ["ĐD được ĐDTK ủy quyền khi vắng mặt", p.dd_uy_quyen_khi_vang_mat ?? ""],
    ["Tổng số người bệnh hiện có thực tế tại khoa", p.tong_so_nb_thuc_te ?? ""],
    ["Số người bệnh phân cấp chăm sóc cấp 1", p.so_nb_cap_1 ?? ""], ["Số người bệnh phân cấp chăm sóc cấp 2", p.so_nb_cap_2 ?? ""],
    ["Số người bệnh phân cấp chăm sóc cấp 3", p.so_nb_cap_3 ?? ""], ["Số giường dịch vụ còn trống", p.so_giuong_dv_trong ?? ""],
    ["Số giường thường còn trống", p.so_giuong_thuong_trong ?? ""], ["Số người bệnh đang nằm băng ca", p.so_nb_nam_bang_ca],
    ["Tổng số ĐD/HS cơ hữu của khoa", p.tong_so_dd_co_huu ?? ""], ["Số ĐD/HS đang công tác trong ngày", p.so_dd_dang_cong_tac_trong_ngay ?? ""],
    ["Số ĐD/HS ra trực", p.so_dd_ra_truc ?? ""], ["Số ĐD/HS nghỉ bù - nghỉ phép", p.so_dd_nghi_bu_nghi_phep ?? ""],
    ["Số ĐD/HS đang nghỉ theo chế độ", p.so_dd_nghi_che_do],
  ];
  phanI.forEach(([nhan, gt], i) => {
    ws.getCell(r, 1).value = i + 1;
    ws.mergeCells(r, 2, r, Math.max(2, cuoi - 1));
    ws.getCell(r, 2).value = nhan;
    ws.getCell(r, cuoi).value = gt;
    ws.getCell(r, cuoi).font = { bold: true };
    for (let c = 1; c <= cuoi; c++) ws.getCell(r, c).border = box;
    r++;
  });
  r++;

  ws.getCell(r++, 1).value = `PHẦN II: NỘI DUNG KIỂM TRA (${d.muc.length} mục)`;
  ws.getCell(r - 1, 1).font = { bold: true };
  ["STT", "Nội dung kiểm tra", ...d.phong.map((x) => x.soPhong)].forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.style = { font: { bold: true }, border: box, alignment: { horizontal: "center", vertical: "middle", wrapText: true }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEFEF" } } };
  });
  ws.views = [{ state: "frozen", ySplit: r, xSplit: 2 }];
  r++;
  for (const [nhan, lay] of [["Tên ĐD phụ trách", (x: (typeof d.phong)[number]) => x.tenDd ?? ""], ["Tổng số người bệnh", (x: (typeof d.phong)[number]) => x.tongNb ?? ""]] as const) {
    ws.getCell(r, 2).value = nhan;
    ws.getCell(r, 2).font = { italic: true };
    d.phong.forEach((x, i) => { ws.getCell(r, 3 + i).value = lay(x); ws.getCell(r, 3 + i).alignment = { horizontal: "center", wrapText: true }; });
    for (let c = 1; c <= cuoi; c++) ws.getCell(r, c).border = box;
    r++;
  }
  const ghiChu: string[] = [];
  const dem = d.phong.map(() => ({ dat: 0, khong: 0 }));
  for (const m of d.muc) {
    ws.getCell(r, 1).value = m.stt;
    ws.getCell(r, 2).value = m.noiDung + (m.ghiChuHuongDan ? ` (${m.ghiChuHuongDan})` : "");
    ws.getCell(r, 2).alignment = { wrapText: true, vertical: "top" };
    d.phong.forEach((x, i) => {
      const k = d.ketQua.get(khoaKq(x.pktpId, m.id));
      const c = ws.getCell(r, 3 + i);
      if (k?.trangThai) {
        c.value = `${KY_HIEU[k.trangThai]} — ${NHAN[k.trangThai]}`;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NEN[k.trangThai] } };
        if (k.trangThai === "dat_co") dem[i].dat++;
        if (k.trangThai === "khong_dat") dem[i].khong++;
      }
      c.alignment = { horizontal: "center", vertical: "top", wrapText: true };
      if (k?.ghiChu) ghiChu.push(`${x.soPhong} – Mục ${m.stt}: ${k.ghiChu}`);
    });
    for (let c = 1; c <= cuoi; c++) ws.getCell(r, c).border = box;
    r++;
  }
  ws.getCell(r, 2).value = "Tỷ lệ đạt (loại trừ Không có/Bỏ chuẩn)";
  ws.getCell(r, 2).font = { bold: true };
  dem.forEach((t, i) => { const c = ws.getCell(r, 3 + i); c.value = t.dat + t.khong ? `${((t.dat / (t.dat + t.khong)) * 100).toFixed(1)}%` : "—"; c.font = { bold: true }; c.alignment = { horizontal: "center" }; });
  for (let c = 1; c <= cuoi; c++) ws.getCell(r, c).border = box;
  r += 2;
  if (ghiChu.length) {
    ws.getCell(r++, 1).value = "Ghi chú theo mục";
    for (const g of ghiChu) { ws.mergeCells(r, 1, r, cuoi); ws.getCell(r++, 1).value = g; }
    r++;
  }
  for (const [nhan, gt] of [["Ý kiến/vấn đề của người bệnh", p.y_kien_van_de_nguoi_benh], ["Biện pháp khắc phục", p.bien_phap_khac_phuc]] as const) {
    ws.getCell(r++, 1).value = nhan;
    ws.getCell(r - 1, 1).font = { bold: true };
    ws.mergeCells(r, 1, r, cuoi);
    ws.getCell(r, 1).value = gt ?? "";
    ws.getCell(r, 1).alignment = { wrapText: true, vertical: "top" };
    ws.getRow(r).height = 45;
    r += 2;
  }
  ws.getCell(r, 1).value = `Xuất lúc ${hienNgayGio(new Date().toISOString())}`;
  ws.getCell(r, 1).font = { italic: true, color: { argb: "FF5A6F72" } };
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 58;
  d.phong.forEach((_, i) => { ws.getColumn(3 + i).width = 14; });

  themSheetKhacPhuc(wb, d.khacPhuc);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
