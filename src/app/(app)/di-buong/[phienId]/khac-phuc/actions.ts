"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound } from "@/lib/phien";
import type { MucUuTien } from "@/types/database";

const UU_TIEN: MucUuTien[] = ["thap", "trung_binh", "cao"];

export async function taoHanhDong(phienId: string, itemId: string, formData: FormData) {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  const supabase = await createClient();

  const moTa = String(formData.get("mo_ta_van_de") ?? "").trim();
  if (!moTa) return;
  const uuTien = String(formData.get("muc_uu_tien") ?? "trung_binh") as MucUuTien;

  const { data: hd } = await supabase
    .from("hanh_dong_khac_phuc")
    .insert({
      khoa_id: phien.khoa_id,
      phien_kiem_tra_id: phien.id,
      checklist_item_id: itemId,
      mo_ta_van_de: moTa,
      bien_phap: String(formData.get("bien_phap") ?? "").trim() || null,
      nguoi_phu_trach: String(formData.get("nguoi_phu_trach") ?? "").trim() || null,
      han_xu_ly: String(formData.get("han_xu_ly") ?? "") || null,
      muc_uu_tien: UU_TIEN.includes(uuTien) ? uuTien : "trung_binh",
    })
    .select("id")
    .single();
  if (!hd) return;

  // Gắn tất cả các phòng "Không đạt" của mục này trong phiên.
  const { data: pp } = await supabase.from("phien_kiem_tra_phong").select("id").eq("phien_kiem_tra_id", phien.id);
  const { data: kq } = await supabase
    .from("ket_qua_kiem_tra")
    .select("id")
    .in("phien_kiem_tra_phong_id", (pp ?? []).map((x) => x.id))
    .eq("checklist_item_id", itemId)
    .eq("trang_thai", "khong_dat");
  if (kq?.length) {
    await supabase.from("hanh_dong_khac_phuc_ket_qua").insert(kq.map((k) => ({ hanh_dong_id: hd.id, ket_qua_kiem_tra_id: k.id })));
  }
  await supabase.from("khac_phuc_bo_qua").delete().eq("phien_kiem_tra_id", phien.id).eq("checklist_item_id", itemId);
  revalidatePath(`/di-buong/${phienId}/khac-phuc`);
}

export async function boQuaMuc(phienId: string, itemId: string) {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  const supabase = await createClient();
  await supabase.from("khac_phuc_bo_qua").insert({ phien_kiem_tra_id: phien.id, checklist_item_id: itemId, khoa_id: phien.khoa_id });
  revalidatePath(`/di-buong/${phienId}/khac-phuc`);
}

export async function huyBoQua(phienId: string, itemId: string) {
  await requireRole("truong_khoa", "admin");
  const supabase = await createClient();
  await supabase.from("khac_phuc_bo_qua").delete().eq("phien_kiem_tra_id", phienId).eq("checklist_item_id", itemId);
  revalidatePath(`/di-buong/${phienId}/khac-phuc`);
}
