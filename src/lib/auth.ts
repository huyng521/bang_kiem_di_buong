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
 * Trả về người dùng hiện tại (kèm hồ sơ nguoi_dung), hoặc null nếu chưa
 * đăng nhập / chưa được admin tạo hồ sơ nguoi_dung tương ứng.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!nguoiDung || !nguoiDung.active) return null;

  return { authUserId: user.id, email: user.email ?? null, nguoiDung };
}

/** Bắt buộc đăng nhập, chuyển hướng /login nếu chưa. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Bắt buộc đăng nhập VÀ đúng vai trò, nếu không thì chuyển hướng về trang chủ. */
export async function requireRole(...roles: VaiTro[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.nguoiDung.vai_tro)) {
    redirect("/");
  }
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
