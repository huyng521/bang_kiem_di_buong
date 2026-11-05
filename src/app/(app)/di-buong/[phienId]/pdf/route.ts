import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { getPhienOrNotFound } from "@/lib/phien";
import { napDuLieuPhien, taiAnhPhien } from "@/lib/du-lieu-phien";
import { taoPdfPhien } from "@/lib/pdf/phien-pdf";
import { ghiNhatKy } from "@/lib/nhat-ky";

export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ phienId: string }> }) {
  const { phienId } = await params;
  const user = await requireRole("truong_khoa", "admin", "ban_giam_doc");
  const phien = await getPhienOrNotFound(phienId, user);
  const kemAnh = request.nextUrl.searchParams.get("anh") === "1";
  const d = await napDuLieuPhien(phien.id);
  await ghiNhatKy("xuat_file", "pdf_phien", { id: phien.id, khoaId: phien.khoa_id, chiTiet: { kem_anh: kemAnh } });
  const pdf = await taoPdfPhien(d, kemAnh ? await taiAnhPhien(phien.id) : []);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bang-kiem-di-buong-${phien.ngay_bao_cao}.pdf"`,
    },
  });
}
