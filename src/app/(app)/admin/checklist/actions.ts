"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function suaMucKiemTra(itemId: string, formData: FormData) {
  await requireRole("admin");
  const noiDung = String(formData.get("noi_dung") ?? "").trim();
  const ghiChu = String(formData.get("ghi_chu_huong_dan") ?? "").trim();
  if (!noiDung) return;

  const supabase = await createClient();
  await supabase
    .from("checklist_item")
    .update({ noi_dung: noiDung, ghi_chu_huong_dan: ghiChu || null })
    .eq("id", itemId);

  revalidatePath("/admin/checklist");
}

export async function themMucKiemTra(versionId: string, formData: FormData) {
  await requireRole("admin");
  const noiDung = String(formData.get("noi_dung") ?? "").trim();
  if (!noiDung) return;

  const supabase = await createClient();
  const { data: max } = await supabase
    .from("checklist_item")
    .select("stt")
    .eq("checklist_version_id", versionId)
    .order("stt", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("checklist_item").insert({
    checklist_version_id: versionId,
    stt: (max?.stt ?? 0) + 1,
    noi_dung: noiDung,
  });

  revalidatePath("/admin/checklist");
}

export async function doiTrangThaiMuc(itemId: string, active: boolean) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("checklist_item").update({ active }).eq("id", itemId);
  revalidatePath("/admin/checklist");
}
