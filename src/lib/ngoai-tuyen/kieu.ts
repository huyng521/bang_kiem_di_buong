// Dữ liệu một phiên tải về máy để nhập khi mất mạng — chỉ số liệu vận hành, không có thông tin người bệnh.
import type { TrangThaiKq } from "@/types/database";

export interface AnhChup { id: string; url: string }

export interface BanSaoPhien {
  phienId: string;
  taiLuc: string;
  tenKhoa: string;
  nguoiBaoCao: string;
  coTheSua: boolean;
  phien: Record<string, string | number | null>;
  muc: { id: string; stt: number; noi_dung: string; ghi_chu_huong_dan: string | null }[];
  phong: { pktpId: string; soPhong: string; tenDd: string | null; tongNb: number | null }[];
  ketQua: Record<string, { tt: TrangThaiKq | null; gc: string | null; luc: string | null }>; // khóa `${pktpId}:${itemId}`
}

export type ThayDoi =
  | { loai: "ket_qua"; pktpId: string; itemId: string; tt: TrangThaiKq | null; gc: string | null; luc: string }
  | { loai: "phong"; pktpId: string; tenDd: string | null; tongNb: number | null; luc: string }
  | { loai: "phien"; truong: Record<string, string | number | null>; luc: string };

export interface MucHangDoi { id?: number; phienId: string; thayDoi: ThayDoi }
export interface AnhCho { id?: number; phienId: string; pktpId: string; itemId: string; blob: Blob; ten: string; luc: string }

export type KetQuaDongBo =
  | { trang_thai: "ap_dung" }
  | { trang_thai: "xung_dot"; may_chu?: { tt: TrangThaiKq | null; gc: string | null; luc: string } }
  | { trang_thai: "loi"; thong_bao: string };

// Các trường phiên được phép gửi lên khi đồng bộ (Phần I + ghi chú chung).
export const TRUONG_PHIEN_CHO_PHEP = [
  "ngay_bao_cao", "dd_uy_quyen_khi_vang_mat", "tong_so_nb_thuc_te", "so_nb_cap_1", "so_nb_cap_2", "so_nb_cap_3",
  "so_giuong_dv_trong", "so_giuong_thuong_trong", "so_nb_nam_bang_ca", "tong_so_dd_co_huu", "so_dd_dang_cong_tac_trong_ngay",
  "so_dd_ra_truc", "so_dd_nghi_bu_nghi_phep", "so_dd_nghi_che_do", "y_kien_van_de_nguoi_benh", "bien_phap_khac_phuc",
] as const;
