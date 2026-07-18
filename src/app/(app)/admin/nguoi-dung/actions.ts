"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VaiTro } from "@/types/database";

export interface TaoNguoiDungState {
  loi?: string;
  thanhCong?: string;
}

export async function taoNguoiDung(
  _prev: TaoNguoiDungState,
  formData: FormData
): Promise<TaoNguoiDungState> {
  await requireRole("admin");

  const email = String(formData.get("email") ?? "").trim();
  const matKhau = String(formData.get("mat_khau") ?? "");
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const vaiTro = String(formData.get("vai_tro") ?? "") as VaiTro;
  const khoaId = String(formData.get("khoa_id") ?? "") || null;

  if (!email || !matKhau || !hoTen || !vaiTro) {
    return { loi: "Vui lòng nhập đầy đủ thông tin." };
  }
  if (matKhau.length < 6) {
    return { loi: "Mật khẩu phải có ít nhất 6 ký tự." };
  }
  if (vaiTro === "truong_khoa" && !khoaId) {
    return { loi: "Trưởng khoa bắt buộc phải chọn khoa phụ trách." };
  }

  const admin = createAdminClient();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: matKhau,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return { loi: "Không tạo được tài khoản đăng nhập: " + (authError?.message ?? "") };
  }

  const { error: dbError } = await admin.from("nguoi_dung").insert({
    auth_user_id: authUser.user.id,
    ho_ten: hoTen,
    vai_tro: vaiTro,
    khoa_id: vaiTro === "truong_khoa" ? khoaId : null,
  });

  if (dbError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { loi: "Không lưu được hồ sơ người dùng: " + dbError.message };
  }

  revalidatePath("/admin/nguoi-dung");
  return { thanhCong: `Đã tạo tài khoản cho ${hoTen}.` };
}

export async function suaNguoiDung(nguoiDungId: string, formData: FormData) {
  await requireRole("admin");
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const vaiTro = String(formData.get("vai_tro") ?? "") as VaiTro;
  const khoaId = String(formData.get("khoa_id") ?? "") || null;
  if (!hoTen || !vaiTro) return;

  const supabase = await createClient();
  await supabase
    .from("nguoi_dung")
    .update({
      ho_ten: hoTen,
      vai_tro: vaiTro,
      khoa_id: vaiTro === "truong_khoa" ? khoaId : null,
    })
    .eq("id", nguoiDungId);

  revalidatePath("/admin/nguoi-dung");
}

export async function doiTrangThaiNguoiDung(nguoiDungId: string, active: boolean) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("nguoi_dung").update({ active }).eq("id", nguoiDungId);
  revalidatePath("/admin/nguoi-dung");
}
