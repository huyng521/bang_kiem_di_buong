import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getPhienOrNotFound } from "@/lib/phien";
import { xuatExcelPhien } from "@/lib/excel";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phienId: string }> }
) {
  const { phienId } = await params;
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);

  const buffer = await xuatExcelPhien(phien.id);
  const tenFile = `bang-kiem-di-buong-${phien.ngay_bao_cao}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tenFile}"`,
    },
  });
}
