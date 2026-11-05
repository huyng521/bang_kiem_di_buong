import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Đăng xuất phía server (route handler mới được phép xóa cookie phiên).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL("/login", request.url);
  const lyDo = request.nextUrl.searchParams.get("ly_do");
  if (lyDo) url.searchParams.set("thong_bao", lyDo);
  return NextResponse.redirect(url);
}
