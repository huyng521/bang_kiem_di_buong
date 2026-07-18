import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Dùng trong Server Components / Server Actions / Route Handlers.
// `cookies()` là async kể từ Next.js 15+.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Gọi từ Server Component (không có quyền set cookie) — bỏ qua,
            // vì proxy.ts đã lo việc làm mới session ở request đó.
          }
        },
      },
    }
  );
}
