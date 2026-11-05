import "server-only";
import { createClient } from "@/lib/supabase/server";
import { congNgay } from "@/lib/thoi-gian";

export interface LocNhatKy { nguoi?: string; khoa?: string; hanh_dong?: string; loai?: string; tu?: string; den?: string; trang?: string }
export const MOI_TRANG = 50;

/** Truy vấn nhật ký theo bộ lọc; khoảng ngày theo giờ Việt Nam (UTC+7). */
export async function truyVanNhatKy(loc: LocNhatKy, phanTrang: { tu: number; den: number }) {
  const supabase = await createClient();
  let q = supabase.from("audit_log").select("*", { count: "exact" }).order("thoi_gian", { ascending: false }).range(phanTrang.tu, phanTrang.den);
  if (loc.nguoi) q = q.eq("nguoi_dung_id", loc.nguoi);
  if (loc.khoa) q = q.eq("khoa_id", loc.khoa);
  if (loc.hanh_dong) q = q.eq("hanh_dong", loc.hanh_dong);
  if (loc.loai) q = q.eq("doi_tuong_loai", loc.loai);
  if (loc.tu) q = q.gte("thoi_gian", `${loc.tu}T00:00:00+07:00`);
  if (loc.den) q = q.lt("thoi_gian", `${congNgay(loc.den, 1)}T00:00:00+07:00`);
  return q;
}

export function tomTatThayDoi(cu: Record<string, unknown> | null, moi: Record<string, unknown> | null): string {
  const bo = new Set(["id", "created_at", "updated_at"]);
  const khoa = [...new Set([...Object.keys(cu ?? {}), ...Object.keys(moi ?? {})])].filter((k) => !bo.has(k));
  const gt = (v: unknown) => (v === null || v === undefined ? "∅" : typeof v === "object" ? JSON.stringify(v) : String(v)).slice(0, 60);
  return khoa.slice(0, 8).map((k) => (cu && moi ? `${k}: ${gt(cu[k])} → ${gt(moi[k])}` : `${k}: ${gt((moi ?? cu)![k])}`)).join(" · ");
}
