"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function themPhongBenh(formData: FormData) {
  await requireRole("admin");
  const khoaId = String(formData.get("khoa_id") ?? "");
  const soPhong = String(formData.get("so_phong") ?? "").trim();
  if (!khoaId || !soPhong) return;

  const supabase = await createClient();
  await supabase.from("phong_benh").insert({ khoa_id: khoaId, so_phong: soPhong });
  revalidatePath("/admin/phong-benh");
}

export async function suaPhongBenh(phongId: string, formData: FormData) {
  await requireRole("admin");
  const soPhong = String(formData.get("so_phong") ?? "").trim();
  if (!soPhong) return;

  const supabase = await createClient();
  await supabase.from("phong_benh").update({ so_phong: soPhong }).eq("id", phongId);
  revalidatePath("/admin/phong-benh");
}

export async function doiTrangThaiPhongBenh(phongId: string, active: boolean) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("phong_benh").update({ active }).eq("id", phongId);
  revalidatePath("/admin/phong-benh");
}
