"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const sua = (id: string) => revalidatePath(`/admin/checklist/${id}`);

export async function taoPhienBanMoi(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tao_phien_ban_moi", { p_ten: String(formData.get("ten") ?? "") });
  if (error || !data) redirect(`/admin/checklist?loi=${encodeURIComponent(error?.message ?? "Không tạo được")}`);
  redirect(`/admin/checklist/${data}`);
}

export async function doiTenBanNhap(versionId: string, formData: FormData) {
  await requireRole("admin");
  const ten = String(formData.get("ten") ?? "").trim();
  if (!ten) return;
  const supabase = await createClient();
  await supabase.from("checklist_version").update({ ten_phien_ban: ten }).eq("id", versionId).eq("trang_thai", "nhap");
  sua(versionId);
}

export async function xoaBanNhap(versionId: string) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("checklist_item").delete().eq("checklist_version_id", versionId);
  await supabase.from("checklist_version").delete().eq("id", versionId).eq("trang_thai", "nhap");
  revalidatePath("/admin/checklist");
  redirect("/admin/checklist");
}

export interface KetQua { loi?: string }

/** Sửa một mục trong bản nháp. capMaMoi = true: đây là tiêu chí mới, cấp mã mới. */
export async function luuMuc(versionId: string, itemId: string, noiDung: string, ghiChu: string, capMaMoi: boolean): Promise<KetQua> {
  await requireRole("admin");
  if (!noiDung.trim()) return { loi: "Nội dung không được để trống." };
  const supabase = await createClient();
  const patch: { noi_dung: string; ghi_chu_huong_dan: string | null; ma_muc_goc?: string } = { noi_dung: noiDung.trim(), ghi_chu_huong_dan: ghiChu.trim() || null };
  if (capMaMoi) {
    const { data: ma } = await supabase.rpc("ma_muc_moi", {});
    if (ma) patch.ma_muc_goc = ma;
  }
  const { error } = await supabase.from("checklist_item").update(patch).eq("id", itemId);
  if (error) return { loi: error.message };
  sua(versionId);
  return {};
}

export async function themMuc(versionId: string, noiDung: string, ghiChu: string): Promise<KetQua> {
  await requireRole("admin");
  if (!noiDung.trim()) return { loi: "Nhập nội dung mục." };
  const supabase = await createClient();
  const [{ data: ma }, { data: max }] = await Promise.all([
    supabase.rpc("ma_muc_moi", {}),
    supabase.from("checklist_item").select("stt").eq("checklist_version_id", versionId).order("stt", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { error } = await supabase.from("checklist_item").insert({
    checklist_version_id: versionId, stt: (max?.stt ?? 0) + 1, noi_dung: noiDung.trim(), ghi_chu_huong_dan: ghiChu.trim() || null, ma_muc_goc: ma ?? undefined, active: true,
  });
  if (error) return { loi: error.message };
  sua(versionId);
  return {};
}

export async function boMuc(versionId: string, itemId: string): Promise<KetQua> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_item").delete().eq("id", itemId);
  if (error) return { loi: error.message };
  const { data: con } = await supabase.from("checklist_item").select("id").eq("checklist_version_id", versionId).order("stt");
  await supabase.rpc("sap_xep_muc", { p_version: versionId, p_ids: (con ?? []).map((x) => x.id) });
  sua(versionId);
  return {};
}

export async function sapXep(versionId: string, ids: string[]): Promise<KetQua> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("sap_xep_muc", { p_version: versionId, p_ids: ids });
  if (error) return { loi: error.message };
  sua(versionId);
  return {};
}

export async function congBo(versionId: string, _prev: KetQua, formData: FormData): Promise<KetQua> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cong_bo_phien_ban", {
    p_id: versionId,
    p_so_hieu: String(formData.get("so_hieu") ?? ""),
    p_ngay_ban_hanh: String(formData.get("ngay_ban_hanh") ?? ""),
    p_trich_yeu: String(formData.get("trich_yeu") ?? ""),
    p_ngay_hieu_luc: String(formData.get("ngay_hieu_luc") ?? ""),
  });
  if (error) return { loi: error.message };
  revalidatePath("/admin/checklist");
  redirect(`/admin/checklist/${versionId}?da_cong_bo=1`);
}
