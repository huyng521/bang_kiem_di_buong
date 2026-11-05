import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hienNgayGio } from "@/lib/thoi-gian";
import { danhDauDaDocTatCa } from "./actions";

export default async function ThongBaoPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("thong_bao").select("*").eq("nguoi_dung_id", user.nguoiDung.id).order("created_at", { ascending: false }).limit(100);
  const chuaDoc = (data ?? []).filter((t) => !t.da_doc).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">Thông báo {chuaDoc ? <span className="text-sm text-red-700">({chuaDoc} chưa đọc)</span> : null}</h1>
        {chuaDoc > 0 && <form action={danhDauDaDocTatCa}><button className="rounded-lg border px-3 py-1.5 text-sm">Đánh dấu đã đọc tất cả</button></form>}
      </div>
      <ul className="space-y-2">
        {(data ?? []).map((t) => (
          <li key={t.id}>
            <a href={`/thong-bao/${t.id}`} className={`block rounded-xl border p-3 shadow-sm ${t.da_doc ? "border-slate-200 bg-white" : "border-blue-300 bg-blue-50"}`}>
              <p className="text-sm font-semibold">{!t.da_doc && <span aria-label="chưa đọc">● </span>}{t.tieu_de}</p>
              {t.noi_dung && <p className="text-sm text-slate-600">{t.noi_dung}</p>}
              <p className="mt-1 text-xs text-slate-500">{hienNgayGio(t.created_at)}</p>
            </a>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Chưa có thông báo nào.</li>}
      </ul>
    </div>
  );
}
