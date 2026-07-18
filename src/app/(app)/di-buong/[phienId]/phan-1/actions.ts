"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, phienCoTheSua } from "@/lib/phien";
import { PHAN_1_FIELDS_BAT_BUOC, type PhienKiemTra } from "@/types/database";

export interface LuuPhan1State {
  loi?: string;
}

const SO_NGUYEN_BAT_BUOC = [
  "tong_so_nb_thuc_te",
  "so_nb_cap_1",
  "so_nb_cap_2",
  "so_nb_cap_3",
  "so_giuong_dv_trong",
  "so_giuong_thuong_trong",
  "so_nb_nam_bang_ca",
  "tong_so_dd_co_huu",
  "so_dd_dang_cong_tac_trong_ngay",
  "so_dd_ra_truc",
  "so_dd_nghi_bu_nghi_phep",
  "so_dd_nghi_che_do",
] as const;

export async function luuPhan1(
  phienId: string,
  _prev: LuuPhan1State,
  formData: FormData
): Promise<LuuPhan1State> {
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);

  if (!phienCoTheSua(phien, user.nguoiDung.vai_tro)) {
    return { loi: "Phiên đã hoàn thành, không thể sửa." };
  }

  const ngayBaoCao = String(formData.get("ngay_bao_cao") ?? "");
  if (!ngayBaoCao) return { loi: "Vui lòng chọn ngày báo cáo." };

  const capNhat: Partial<PhienKiemTra> = {
    ngay_bao_cao: ngayBaoCao,
    dd_uy_quyen_khi_vang_mat: String(formData.get("dd_uy_quyen_khi_vang_mat") ?? "").trim() || null,
    y_kien_van_de_nguoi_benh: phien.y_kien_van_de_nguoi_benh,
    bien_phap_khac_phuc: phien.bien_phap_khac_phuc,
  };

  for (const field of SO_NGUYEN_BAT_BUOC) {
    const raw = String(formData.get(field) ?? "").trim();
    if (raw === "") {
      return { loi: "Vui lòng nhập đầy đủ các trường bắt buộc (có thể nhập 0)." };
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      return { loi: "Các trường số phải là số nguyên không âm." };
    }
    capNhat[field] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("phien_kiem_tra").update(capNhat).eq("id", phienId);

  if (error) {
    return { loi: "Không lưu được: " + error.message };
  }

  const daDayDu = PHAN_1_FIELDS_BAT_BUOC.every(
    (f) => capNhat[f] !== undefined && capNhat[f] !== null
  );
  if (!daDayDu) {
    return { loi: "Còn thiếu trường bắt buộc." };
  }

  revalidatePath(`/di-buong/${phienId}`);
  redirect(`/di-buong/${phienId}/phong`);
}
