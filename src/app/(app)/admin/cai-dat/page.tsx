import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CaiDatForm } from "./form";

export default async function CaiDatPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: ch } = await supabase.from("cau_hinh_he_thong").select("*").eq("id", 1).single();
  let logoUrl: string | null = null;
  if (ch?.logo_path) logoUrl = (await supabase.storage.from("he-thong").createSignedUrl(ch.logo_path, 600)).data?.signedUrl ?? null;
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">← Quản trị</Link>
        <h1 className="mt-1 text-lg font-bold">Cài đặt hệ thống</h1>
      </div>
      {ch ? <CaiDatForm ch={ch} logoUrl={logoUrl} /> : <p>Chưa có dòng cài đặt — hãy chạy migration Mốc 4.</p>}
    </div>
  );
}
