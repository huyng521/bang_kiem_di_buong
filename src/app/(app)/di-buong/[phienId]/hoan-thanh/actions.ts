"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, phienCoTheSua } from "@/lib/phien";

export interface HoanThanhState {
  loi?: string;
}

export async function luuGhiChuChung(
  phienId: string,
  _prev: HoanThanhState,
  formData: FormData
): Promise<HoanThanhState> {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  if (!phienCoTheSua(phien, user.nguoiDung.vai_tro)) {
    return { loi: "Phiên đã hoàn thành, không thể sửa." };
  }

  const supabase = await createClient();
  await supabase
    .from("phien_kiem_tra")
    .update({
      y_kien_van_de_nguoi_benh: String(formData.get("y_kien_van_de_nguoi_benh") ?? "").trim() || null,
      bien_phap_khac_phuc: String(formData.get("bien_phap_khac_phuc") ?? "").trim() || null,
    })
    .eq("id", phienId);

  revalidatePath(`/di-buong/${phienId}`);
  return {};
}

export async function hoanThanhPhien(phienId: string) {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  if (!phienCoTheSua(phien, user.nguoiDung.vai_tro)) return;

  const supabase = await createClient();
  await supabase
    .from("phien_kiem_tra")
    .update({ trang_thai: "hoan_thanh", thoi_gian_hoan_thanh: new Date().toISOString() })
    .eq("id", phienId);

  revalidatePath("/di-buong");
  redirect(`/di-buong/${phienId}`);
}
