import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { layDanhSachKhacPhuc } from "@/lib/khac-phuc-server";
import { themSheetKhacPhuc } from "@/lib/excel-khac-phuc";
import { homNayVN } from "@/lib/thoi-gian";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const loc = Object.fromEntries(request.nextUrl.searchParams.entries());
  const ds = await layDanhSachKhacPhuc(user, loc);
  const wb = new ExcelJS.Workbook();
  themSheetKhacPhuc(wb, ds);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hanh-dong-khac-phuc-${homNayVN()}.xlsx"`,
    },
  });
}
