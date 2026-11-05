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

  const giuongRaw = String(formData.get("so_giuong_ke_hoach") ?? "").trim();
  const soGiuong = giuongRaw === "" ? null : Number(giuongRaw);
  const supabase = await createClient();
  await supabase
    .from("khoa")
    .update({ ten_khoa: tenKhoa, so_giuong_ke_hoach: soGiuong !== null && Number.isInteger(soGiuong) && soGiuong >= 0 ? soGiuong : null })
    .eq("id", khoaId);
  revalidatePath("/admin/khoa");
}

export async function doiTrangThaiKhoa(khoaId: string, active: boolean) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("khoa").update({ active }).eq("id", khoaId);
  revalidatePath("/admin/khoa");
}
