import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 đổi tên "middleware.ts" thành "proxy.ts" (export function `proxy`).
// Việc này chỉ lo 2 chuyện: (1) làm mới session Supabase trên mỗi request,
// (2) đá người chưa đăng nhập về /login. Việc kiểm tra vai trò chi tiết
// (admin/truong_khoa/ban_giam_doc) được làm lại ở từng trang (xem src/lib/auth.ts)
// theo đúng khuyến nghị của Next.js — không dựa hoàn toàn vào proxy.
const CONG_KHAI = ["/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const laTrangCongKhai = CONG_KHAI.some((path) => pathname.startsWith(path));

  if (!user && !laTrangCongKhai) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && laTrangCongKhai) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
