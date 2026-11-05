import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { taoPdfPhienBan } from "@/lib/pdf/phien-ban-pdf";
import { ghiNhatKy } from "@/lib/nhat-ky";

export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: v }, { data: muc }, { data: ch }] = await Promise.all([
    supabase.from("checklist_version").select("*").eq("id", id).maybeSingle(),
    supabase.from("checklist_item").select("*").eq("checklist_version_id", id).eq("active", true).order("stt"),
    supabase.from("cau_hinh_he_thong").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!v) return new NextResponse("Không tìm thấy", { status: 404 });
  let logo: Buffer | null = null;
  if (ch?.logo_path) { const { data: f } = await supabase.storage.from("he-thong").download(ch.logo_path); if (f) logo = Buffer.from(await f.arrayBuffer()); }
  await ghiNhatKy("xuat_file", "pdf_bang_kiem", { id });
  const pdf = await taoPdfPhienBan(v, muc ?? [], ch ?? null, logo);
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="bang-kiem-${encodeURIComponent(v.ten_phien_ban)}.pdf"` } });
}
