"use server";

import { redirect } from "next/navigation";
import { requireUser, trangChuTheoVaiTro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DoiMatKhauState {
  loi?: string;
}

export async function doiMatKhau(_prev: DoiMatKhauState, formData: FormData): Promise<DoiMatKhauState> {
  const user = await requireUser({ boQuaDoiMatKhau: true });
  const moi = String(formData.get("mat_khau_moi") ?? "");
  const nhapLai = String(formData.get("nhap_lai") ?? "");
  if (moi.length < 8) return { loi: "Mật khẩu mới phải có ít nhất 8 ký tự." };
  if (moi !== nhapLai) return { loi: "Hai lần nhập mật khẩu không khớp." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: moi });
  if (error) {
    return { loi: error.message.includes("different") ? "Mật khẩu mới phải khác mật khẩu cũ." : "Chưa đổi được mật khẩu: " + error.message };
  }
  if (user.nguoiDung.phai_doi_mat_khau) {
    // Cờ này chỉ server (khóa quản trị) được gỡ; người dùng không tự sửa bảng nguoi_dung.
    await createAdminClient().from("nguoi_dung").update({ phai_doi_mat_khau: false }).eq("id", user.nguoiDung.id);
  }
  redirect(trangChuTheoVaiTro(user.nguoiDung.vai_tro) + "?da_doi_mat_khau=1");
}
