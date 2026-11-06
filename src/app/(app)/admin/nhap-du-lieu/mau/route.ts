import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { COT_MAU, type LoaiNhap } from "@/lib/nhap-hang-loat";

const TEN: Record<LoaiNhap, string> = { khoa: "mau-nhap-khoa", phong: "mau-nhap-phong-benh", nguoi_dung: "mau-nhap-nguoi-dung" };

export async function GET(request: NextRequest) {
  await requireRole("admin");
  const loai = request.nextUrl.searchParams.get("loai") as LoaiNhap;
  if (!COT_MAU[loai]) return new NextResponse("Loại không hợp lệ", { status: 400 });
  const m = COT_MAU[loai];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Dữ liệu");
  ws.addRow(m.cot).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEFEF" } };
  m.viDu.forEach((r) => ws.addRow(r).font = { italic: true, color: { argb: "FF7A8A8C" } });
  ws.columns.forEach((c) => { c.width = 32; });
  const hd = wb.addWorksheet("Hướng dẫn");
  hd.addRow(["Hướng dẫn"]).font = { bold: true };
  hd.addRow([m.huongDan]);
  hd.addRow(["Xóa các dòng ví dụ (chữ nghiêng) trước khi nhập. Giữ nguyên dòng tiêu đề ở sheet “Dữ liệu”."]);
  hd.addRow(["Không nhập thông tin người bệnh vào file này."]);
  hd.getColumn(1).width = 100;
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${TEN[loai]}.xlsx"` },
  });
}
