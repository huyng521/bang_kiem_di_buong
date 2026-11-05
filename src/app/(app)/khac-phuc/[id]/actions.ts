"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_ANH, kyDuongDanAnh } from "@/lib/anh-server";
import type { MucUuTien, TrangThaiKhacPhuc } from "@/types/database";

export async function capNhatHanhDong(id: string, formData: FormData) {
  await requireRole("truong_khoa", "admin");
  const supabase = await createClient();
  const uuTien = String(formData.get("muc_uu_tien") ?? "trung_binh") as MucUuTien;
  await supabase
    .from("hanh_dong_khac_phuc")
    .update({
      mo_ta_van_de: String(formData.get("mo_ta_van_de") ?? "").trim() || undefined,
      bien_phap: String(formData.get("bien_phap") ?? "").trim() || null,
      nguoi_phu_trach: String(formData.get("nguoi_phu_trach") ?? "").trim() || null,
      han_xu_ly: String(formData.get("han_xu_ly") ?? "") || null,
      muc_uu_tien: ["thap", "trung_binh", "cao"].includes(uuTien) ? uuTien : "trung_binh",
      ghi_chu_khac_phuc: String(formData.get("ghi_chu_khac_phuc") ?? "").trim() || null,
    })
    .eq("id", id);
  revalidatePath(`/khac-phuc/${id}`);
}

export interface DoiTrangThaiState { loi?: string }

export async function doiTrangThai(id: string, den: TrangThaiKhacPhuc, _prev: DoiTrangThaiState, formData: FormData): Promise<DoiTrangThaiState> {
  await requireRole("truong_khoa", "admin");
  const supabase = await createClient();
  const patch: { trang_thai: TrangThaiKhacPhuc; ly_do_huy?: string; ghi_chu_khac_phuc?: string } = { trang_thai: den };
  const lyDo = String(formData.get("ly_do_huy") ?? "").trim();
  const ghiChu = String(formData.get("ghi_chu_khac_phuc") ?? "").trim();
  if (den === "huy") {
    if (!lyDo) return { loi: "Vui lòng ghi lý do hủy." };
    patch.ly_do_huy = lyDo;
  }
  if (ghiChu) patch.ghi_chu_khac_phuc = ghiChu;
  const { error, data } = await supabase.from("hanh_dong_khac_phuc").update(patch).eq("id", id).select("id");
  if (error) return { loi: error.message };
  if (!data?.length) return { loi: "Bạn không có quyền đổi trạng thái hành động này." };
  revalidatePath(`/khac-phuc/${id}`);
  revalidatePath("/khac-phuc");
  return {};
}

export async function chuanBiAnhKhacPhuc(id: string): Promise<{ path: string; bucket: string } | { loi: string }> {
  await requireRole("truong_khoa", "admin");
  const supabase = await createClient();
  const { data } = await supabase.from("hanh_dong_khac_phuc").select("khoa_id").eq("id", id).maybeSingle();
  if (!data) return { loi: "Không tìm thấy hành động." };
  return { bucket: BUCKET_ANH, path: `${data.khoa_id}/${id}/${crypto.randomUUID()}.jpg` };
}

export async function ghiNhanAnhKhacPhuc(id: string, path: string, ten: string, kichThuoc: number): Promise<{ id: string; url: string } | { loi: string }> {
  await requireRole("truong_khoa", "admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("minh_chung_anh")
    .insert({ hanh_dong_khac_phuc_id: id, loai: "khac_phuc", storage_path: path, ten_file: ten.slice(0, 200), kich_thuoc_byte: kichThuoc })
    .select("id, storage_path, ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id, loai")
    .single();
  if (error || !data) {
    await supabase.storage.from(BUCKET_ANH).remove([path]);
    return { loi: error?.message.includes("tối đa") ? "Tối đa 5 ảnh." : "Không lưu được ảnh." };
  }
  const [a] = await kyDuongDanAnh([data]);
  revalidatePath(`/khac-phuc/${id}`);
  return { id: a.id, url: a.url };
}

export async function xoaAnhKhacPhuc(id: string, anhId: string) {
  await requireRole("truong_khoa", "admin");
  const supabase = await createClient();
  const { data } = await supabase.from("minh_chung_anh").delete().eq("id", anhId).select("storage_path").maybeSingle();
  if (data) await supabase.storage.from(BUCKET_ANH).remove([data.storage_path]);
  revalidatePath(`/khac-phuc/${id}`);
}
