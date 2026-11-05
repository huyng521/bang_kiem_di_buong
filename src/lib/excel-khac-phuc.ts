import "server-only";
import type ExcelJS from "exceljs";
import { NHAN_TT_KP, NHAN_UU_TIEN } from "@/lib/khac-phuc";
import type { DongKhacPhuc } from "@/lib/khac-phuc-server";
import { hienNgay } from "@/lib/thoi-gian";

/** Thêm một sheet danh sách hành động khắc phục vào workbook (dùng cho file riêng và file phiên). */
export function themSheetKhacPhuc(wb: ExcelJS.Workbook, ds: DongKhacPhuc[], tenSheet = "Hành động khắc phục") {
  const ws = wb.addWorksheet(tenSheet);
  ws.columns = [
    { header: "Khoa", key: "khoa", width: 22 },
    { header: "Ngày phiên", key: "phien", width: 12 },
    { header: "Mục", key: "muc", width: 6 },
    { header: "Mô tả vấn đề", key: "mota", width: 45 },
    { header: "Biện pháp", key: "bp", width: 40 },
    { header: "Người phụ trách", key: "npt", width: 20 },
    { header: "Hạn xử lý", key: "han", width: 12 },
    { header: "Ưu tiên", key: "ut", width: 11 },
    { header: "Trạng thái", key: "tt", width: 14 },
    { header: "Quá hạn", key: "qh", width: 9 },
    { header: "Ngày hoàn thành", key: "ht", width: 14 },
    { header: "Ghi chú khắc phục / lý do hủy", key: "gc", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEFEF" } };
  for (const h of ds) {
    const r = ws.addRow({
      khoa: h.ten_khoa,
      phien: hienNgay(h.ngay_phien),
      muc: h.stt_muc ?? "",
      mota: h.mo_ta_van_de,
      bp: h.bien_phap ?? "",
      npt: h.nguoi_phu_trach ?? "",
      han: hienNgay(h.han_xu_ly),
      ut: NHAN_UU_TIEN[h.muc_uu_tien],
      tt: NHAN_TT_KP[h.trang_thai],
      qh: h.qua_han ? "QUÁ HẠN" : "",
      ht: hienNgay(h.ngay_hoan_thanh),
      gc: h.trang_thai === "huy" ? h.ly_do_huy ?? "" : h.ghi_chu_khac_phuc ?? "",
    });
    r.alignment = { wrapText: true, vertical: "top" };
    if (h.qua_han) r.getCell("qh").font = { bold: true, color: { argb: "FFB02B2B" } };
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return ws;
}
