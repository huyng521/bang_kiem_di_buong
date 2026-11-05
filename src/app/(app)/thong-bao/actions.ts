"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function danhDauDaDocTatCa() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("thong_bao").update({ da_doc: true }).eq("nguoi_dung_id", user.nguoiDung.id).eq("da_doc", false);
  revalidatePath("/", "layout");
}
