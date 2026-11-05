"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CauHinhHeThong } from "@/types/database";

export interface CaiDatState { loi?: string; ok?: boolean }

export async function luuCaiDat(_prev: CaiDatState, formData: FormData): Promise<CaiDatState> {
  await requireRole("admin");
  const mucTieu = Number(formData.get("muc_tieu_ty_le_dat"));
  if (!Number.isFinite(mucTieu) || mucTieu < 0 || mucTieu > 100) return { loi: "Mục tiêu tỷ lệ đạt phải từ 0 đến 100." };
  const ngay = formData.getAll("ngay_di_buong").map(Number).filter((n) => n >= 1 && n <= 7);
  const gio = String(formData.get("gio_nhac_chua_di_buong") ?? "15:00");
  const supabase = await createClient();
  const patch: Partial<CauHinhHeThong> = {
    ten_benh_vien: String(formData.get("ten_benh_vien") ?? "").trim(),
    ten_don_vi_quan_ly: String(formData.get("ten_don_vi_quan_ly") ?? "").trim() || "Phòng Điều dưỡng",
    muc_tieu_ty_le_dat: mucTieu,
    ngay_di_buong: ngay,
    gio_nhac_chua_di_buong: /^\d{2}:\d{2}$/.test(gio) ? gio : "15:00",
    updated_at: new Date().toISOString(),
  };
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!["image/png", "image/jpeg"].includes(logo.type) || logo.size > 1024 * 1024) return { loi: "Logo phải là ảnh PNG/JPG dưới 1 MB." };
    const path = `logo-${Date.now()}.${logo.type === "image/png" ? "png" : "jpg"}`;
    const { error } = await supabase.storage.from("he-thong").upload(path, logo, { contentType: logo.type });
    if (error) return { loi: "Không tải được logo: " + error.message };
    patch.logo_path = path;
  }
  if (formData.get("xoa_logo") === "1") patch.logo_path = null;
  const { error } = await supabase.from("cau_hinh_he_thong").update(patch).eq("id", 1);
  if (error) return { loi: error.message };
  revalidatePath("/admin/cai-dat");
  return { ok: true };
}
