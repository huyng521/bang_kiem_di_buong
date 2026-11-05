import type { HanhDongKhacPhuc, MucUuTien, TrangThaiKhacPhuc } from "@/types/database";

export const NHAN_TT_KP: Record<TrangThaiKhacPhuc, string> = {
  moi: "Mới",
  dang_xu_ly: "Đang xử lý",
  da_khac_phuc: "Đã khắc phục",
  da_xac_nhan: "Đã xác nhận",
  huy: "Đã hủy",
};
export const MAU_TT_KP: Record<TrangThaiKhacPhuc, string> = {
  moi: "bg-sky-100 text-sky-800",
  dang_xu_ly: "bg-amber-100 text-amber-800",
  da_khac_phuc: "bg-violet-100 text-violet-800",
  da_xac_nhan: "bg-green-100 text-green-800",
  huy: "bg-slate-200 text-slate-600",
};
export const NHAN_UU_TIEN: Record<MucUuTien, string> = { thap: "Thấp", trung_binh: "Trung bình", cao: "Cao" };

/** Các bước tiếp theo hợp lệ (khớp trigger kiem_tra_hanh_dong_khac_phuc trong database). */
export const BUOC_TIEP: Record<TrangThaiKhacPhuc, TrangThaiKhacPhuc[]> = {
  moi: ["dang_xu_ly", "da_khac_phuc", "huy"],
  dang_xu_ly: ["da_khac_phuc", "huy"],
  da_khac_phuc: ["da_xac_nhan", "dang_xu_ly", "huy"],
  da_xac_nhan: [],
  huy: [],
};
export const TT_MO: TrangThaiKhacPhuc[] = ["moi", "dang_xu_ly", "da_khac_phuc"];

export function laQuaHan(hd: Pick<HanhDongKhacPhuc, "han_xu_ly" | "trang_thai">, homNay: string): boolean {
  return !!hd.han_xu_ly && hd.han_xu_ly < homNay && (hd.trang_thai === "moi" || hd.trang_thai === "dang_xu_ly");
}
