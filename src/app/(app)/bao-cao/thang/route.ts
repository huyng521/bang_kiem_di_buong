import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { napBaoCaoThang } from "@/lib/bao-cao-thang";
import { taoPdfBaoCaoThang } from "@/lib/pdf/bao-cao-thang-pdf";
import { homNayVN } from "@/lib/thoi-gian";
import { ghiNhatKy } from "@/lib/nhat-ky";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const sp = request.nextUrl.searchParams;
  const thang = /^\d{4}-\d{2}$/.test(sp.get("thang") ?? "") ? sp.get("thang")! : homNayVN().slice(0, 7);
  // Trưởng khoa luôn chỉ lấy được khoa mình (RLS cũng chặn ở database).
  const khoa = user.nguoiDung.vai_tro === "truong_khoa" ? user.nguoiDung.khoa_id : sp.get("khoa") || null;
  const b = await napBaoCaoThang(thang, khoa);
  await ghiNhatKy("xuat_file", "bao_cao_thang", { id: thang, khoaId: khoa, chiTiet: { dinh_dang: sp.get("dinh_dang") ?? "pdf" } });
  const ten = `bao-cao-di-buong-${thang}${khoa ? "-" + b.tenKhoa.replace(/\s+/g, "-") : ""}`;

  if (sp.get("dinh_dang") === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const them = (tenSheet: string, cot: string[], dong: (string | number | null)[][]) => {
      const ws = wb.addWorksheet(tenSheet);
      ws.addRow([`${b.cauHinh?.ten_benh_vien ?? ""} — Báo cáo đi buồng tháng ${thang} — ${b.tenKhoa}`]).font = { bold: true };
      ws.addRow(cot).font = { bold: true };
      dong.forEach((d) => ws.addRow(d));
      ws.columns.forEach((c, i) => { c.width = i === 1 && tenSheet !== "Theo khoa" ? 60 : 16; });
    };
    them("Theo khoa", ["Khoa", "Số phiên", "Ô áp dụng", "Đạt", "Tỷ lệ đạt (%)"], b.theoKhoa.map((r) => [r.ten_khoa, r.so_phien, r.tong_muc_ap_dung, r.so_dat, r.ty_le_dat]));
    them("Theo mục", ["Mục", "Nội dung", "Đạt", "Không đạt", "Bỏ chuẩn", "Tỷ lệ đạt (%)"], b.theoMuc.map((r) => [r.stt, r.noi_dung, r.so_dat, r.so_khong_dat, r.so_bo_chuan, r.ty_le_dat]));
    them("Không đạt nhiều nhất", ["Mục", "Nội dung", "Không đạt", "Tỷ lệ đạt (%)"], b.topKhongDat.map((r) => [r.stt, r.noi_dung, r.so_khong_dat, r.ty_le_dat]));
    them("Khắc phục", ["Khoa", "Tổng", "Đang mở", "Quá hạn", "Đã xác nhận", "Đã hủy", "TB ngày khắc phục"], b.khacPhuc.map((r) => [r.ten_khoa, r.so_tong, r.so_mo, r.so_qua_han, r.so_da_xac_nhan, r.so_huy, r.tb_ngay_khac_phuc]));
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${encodeURIComponent(ten)}.xlsx"` },
    });
  }
  const pdf = await taoPdfBaoCaoThang(b);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(ten)}.pdf"` },
  });
}
