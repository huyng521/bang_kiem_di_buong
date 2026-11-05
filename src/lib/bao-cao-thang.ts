import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BaoCaoTheoMucRow, CauHinhHeThong, ThongKeKhacPhucRow } from "@/types/database";

export interface BaoCaoThang {
  thang: string; // YYYY-MM
  tu: string;
  den: string;
  tenKhoa: string; // "Toàn viện" nếu không lọc
  cauHinh: CauHinhHeThong | null;
  logo: Buffer | null;
  theoKhoa: { ten_khoa: string; so_phien: number; tong_muc_ap_dung: number; so_dat: number; ty_le_dat: number | null }[];
  theoMuc: BaoCaoTheoMucRow[];
  topKhongDat: BaoCaoTheoMucRow[];
  khacPhuc: (ThongKeKhacPhucRow & { ten_khoa: string })[];
  tyLeChung: number | null;
}

export function khoangThang(thang: string): { tu: string; den: string } {
  const [y, m] = thang.split("-").map(Number);
  const cuoi = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { tu: `${thang}-01`, den: `${thang}-${String(cuoi).padStart(2, "0")}` };
}

/** Số liệu báo cáo tháng — tất cả lấy từ hàm SQL dùng công thức tỷ lệ đạt chung. */
export async function napBaoCaoThang(thang: string, khoaId: string | null): Promise<BaoCaoThang> {
  const supabase = await createClient();
  const { tu, den } = khoangThang(thang);
  const [{ data: theoKhoa }, { data: theoMuc }, { data: kp }, { data: dsKhoa }, { data: cauHinh }] = await Promise.all([
    supabase.rpc("bao_cao_ty_le_dat", { p_tu_ngay: tu, p_den_ngay: den }),
    supabase.rpc("bao_cao_ty_le_theo_muc", { p_tu: tu, p_den: den, p_khoa: khoaId }),
    supabase.rpc("thong_ke_khac_phuc", { p_tu: tu, p_den: den }),
    supabase.from("khoa").select("id, ten_khoa"),
    supabase.from("cau_hinh_he_thong").select("*").eq("id", 1).maybeSingle(),
  ]);
  const ten = new Map((dsKhoa ?? []).map((k) => [k.id, k.ten_khoa]));
  const khoaLoc = (theoKhoa ?? []).filter((r) => !khoaId || r.khoa_id === khoaId);
  const dat = khoaLoc.reduce((s, r) => s + Number(r.so_dat), 0);
  const apDung = khoaLoc.reduce((s, r) => s + Number(r.tong_muc_ap_dung), 0);
  let logo: Buffer | null = null;
  if (cauHinh?.logo_path) {
    const { data: f } = await supabase.storage.from("he-thong").download(cauHinh.logo_path);
    if (f) logo = Buffer.from(await f.arrayBuffer());
  }
  const muc = (theoMuc ?? []).map((r) => ({ ...r, ty_le_dat: r.ty_le_dat === null ? null : Number(r.ty_le_dat) }));
  return {
    thang, tu, den,
    tenKhoa: khoaId ? ten.get(khoaId) ?? "" : "Toàn viện",
    cauHinh: cauHinh ?? null,
    logo,
    theoKhoa: khoaLoc.map((r) => ({ ten_khoa: r.ten_khoa, so_phien: Number(r.so_phien), tong_muc_ap_dung: Number(r.tong_muc_ap_dung), so_dat: Number(r.so_dat), ty_le_dat: r.ty_le_dat === null ? null : Number(r.ty_le_dat) })),
    theoMuc: muc,
    topKhongDat: [...muc].filter((r) => Number(r.so_khong_dat) > 0).sort((a, b) => Number(b.so_khong_dat) - Number(a.so_khong_dat)).slice(0, 10),
    khacPhuc: (kp ?? []).filter((r) => !khoaId || r.khoa_id === khoaId).map((r) => ({ ...r, ten_khoa: ten.get(r.khoa_id) ?? "" })),
    // Tỷ lệ chung = tổng đạt / tổng áp dụng (cùng công thức), làm tròn 1 chữ số như hàm SQL.
    tyLeChung: apDung ? Math.round((1000 * dat) / apDung) / 10 : null,
  };
}
