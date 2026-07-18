"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { trangChuTheoVaiTro } from "@/lib/auth";

export interface DangNhapState {
  loi?: string;
}

export async function dangNhap(
  _prev: DangNhapState,
  formData: FormData
): Promise<DangNhapState> {
  const email = String(formData.get("email") ?? "").trim();
  const matKhau = String(formData.get("mat_khau") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "");

  if (!email || !matKhau) {
    return { loi: "Vui lòng nhập đầy đủ email và mật khẩu." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: matKhau,
  });

  if (error || !data.user) {
    return { loi: "Email hoặc mật khẩu không đúng." };
  }

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("vai_tro, active")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!nguoiDung || !nguoiDung.active) {
    await supabase.auth.signOut();
    return {
      loi: "Tài khoản chưa được quản trị viên cấp quyền sử dụng. Vui lòng liên hệ admin.",
    };
  }

  redirect(
    redirectTo && redirectTo.startsWith("/") ? redirectTo : trangChuTheoVaiTro(nguoiDung.vai_tro)
  );
}

export async function dangXuat() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
