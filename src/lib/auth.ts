import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { NguoiDung, VaiTro } from "@/types/database";

export interface CurrentUser {
  authUserId: string;
  email: string | null;
  nguoiDung: NguoiDung;
}

/**
 * Người dùng hiện tại kèm hồ sơ nguoi_dung.
 * - `null`: chưa đăng nhập.
 * - `{ biKhoa: true }`: đã đăng nhập nhưng tài khoản bị khóa hoặc chưa được cấp hồ sơ.
 */
async function docNguoiDung(): Promise<CurrentUser | null | { biKhoa: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS chỉ trả hồ sơ khi tài khoản còn hoạt động.
  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!nguoiDung || !nguoiDung.active) return { biKhoa: true };
  return { authUserId: user.id, email: user.email ?? null, nguoiDung };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const u = await docNguoiDung();
  return u && !("biKhoa" in u) ? u : null;
}

/** Bắt buộc đăng nhập; tài khoản bị khóa bị đăng xuất ngay. */
export async function requireUser(opts: { boQuaDoiMatKhau?: boolean } = {}): Promise<CurrentUser> {
  const u = await docNguoiDung();
  if (!u) redirect("/login");
  if ("biKhoa" in u) redirect("/dang-xuat?ly_do=khoa");
  if (u.nguoiDung.phai_doi_mat_khau && !opts.boQuaDoiMatKhau) redirect("/doi-mat-khau");
  return u;
}

/** Bắt buộc đăng nhập VÀ đúng vai trò, nếu không thì chuyển về trang chủ. */
export async function requireRole(...roles: VaiTro[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.nguoiDung.vai_tro)) redirect("/");
  return user;
}

export function trangChuTheoVaiTro(vaiTro: VaiTro): string {
  switch (vaiTro) {
    case "admin":
      return "/admin";
    case "ban_giam_doc":
      return "/bao-cao";
    case "truong_khoa":
    default:
      return "/di-buong";
  }
}

/** Mật khẩu tạm ngẫu nhiên 12 ký tự, tránh ký tự dễ nhầm (0/O, 1/l). */
export function sinhMatKhauTam(): string {
  const bang = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const so = new Uint32Array(12);
  crypto.getRandomValues(so);
  return Array.from(so, (x) => bang[x % bang.length]).join("");
}
