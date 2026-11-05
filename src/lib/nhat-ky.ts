import "server-only";
import { createClient } from "@/lib/supabase/server";

type SuKien = "dang_nhap" | "dang_xuat" | "xuat_file" | "doi_mat_khau" | "dat_lai_mat_khau";

/** Ghi sự kiện không phải thay đổi dữ liệu (đăng nhập, xuất file…). Không làm hỏng thao tác chính nếu lỗi. */
export async function ghiNhatKy(hanhDong: SuKien, loai: string, opts: { id?: string | null; khoaId?: string | null; chiTiet?: Record<string, unknown> } = {}) {
  try {
    const supabase = await createClient();
    await supabase.rpc("ghi_nhat_ky", {
      p_hanh_dong: hanhDong,
      p_doi_tuong_loai: loai,
      p_doi_tuong_id: opts.id ?? null,
      p_khoa_id: opts.khoaId ?? null,
      p_chi_tiet: opts.chiTiet ?? null,
    });
  } catch {
    /* nhật ký không được chặn công việc chính */
  }
}

export const NHAN_HANH_DONG: Record<string, string> = {
  tao: "Tạo", sua: "Sửa", xoa: "Xóa", hoan_thanh: "Hoàn thành phiên", an_phien: "Ẩn phiên", hien_phien: "Hiện lại phiên",
  khoa_tai_khoan: "Khóa tài khoản", mo_khoa: "Mở khóa tài khoản", doi_vai_tro: "Đổi vai trò/khoa", doi_trang_thai: "Đổi trạng thái",
  dang_nhap: "Đăng nhập", dang_xuat: "Đăng xuất", xuat_file: "Xuất file", doi_mat_khau: "Đổi mật khẩu", dat_lai_mat_khau: "Đặt lại mật khẩu",
  cong_bo: "Công bố phiên bản",
};
export const NHAN_DOI_TUONG: Record<string, string> = {
  phien_kiem_tra: "Phiên kiểm tra", phien_kiem_tra_phong: "Phòng trong phiên", ket_qua_kiem_tra: "Kết quả chấm",
  hanh_dong_khac_phuc: "Hành động khắc phục", hanh_dong_khac_phuc_ket_qua: "Gắn ô vào khắc phục", khac_phuc_bo_qua: "Bỏ qua khắc phục",
  minh_chung_anh: "Ảnh minh chứng", checklist_version: "Phiên bản bảng kiểm", checklist_item: "Mục bảng kiểm", khoa: "Khoa",
  phong_benh: "Phòng bệnh", nguoi_dung: "Người dùng", cau_hinh_he_thong: "Cài đặt hệ thống", tai_khoan: "Tài khoản",
};
