import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";

/** Cho route API: trả 401 (chưa đăng nhập) / 403 (bị khóa) thay vì chuyển hướng trang. */
export async function nguoiDungApi(): Promise<CurrentUser | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const { data: nd } = await supabase.from("nguoi_dung").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (!nd || !nd.active) return NextResponse.json({ loi: "Tài khoản bị khóa" }, { status: 403 });
  return { authUserId: user.id, email: user.email ?? null, nguoiDung: nd };
}
