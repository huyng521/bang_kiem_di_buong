import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tác vụ định kỳ sinh thông báo. Vercel Cron tự gửi "Authorization: Bearer <CRON_SECRET>".
// Có thể gọi tay để thử: curl -H "Authorization: Bearer $CRON_SECRET" https://<ten-mien>/api/cron/thong-bao
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ loi: "Không có quyền" }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("tao_thong_bao_dinh_ky", {});
  if (error) return NextResponse.json({ loi: error.message }, { status: 500 });
  return NextResponse.json({ so_thong_bao_moi: data });
}
