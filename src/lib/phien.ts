import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";
import { PHAN_1_FIELDS_BAT_BUOC, type PhienKiemTra } from "@/types/database";

/** Lấy 1 phiên kiểm tra theo id, đảm bảo user hiện tại có quyền xem (RLS đã chặn ở DB,
 * hàm này chỉ để trả 404 rõ ràng thay vì lỗi khó hiểu). */
export async function getPhienOrNotFound(
  phienId: string,
  _user: CurrentUser
): Promise<PhienKiemTra> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phien_kiem_tra")
    .select("*")
    .eq("id", phienId)
    .maybeSingle();

  if (error || !data) notFound();
  return data;
}

export function phan1DaDayDu(phien: PhienKiemTra): boolean {
  return PHAN_1_FIELDS_BAT_BUOC.every((field) => {
    const value = phien[field];
    return value !== null && value !== undefined;
  });
}

export function phienCoTheSua(phien: PhienKiemTra, vaiTro: string): boolean {
  return vaiTro === "admin" || phien.trang_thai === "draft";
}

/** Lấy (hoặc tạo mới nếu phiên còn draft) dòng phien_kiem_tra_phong cho 1 phòng cụ thể. */
export async function layHoacTaoPhienKiemTraPhong(
  phien: PhienKiemTra,
  phongBenhId: string
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("phien_kiem_tra_phong")
    .select("*")
    .eq("phien_kiem_tra_id", phien.id)
    .eq("phong_benh_id", phongBenhId)
    .maybeSingle();

  if (existing) return existing;
  if (phien.trang_thai !== "draft") notFound();

  const { data: created, error } = await supabase
    .from("phien_kiem_tra_phong")
    .insert({ phien_kiem_tra_id: phien.id, phong_benh_id: phongBenhId })
    .select("*")
    .single();

  if (error || !created) notFound();
  return created;
}

export interface PhongVoiTienDo {
  phongBenh: { id: string; so_phong: string };
  phienKiemTraPhongId: string;
  tenDdPhuTrach: string | null;
  tongSoNguoiBenh: number | null;
  soMucDaCham: number;
  tongMuc: number;
}

/**
 * Trả về danh sách phòng của khoa kèm tiến độ chấm điểm trong phiên hiện tại.
 * Nếu phiên còn draft, tự tạo phien_kiem_tra_phong cho các phòng chưa có.
 */
export async function layDanhSachPhongTheoTienDo(
  phien: PhienKiemTra
): Promise<PhongVoiTienDo[]> {
  const supabase = await createClient();

  const { data: dsPhong } = await supabase
    .from("phong_benh")
    .select("id, so_phong")
    .eq("khoa_id", phien.khoa_id)
    .eq("active", true)
    .order("so_phong");

  const { count: tongMuc } = await supabase
    .from("checklist_item")
    .select("id", { count: "exact", head: true })
    .eq("checklist_version_id", phien.checklist_version_id)
    .eq("active", true);

  const { data: dsPhienPhong } = await supabase
    .from("phien_kiem_tra_phong")
    .select("id, phong_benh_id, ten_dd_phu_trach, tong_so_nguoi_benh")
    .eq("phien_kiem_tra_id", phien.id);

  const theoPhongBenhId = new Map((dsPhienPhong ?? []).map((p) => [p.phong_benh_id, p]));

  const phongThieu = (dsPhong ?? []).filter((p) => !theoPhongBenhId.has(p.id));
  if (phien.trang_thai === "draft" && phongThieu.length > 0) {
    const { data: daTao } = await supabase
      .from("phien_kiem_tra_phong")
      .insert(
        phongThieu.map((p) => ({ phien_kiem_tra_id: phien.id, phong_benh_id: p.id }))
      )
      .select("id, phong_benh_id, ten_dd_phu_trach, tong_so_nguoi_benh");
    for (const row of daTao ?? []) {
      theoPhongBenhId.set(row.phong_benh_id, row);
    }
  }

  const idsPhienPhong = Array.from(theoPhongBenhId.values()).map((p) => p.id);
  const { data: dsKetQua } = idsPhienPhong.length
    ? await supabase
        .from("ket_qua_kiem_tra")
        .select("phien_kiem_tra_phong_id, trang_thai")
        .in("phien_kiem_tra_phong_id", idsPhienPhong)
        .not("trang_thai", "is", null)
    : { data: [] as { phien_kiem_tra_phong_id: string; trang_thai: string | null }[] };

  const soDaChamTheoPhong = new Map<string, number>();
  for (const kq of dsKetQua ?? []) {
    soDaChamTheoPhong.set(
      kq.phien_kiem_tra_phong_id,
      (soDaChamTheoPhong.get(kq.phien_kiem_tra_phong_id) ?? 0) + 1
    );
  }

  return (dsPhong ?? []).map((p) => {
    const pp = theoPhongBenhId.get(p.id)!;
    return {
      phongBenh: p,
      phienKiemTraPhongId: pp.id,
      tenDdPhuTrach: pp.ten_dd_phu_trach,
      tongSoNguoiBenh: pp.tong_so_nguoi_benh,
      soMucDaCham: soDaChamTheoPhong.get(pp.id) ?? 0,
      tongMuc: tongMuc ?? 35,
    };
  });
}
