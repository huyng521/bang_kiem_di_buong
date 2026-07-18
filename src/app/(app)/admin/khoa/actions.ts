"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function themKhoa(formData: FormData) {
  await requireRole("admin");
  const tenKhoa = String(formData.get("ten_khoa") ?? "").trim();
  if (!tenKhoa) return;

  const supabase = await createClient();
  await supabase.from("khoa").insert({ ten_khoa: tenKhoa });
  revalidatePath("/admin/khoa");
}

export async function suaKhoa(khoaId: string, formData: FormData) {
  await requireRole("admin");
  const tenKhoa = String(formData.get("ten_khoa") ?? "").trim();
  if (!tenKhoa) return;

  const supabase = await createClient();
  await supabase.from("khoa").update({ ten_khoa: tenKhoa }).eq("id", khoaId);
  revalidatePath("/admin/khoa");
}

export async function doiTrangThaiKhoa(khoaId: string, active: boolean) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("khoa").update({ active }).eq("id", khoaId);
  revalidatePath("/admin/khoa");
}
