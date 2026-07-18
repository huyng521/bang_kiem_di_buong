// Kiểu dữ liệu tương ứng với schema Postgres ở supabase/schema.sql.
// Viết tay (không dùng `supabase gen types`) vì môi trường phát triển không có
// kết nối trực tiếp tới project Supabase thật.

export type VaiTro = "admin" | "truong_khoa" | "ban_giam_doc";
export type TrangThaiPhien = "draft" | "hoan_thanh";
export type TrangThaiKq = "dat_co" | "khong_dat" | "khong_co_bo_chuan";

// Dùng `type` (không dùng `interface`) cho các Row: interface không thỏa mãn
// kiểm tra `extends Record<string, unknown>` mà @supabase/supabase-js dùng để
// suy luận kiểu Database, khiến mọi thao tác .insert()/.update() bị suy ra
// thành `never`. Xem: https://github.com/supabase/postgrest-js — GenericTable.
export type Khoa = {
  id: string;
  ten_khoa: string;
  active: boolean;
  created_at: string;
};

export type PhongBenh = {
  id: string;
  khoa_id: string;
  so_phong: string;
  active: boolean;
  created_at: string;
};

export type NguoiDung = {
  id: string;
  auth_user_id: string;
  ho_ten: string;
  vai_tro: VaiTro;
  khoa_id: string | null;
  active: boolean;
  created_at: string;
};

export type ChecklistVersion = {
  id: string;
  ten_phien_ban: string;
  ngay_hieu_luc: string;
  ghi_chu_van_ban_can_cu: string | null;
  active: boolean;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  checklist_version_id: string;
  stt: number;
  noi_dung: string;
  ghi_chu_huong_dan: string | null;
  active: boolean;
};

export type PhienKiemTra = {
  id: string;
  khoa_id: string;
  nguoi_kiem_tra_id: string;
  checklist_version_id: string;
  thoi_gian_bat_dau: string;
  thoi_gian_hoan_thanh: string | null;
  trang_thai: TrangThaiPhien;
  an: boolean;

  ngay_bao_cao: string;
  dd_uy_quyen_khi_vang_mat: string | null;
  tong_so_nb_thuc_te: number | null;
  so_nb_cap_1: number | null;
  so_nb_cap_2: number | null;
  so_nb_cap_3: number | null;
  so_giuong_dv_trong: number | null;
  so_giuong_thuong_trong: number | null;
  so_nb_nam_bang_ca: number;
  tong_so_dd_co_huu: number | null;
  so_dd_dang_cong_tac_trong_ngay: number | null;
  so_dd_ra_truc: number | null;
  so_dd_nghi_bu_nghi_phep: number | null;
  so_dd_nghi_che_do: number;

  y_kien_van_de_nguoi_benh: string | null;
  bien_phap_khac_phuc: string | null;

  created_at: string;
};

export type PhienKiemTraPhong = {
  id: string;
  phien_kiem_tra_id: string;
  phong_benh_id: string;
  ten_dd_phu_trach: string | null;
  tong_so_nguoi_benh: number | null;
  created_at: string;
};

export type KetQuaKiemTra = {
  id: string;
  phien_kiem_tra_phong_id: string;
  checklist_item_id: string;
  trang_thai: TrangThaiKq | null;
  ghi_chu: string | null;
};

// Danh sách 15 field bắt buộc/không bắt buộc của Phần I, dùng để validate.
export const PHAN_1_FIELDS_BAT_BUOC = [
  "ngay_bao_cao",
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

export interface Database {
  public: {
    Tables: {
      khoa: { Row: Khoa; Insert: Partial<Khoa>; Update: Partial<Khoa>; Relationships: [] };
      phong_benh: {
        Row: PhongBenh;
        Insert: Partial<PhongBenh>;
        Update: Partial<PhongBenh>;
        Relationships: [];
      };
      nguoi_dung: {
        Row: NguoiDung;
        Insert: Partial<NguoiDung>;
        Update: Partial<NguoiDung>;
        Relationships: [];
      };
      checklist_version: {
        Row: ChecklistVersion;
        Insert: Partial<ChecklistVersion>;
        Update: Partial<ChecklistVersion>;
        Relationships: [];
      };
      checklist_item: {
        Row: ChecklistItem;
        Insert: Partial<ChecklistItem>;
        Update: Partial<ChecklistItem>;
        Relationships: [];
      };
      phien_kiem_tra: {
        Row: PhienKiemTra;
        Insert: Partial<PhienKiemTra>;
        Update: Partial<PhienKiemTra>;
        Relationships: [];
      };
      phien_kiem_tra_phong: {
        Row: PhienKiemTraPhong;
        Insert: Partial<PhienKiemTraPhong>;
        Update: Partial<PhienKiemTraPhong>;
        Relationships: [];
      };
      ket_qua_kiem_tra: {
        Row: KetQuaKiemTra;
        Insert: Partial<KetQuaKiemTra>;
        Update: Partial<KetQuaKiemTra>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      bao_cao_ty_le_dat: {
        Args: { p_tu_ngay: string; p_den_ngay: string };
        Returns: BaoCaoTyLeDatRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface BaoCaoTyLeDatRow {
  khoa_id: string;
  ten_khoa: string;
  so_phien: number;
  tong_muc_ap_dung: number;
  so_dat: number;
  ty_le_dat: number | null;
}
