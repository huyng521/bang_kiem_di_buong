"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, phienCoTheSua } from "@/lib/phien";

export async function capNhatThongTinPhong(
  phienId: string,
  phienKiemTraPhongId: string,
  formData: FormData
) {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  if (!phienCoTheSua(phien, user.nguoiDung.vai_tro)) return;

  const tenDd = String(formData.get("ten_dd_phu_trach") ?? "").trim();
  const tongSoRaw = String(formData.get("tong_so_nguoi_benh") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("phien_kiem_tra_phong")
    .update({
      ten_dd_phu_trach: tenDd || null,
      tong_so_nguoi_benh: tongSoRaw === "" ? null : Number(tongSoRaw),
    })
    .eq("id", phienKiemTraPhongId);

  revalidatePath(`/di-buong/${phienId}/phong`);
}
