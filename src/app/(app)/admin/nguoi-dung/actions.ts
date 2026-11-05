"use server";

import { revalidatePath } from "next/cache";
import { requireRole, sinhMatKhauTam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VaiTro } from "@/types/database";
import { ghiNhatKy } from "@/lib/nhat-ky";

const VAI_TRO_HOP_LE: VaiTro[] = ["admin", "truong_khoa", "ban_giam_doc"];

export interface KetQuaMatKhau {
  loi?: string;
  thanhCong?: string;
  matKhauTam?: string;
  email?: string;
}

export async function taoNguoiDung(_prev: KetQuaMatKhau, formData: FormData): Promise<KetQuaMatKhau> {
  await requireRole("admin");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const vaiTro = String(formData.get("vai_tro") ?? "") as VaiTro;
  const khoaId = String(formData.get("khoa_id") ?? "") || null;

  if (!email || !hoTen || !VAI_TRO_HOP_LE.includes(vaiTro)) return { loi: "Vui lòng nhập đủ họ tên, email và vai trò." };
  if (vaiTro === "truong_khoa" && !khoaId) return { loi: "Trưởng khoa bắt buộc phải chọn khoa phụ trách." };

  const matKhauTam = sinhMatKhauTam();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password: matKhauTam, email_confirm: true });
  if (error || !data.user) {
    const trung = error?.message.toLowerCase().includes("already");
    return { loi: trung ? "Email này đã có tài khoản." : "Không tạo được tài khoản: " + (error?.message ?? "") };
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("nguoi_dung").insert({
    auth_user_id: data.user.id,
    ho_ten: hoTen,
    email,
    vai_tro: vaiTro,
    khoa_id: vaiTro === "truong_khoa" ? khoaId : null,
    phai_doi_mat_khau: true,
  });
  if (dbError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { loi: "Không lưu được hồ sơ người dùng: " + dbError.message };
  }
  revalidatePath("/admin/nguoi-dung");
  return { thanhCong: `Đã tạo tài khoản cho ${hoTen}.`, matKhauTam, email };
}

async function layHoSo(nguoiDungId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("nguoi_dung").select("*").eq("id", nguoiDungId).maybeSingle();
  return data;
}

export async function datLaiMatKhau(nguoiDungId: string): Promise<KetQuaMatKhau> {
  await requireRole("admin");
  const hoSo = await layHoSo(nguoiDungId);
  if (!hoSo) return { loi: "Không tìm thấy người dùng." };
  const matKhauTam = sinhMatKhauTam();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(hoSo.auth_user_id, { password: matKhauTam });
  if (error) return { loi: "Không đặt lại được: " + error.message };
  await (await createClient()).from("nguoi_dung").update({ phai_doi_mat_khau: true }).eq("id", nguoiDungId);
  await ghiNhatKy("dat_lai_mat_khau", "tai_khoan", { id: nguoiDungId, khoaId: hoSo.khoa_id });
  revalidatePath("/admin/nguoi-dung");
  return { thanhCong: `Đã đặt lại mật khẩu cho ${hoSo.ho_ten}.`, matKhauTam, email: hoSo.email ?? undefined };
}

export async function doiKhoaTaiKhoan(nguoiDungId: string, khoa: boolean) {
  const nguoiGoi = await requireRole("admin");
  if (nguoiGoi.nguoiDung.id === nguoiDungId && khoa) return; // không tự khóa chính mình
  const hoSo = await layHoSo(nguoiDungId);
  if (!hoSo) return;
  const supabase = await createClient();
  await supabase.from("nguoi_dung").update({ active: !khoa }).eq("id", nguoiDungId);
  // Chặn cả đăng nhập mới và làm mới phiên ở tầng Supabase Auth; RLS đã chặn dữ liệu ngay lập tức.
  await createAdminClient().auth.admin.updateUserById(hoSo.auth_user_id, { ban_duration: khoa ? "876000h" : "none" });
  revalidatePath("/admin/nguoi-dung");
}

export async function suaNguoiDung(nguoiDungId: string, formData: FormData) {
  const nguoiGoi = await requireRole("admin");
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const vaiTro = String(formData.get("vai_tro") ?? "") as VaiTro;
  const khoaId = String(formData.get("khoa_id") ?? "") || null;
  if (!hoTen || !VAI_TRO_HOP_LE.includes(vaiTro)) return;
  if (vaiTro === "truong_khoa" && !khoaId) return;
  if (nguoiGoi.nguoiDung.id === nguoiDungId && vaiTro !== "admin") return; // không tự hạ quyền mình

  const supabase = await createClient();
  await supabase
    .from("nguoi_dung")
    .update({ ho_ten: hoTen, vai_tro: vaiTro, khoa_id: vaiTro === "truong_khoa" ? khoaId : null })
    .eq("id", nguoiDungId);
  revalidatePath("/admin/nguoi-dung");
}
