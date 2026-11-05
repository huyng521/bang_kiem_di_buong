import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Đích của link "Quên mật khẩu" trong email: đổi mã một lần lấy phiên đăng nhập,
// rồi đưa người dùng tới trang đặt mật khẩu mới.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/doi-mat-khau?khoi_phuc=1", request.url));
  }
  return NextResponse.redirect(new URL("/login?thong_bao=link_het_han", request.url));
}
