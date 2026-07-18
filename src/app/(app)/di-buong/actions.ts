"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function batDauDiBuong() {
  const user = await requireRole("truong_khoa", "admin");
  const supabase = await createClient();

  if (!user.nguoiDung.khoa_id) {
    throw new Error("Tài khoản chưa được gán khoa. Vui lòng liên hệ admin.");
  }

  const homNay = new Date().toISOString().slice(0, 10);

  // Nếu đã có phiên draft hôm nay cho khoa này thì tiếp tục phiên đó, không tạo mới.
  const { data: phienDaCo } = await supabase
    .from("phien_kiem_tra")
    .select("id")
    .eq("khoa_id", user.nguoiDung.khoa_id)
    .eq("ngay_bao_cao", homNay)
    .eq("trang_thai", "draft")
    .eq("an", false)
    .maybeSingle();

  if (phienDaCo) {
    redirect(`/di-buong/${phienDaCo.id}/phan-1`);
  }

  const { data: version } = await supabase
    .from("checklist_version")
    .select("id")
    .eq("active", true)
    .order("ngay_hieu_luc", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!version) {
    throw new Error("Chưa có bảng kiểm nào được kích hoạt. Vui lòng liên hệ admin.");
  }

  const { data: phienMoi, error } = await supabase
    .from("phien_kiem_tra")
    .insert({
      khoa_id: user.nguoiDung.khoa_id,
      nguoi_kiem_tra_id: user.nguoiDung.id,
      checklist_version_id: version.id,
      ngay_bao_cao: homNay,
    })
    .select("id")
    .single();

  if (error || !phienMoi) {
    throw new Error("Không tạo được phiên đi buồng mới: " + (error?.message ?? ""));
  }

  redirect(`/di-buong/${phienMoi.id}/phan-1`);
}
