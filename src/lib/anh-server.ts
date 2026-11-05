import "server-only";
import { createClient } from "@/lib/supabase/server";

export const BUCKET_ANH = "minh-chung";

export interface AnhHienThi {
  id: string;
  url: string;
  ket_qua_kiem_tra_id: string | null;
  hanh_dong_khac_phuc_id: string | null;
  loai: "kiem_tra" | "khac_phuc";
}

/** Ảnh kèm đường dẫn ký có thời hạn (1 giờ). RLS + quy tắc Storage quyết định ai thấy ảnh nào. */
export async function kyDuongDanAnh(
  rows: { id: string; storage_path: string; ket_qua_kiem_tra_id: string | null; hanh_dong_khac_phuc_id: string | null; loai: "kiem_tra" | "khac_phuc" }[],
): Promise<AnhHienThi[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET_ANH).createSignedUrls(rows.map((r) => r.storage_path), 3600);
  const theoPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows
    .filter((r) => theoPath.get(r.storage_path))
    .map((r) => ({ id: r.id, url: theoPath.get(r.storage_path)!, ket_qua_kiem_tra_id: r.ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id: r.hanh_dong_khac_phuc_id, loai: r.loai }));
}

export async function layAnhCuaPhien(phienId: string): Promise<AnhHienThi[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("minh_chung_anh")
    .select("id, storage_path, ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id, loai")
    .eq("phien_kiem_tra_id", phienId)
    .order("thoi_gian_tai_len");
  return kyDuongDanAnh(data ?? []);
}
