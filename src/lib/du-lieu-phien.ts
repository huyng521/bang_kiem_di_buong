import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_ANH } from "@/lib/anh-server";
import { laQuaHan } from "@/lib/khac-phuc";
import type { DongKhacPhuc } from "@/lib/khac-phuc-server";
import { homNayVN } from "@/lib/thoi-gian";
import type { CauHinhHeThong, PhienKiemTra, TrangThaiKq } from "@/types/database";

export interface DuLieuPhien {
  phien: PhienKiemTra;
  tenKhoa: string;
  nguoiBaoCao: string;
  cauHinh: CauHinhHeThong | null;
  logo: Buffer | null;
  phienBan: { ten: string; vanBan: string | null };
  phong: { pktpId: string; soPhong: string; tenDd: string | null; tongNb: number | null }[];
  muc: { id: string; stt: number; noiDung: string; ghiChuHuongDan: string | null }[];
  ketQua: Map<string, { trangThai: TrangThaiKq | null; ghiChu: string | null; id: string }>; // khóa: `${pktpId}:${itemId}`
  khacPhuc: DongKhacPhuc[];
}

export const khoaKq = (pktpId: string, itemId: string) => `${pktpId}:${itemId}`;

/** Nạp toàn bộ dữ liệu của một phiên để xuất file — luôn theo phiên bản bảng kiểm mà phiên đã dùng. */
export async function napDuLieuPhien(phienId: string): Promise<DuLieuPhien> {
  const supabase = await createClient();
  const { data: phien } = await supabase.from("phien_kiem_tra").select("*").eq("id", phienId).single();
  if (!phien) throw new Error("Không tìm thấy phiên kiểm tra.");

  const [{ data: khoa }, { data: nguoi }, { data: cauHinh }, { data: version }, { data: pktp }, { data: items }, { data: hd }] = await Promise.all([
    supabase.from("khoa").select("ten_khoa").eq("id", phien.khoa_id).maybeSingle(),
    supabase.from("nguoi_dung").select("ho_ten").eq("id", phien.nguoi_kiem_tra_id).maybeSingle(),
    supabase.from("cau_hinh_he_thong").select("*").eq("id", 1).maybeSingle(),
    supabase.from("checklist_version").select("*").eq("id", phien.checklist_version_id).maybeSingle(),
    supabase.from("phien_kiem_tra_phong").select("id, phong_benh_id, ten_dd_phu_trach, tong_so_nguoi_benh").eq("phien_kiem_tra_id", phienId),
    supabase.from("checklist_item").select("id, stt, noi_dung, ghi_chu_huong_dan, active").eq("checklist_version_id", phien.checklist_version_id).order("stt"),
    supabase.from("hanh_dong_khac_phuc").select("*").eq("phien_kiem_tra_id", phienId).order("created_at"),
  ]);

  const dsPktp = pktp ?? [];
  const [{ data: phongBenh }, { data: kq }] = await Promise.all([
    dsPktp.length ? supabase.from("phong_benh").select("id, so_phong").in("id", dsPktp.map((x) => x.phong_benh_id)) : Promise.resolve({ data: [] as { id: string; so_phong: string }[] }),
    dsPktp.length ? supabase.from("ket_qua_kiem_tra").select("id, phien_kiem_tra_phong_id, checklist_item_id, trang_thai, ghi_chu").in("phien_kiem_tra_phong_id", dsPktp.map((x) => x.id)) : Promise.resolve({ data: [] as { id: string; phien_kiem_tra_phong_id: string; checklist_item_id: string; trang_thai: TrangThaiKq | null; ghi_chu: string | null }[] }),
  ]);

  const ketQua = new Map<string, { trangThai: TrangThaiKq | null; ghiChu: string | null; id: string }>();
  const coKetQua = new Set<string>();
  for (const k of kq ?? []) {
    ketQua.set(khoaKq(k.phien_kiem_tra_phong_id, k.checklist_item_id), { trangThai: k.trang_thai, ghiChu: k.ghi_chu, id: k.id });
    if (k.trang_thai) coKetQua.add(k.checklist_item_id);
  }

  let logo: Buffer | null = null;
  if (cauHinh?.logo_path) {
    const { data: f } = await supabase.storage.from("he-thong").download(cauHinh.logo_path);
    if (f) logo = Buffer.from(await f.arrayBuffer());
  }

  const homNay = homNayVN();
  const sttTheoId = new Map((items ?? []).map((i) => [i.id, i.stt]));
  return {
    phien,
    tenKhoa: khoa?.ten_khoa ?? "",
    nguoiBaoCao: nguoi?.ho_ten ?? "",
    cauHinh: cauHinh ?? null,
    logo,
    phienBan: { ten: version?.ten_phien_ban ?? "", vanBan: version?.ghi_chu_van_ban_can_cu ?? null },
    phong: dsPktp
      .map((x) => ({ pktpId: x.id, soPhong: phongBenh?.find((p) => p.id === x.phong_benh_id)?.so_phong ?? "", tenDd: x.ten_dd_phu_trach, tongNb: x.tong_so_nguoi_benh }))
      .sort((a, b) => a.soPhong.localeCompare(b.soPhong, "vi", { numeric: true })),
    // Mục của đúng phiên bản; mục đã ẩn sau này vẫn hiện nếu phiên đã chấm.
    muc: (items ?? []).filter((i) => i.active || coKetQua.has(i.id)).map((i) => ({ id: i.id, stt: i.stt, noiDung: i.noi_dung, ghiChuHuongDan: i.ghi_chu_huong_dan })),
    ketQua,
    khacPhuc: (hd ?? []).map((h) => ({ ...h, ten_khoa: khoa?.ten_khoa ?? "", stt_muc: sttTheoId.get(h.checklist_item_id) ?? null, ngay_phien: phien.ngay_bao_cao, qua_han: laQuaHan(h, homNay) })),
  };
}

/** Ảnh của phiên (dạng nhị phân) cho phụ lục PDF. */
export async function taiAnhPhien(phienId: string): Promise<{ data: Buffer; loai: "kiem_tra" | "khac_phuc"; ketQuaId: string | null; hanhDongId: string | null }[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("minh_chung_anh")
    .select("storage_path, ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id, loai, thoi_gian_tai_len")
    .eq("phien_kiem_tra_id", phienId)
    .order("thoi_gian_tai_len")
    .limit(60);
  const out: { data: Buffer; loai: "kiem_tra" | "khac_phuc"; ketQuaId: string | null; hanhDongId: string | null }[] = [];
  for (const r of rows ?? []) {
    const { data: f } = await supabase.storage.from(BUCKET_ANH).download(r.storage_path);
    if (f) out.push({ data: Buffer.from(await f.arrayBuffer()), loai: r.loai, ketQuaId: r.ket_qua_kiem_tra_id, hanhDongId: r.hanh_dong_khac_phuc_id });
  }
  return out;
}

export const KY_HIEU: Record<TrangThaiKq, string> = { dat_co: "Đ", khong_dat: "KĐ", khong_co_bo_chuan: "K" };
