import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Mở một thông báo: đánh dấu đã đọc rồi chuyển tới trang liên quan.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("thong_bao").update({ da_doc: true }).eq("id", id).select("lien_ket").maybeSingle();
  const dich = data?.lien_ket && data.lien_ket.startsWith("/") ? data.lien_ket : "/thong-bao";
  return NextResponse.redirect(new URL(dich, request.url));
}
