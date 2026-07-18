"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, phienCoTheSua } from "@/lib/phien";
import type { TrangThaiKq } from "@/types/database";

export async function chamMucKiemTra(
  phienId: string,
  phienKiemTraPhongId: string,
  checklistItemId: string,
  trangThai: TrangThaiKq,
  ghiChu: string
) {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  if (!phienCoTheSua(phien, user.nguoiDung.vai_tro)) {
    throw new Error("Phiên đã hoàn thành, không thể sửa.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ket_qua_kiem_tra").upsert(
    {
      phien_kiem_tra_phong_id: phienKiemTraPhongId,
      checklist_item_id: checklistItemId,
      trang_thai: trangThai,
      ghi_chu: ghiChu.trim() || null,
    },
    { onConflict: "phien_kiem_tra_phong_id,checklist_item_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/di-buong/${phienId}/phong`);
}
