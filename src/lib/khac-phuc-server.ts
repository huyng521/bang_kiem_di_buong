import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";
import { laQuaHan, TT_MO } from "@/lib/khac-phuc";
import { homNayVN } from "@/lib/thoi-gian";
import type { HanhDongKhacPhuc, MucUuTien, TrangThaiKhacPhuc } from "@/types/database";

export interface BoLocKhacPhuc {
  trang_thai?: string; // "mo" | "tat_ca" | một trạng thái
  uu_tien?: string;
  qua_han?: string;
  khoa?: string;
}

export interface DongKhacPhuc extends HanhDongKhacPhuc {
  ten_khoa: string;
  stt_muc: number | null;
  ngay_phien: string | null;
  qua_han: boolean;
}

/** Danh sách hành động theo bộ lọc; RLS đã giới hạn khoa theo vai trò. */
export async function layDanhSachKhacPhuc(user: CurrentUser, loc: BoLocKhacPhuc): Promise<DongKhacPhuc[]> {
  const supabase = await createClient();
  let q = supabase.from("hanh_dong_khac_phuc").select("*").order("han_xu_ly", { ascending: true, nullsFirst: false }).limit(1000);
  const tt = loc.trang_thai || "mo";
  if (tt === "mo") q = q.in("trang_thai", TT_MO);
  else if (tt !== "tat_ca") q = q.eq("trang_thai", tt as TrangThaiKhacPhuc);
  if (loc.uu_tien) q = q.eq("muc_uu_tien", loc.uu_tien as MucUuTien);
  if (loc.khoa && user.nguoiDung.vai_tro !== "truong_khoa") q = q.eq("khoa_id", loc.khoa);
  const { data } = await q;
  const ds = data ?? [];

  const [{ data: khoa }, { data: muc }, { data: phien }] = await Promise.all([
    supabase.from("khoa").select("id, ten_khoa"),
    ds.length ? supabase.from("checklist_item").select("id, stt").in("id", [...new Set(ds.map((h) => h.checklist_item_id))]) : Promise.resolve({ data: [] as { id: string; stt: number }[] }),
    ds.length ? supabase.from("phien_kiem_tra").select("id, ngay_bao_cao").in("id", [...new Set(ds.map((h) => h.phien_kiem_tra_id))]) : Promise.resolve({ data: [] as { id: string; ngay_bao_cao: string }[] }),
  ]);
  const homNay = homNayVN();
  const uuTienThuTu: Record<string, number> = { cao: 0, trung_binh: 1, thap: 2 };
  return ds
    .map((h) => ({
      ...h,
      ten_khoa: khoa?.find((k) => k.id === h.khoa_id)?.ten_khoa ?? "",
      stt_muc: muc?.find((m) => m.id === h.checklist_item_id)?.stt ?? null,
      ngay_phien: phien?.find((p) => p.id === h.phien_kiem_tra_id)?.ngay_bao_cao ?? null,
      qua_han: laQuaHan(h, homNay),
    }))
    .filter((h) => (loc.qua_han === "1" ? h.qua_han : true))
    .sort((a, b) => Number(b.qua_han) - Number(a.qua_han) || uuTienThuTu[a.muc_uu_tien] - uuTienThuTu[b.muc_uu_tien]);
}
