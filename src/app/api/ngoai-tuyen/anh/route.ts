import { NextResponse, type NextRequest } from "next/server";
import { nguoiDungApi } from "@/lib/api-auth";
import { chuanBiTaiAnh, ghiNhanAnhKetQua } from "@/app/(app)/di-buong/[phienId]/phong/[phongId]/actions";

// Ảnh chụp khi mất mạng: thiết bị xin đường dẫn lưu (buoc=chuan_bi), tự tải lên Storage, rồi ghi nhận (buoc=ghi_nhan).
export async function POST(request: NextRequest) {
  const u = await nguoiDungApi();
  if (u instanceof NextResponse) return u;
  const b = await request.json();
  if (b.buoc === "chuan_bi") return NextResponse.json(await chuanBiTaiAnh(b.phienId));
  if (b.buoc === "ghi_nhan") return NextResponse.json(await ghiNhanAnhKetQua(b.phienId, b.pktpId, b.itemId, b.path, String(b.ten ?? "anh.jpg"), Number(b.kichThuoc) || 0));
  return NextResponse.json({ loi: "Bước không hợp lệ" }, { status: 400 });
}
