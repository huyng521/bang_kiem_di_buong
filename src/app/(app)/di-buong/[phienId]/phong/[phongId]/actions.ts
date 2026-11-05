"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, phienCoTheSua } from "@/lib/phien";
import type { TrangThaiKq } from "@/types/database";
import { BUCKET_ANH, kyDuongDanAnh } from "@/lib/anh-server";

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

// ---------------- Ảnh minh chứng cho một ô kết quả (mục × phòng) ----------------

async function layHoacTaoKetQua(phienKiemTraPhongId: string, checklistItemId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: co } = await supabase
    .from("ket_qua_kiem_tra")
    .select("id")
    .eq("phien_kiem_tra_phong_id", phienKiemTraPhongId)
    .eq("checklist_item_id", checklistItemId)
    .maybeSingle();
  if (co) return co.id;
  // Ô chưa chấm: tạo dòng kết quả trống (trang_thai NULL) để gắn ảnh, không tự đặt "Đạt".
  const { data: moi } = await supabase
    .from("ket_qua_kiem_tra")
    .insert({ phien_kiem_tra_phong_id: phienKiemTraPhongId, checklist_item_id: checklistItemId })
    .select("id")
    .single();
  return moi?.id ?? null;
}

export async function chuanBiTaiAnh(phienId: string): Promise<{ path: string; bucket: string } | { loi: string }> {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  if (!phienCoTheSua(phien, user.nguoiDung.vai_tro)) return { loi: "Phiên đã khóa, không thêm ảnh được." };
  return { bucket: BUCKET_ANH, path: `${phien.khoa_id}/${phien.id}/${crypto.randomUUID()}.jpg` };
}

export async function ghiNhanAnhKetQua(
  phienId: string,
  phienKiemTraPhongId: string,
  checklistItemId: string,
  path: string,
  tenFile: string,
  kichThuoc: number,
): Promise<{ id: string; url: string } | { loi: string }> {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  if (!path.startsWith(`${phien.khoa_id}/${phien.id}/`)) return { loi: "Đường dẫn ảnh không hợp lệ." };
  const ketQuaId = await layHoacTaoKetQua(phienKiemTraPhongId, checklistItemId);
  if (!ketQuaId) return { loi: "Không có quyền thêm ảnh vào ô này." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("minh_chung_anh")
    .insert({ ket_qua_kiem_tra_id: ketQuaId, storage_path: path, ten_file: tenFile.slice(0, 200), kich_thuoc_byte: kichThuoc })
    .select("id, storage_path, ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id, loai")
    .single();
  if (error || !data) {
    await supabase.storage.from(BUCKET_ANH).remove([path]);
    return { loi: error?.message.includes("tối đa") ? "Mỗi ô chỉ được tối đa 5 ảnh." : "Không lưu được ảnh." };
  }
  const [anh] = await kyDuongDanAnh([data]);
  revalidatePath(`/di-buong/${phienId}`);
  return { id: anh.id, url: anh.url };
}

export async function xoaAnh(phienId: string, anhId: string): Promise<void> {
  await requireRole("truong_khoa", "admin");
  const supabase = await createClient();
  const { data } = await supabase.from("minh_chung_anh").delete().eq("id", anhId).select("storage_path").maybeSingle();
  if (data) await supabase.storage.from(BUCKET_ANH).remove([data.storage_path]);
  revalidatePath(`/di-buong/${phienId}`);
}
