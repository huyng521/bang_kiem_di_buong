"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface QuenMatKhauState {
  daGui?: boolean;
  loi?: string;
}

export async function guiLinkDatLai(_prev: QuenMatKhauState, formData: FormData): Promise<QuenMatKhauState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { loi: "Vui lòng nhập email." };
  const h = await headers();
  const goc = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${goc}/auth/callback` });
  // Luôn báo đã gửi, không tiết lộ email có tồn tại hay không.
  return { daGui: true };
}
