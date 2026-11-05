import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { truyVanNhatKy } from "@/lib/nhat-ky-server";
import { ghiNhatKy, NHAN_DOI_TUONG, NHAN_HANH_DONG } from "@/lib/nhat-ky";
import { hienNgayGio, homNayVN } from "@/lib/thoi-gian";

const TOI_DA = 10000;

export async function GET(request: NextRequest) {
  await requireRole("admin");
  const loc = Object.fromEntries(request.nextUrl.searchParams.entries());
  const supabase = await createClient();
  const [{ data: nguoi }, { data: khoa }] = await Promise.all([supabase.from("nguoi_dung").select("id, ho_ten"), supabase.from("khoa").select("id, ten_khoa")]);
  const tenNguoi = new Map((nguoi ?? []).map((n) => [n.id, n.ho_ten]));
  const tenKhoa = new Map((khoa ?? []).map((k) => [k.id, k.ten_khoa]));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Nhật ký");
  ws.columns = [
    { header: "Thời gian", width: 18 }, { header: "Người thực hiện", width: 24 }, { header: "Vai trò", width: 14 },
    { header: "Hành động", width: 20 }, { header: "Đối tượng", width: 22 }, { header: "Mã đối tượng", width: 38 },
    { header: "Khoa", width: 22 }, { header: "Giá trị cũ", width: 50 }, { header: "Giá trị mới", width: 50 },
  ];
  ws.getRow(1).font = { bold: true };
  for (let tu = 0; tu < TOI_DA; tu += 1000) {
    const { data } = await truyVanNhatKy(loc, { tu, den: tu + 999 });
    for (const d of data ?? []) {
      ws.addRow([hienNgayGio(d.thoi_gian), d.nguoi_dung_id ? tenNguoi.get(d.nguoi_dung_id) ?? d.nguoi_dung_id : "Hệ thống", d.vai_tro ?? "",
        NHAN_HANH_DONG[d.hanh_dong] ?? d.hanh_dong, NHAN_DOI_TUONG[d.doi_tuong_loai] ?? d.doi_tuong_loai, d.doi_tuong_id ?? "",
        d.khoa_id ? tenKhoa.get(d.khoa_id) ?? "" : "", d.gia_tri_cu ? JSON.stringify(d.gia_tri_cu) : "", d.gia_tri_moi ? JSON.stringify(d.gia_tri_moi) : ""]);
    }
    if (!data || data.length < 1000) break;
  }
  await ghiNhatKy("xuat_file", "excel_nhat_ky", { chiTiet: loc });
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="nhat-ky-${homNayVN()}.xlsx"` },
  });
}
