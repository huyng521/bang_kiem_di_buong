import { createClient } from "@/lib/supabase/server";
import { layAnhCuaPhien } from "@/lib/anh-server";

/** Ảnh minh chứng của một phiên, gom theo phòng và mục. Bấm ảnh để mở cỡ lớn. */
export async function ThuVienAnhPhien({ phienId }: { phienId: string }) {
  const anh = (await layAnhCuaPhien(phienId)).filter((a) => a.loai === "kiem_tra");
  if (!anh.length) return null;
  const supabase = await createClient();
  const idsKq = [...new Set(anh.map((a) => a.ket_qua_kiem_tra_id!))];
  const { data: kq } = await supabase.from("ket_qua_kiem_tra").select("id, phien_kiem_tra_phong_id, checklist_item_id, trang_thai").in("id", idsKq);
  const { data: pp } = await supabase.from("phien_kiem_tra_phong").select("id, phong_benh_id").eq("phien_kiem_tra_id", phienId);
  const { data: phong } = await supabase.from("phong_benh").select("id, so_phong").in("id", (pp ?? []).map((x) => x.phong_benh_id));
  const { data: muc } = await supabase.from("checklist_item").select("id, stt").in("id", [...new Set((kq ?? []).map((k) => k.checklist_item_id))]);
  const tenPhong = new Map((pp ?? []).map((x) => [x.id, (phong ?? []).find((p) => p.id === x.phong_benh_id)?.so_phong ?? ""]));
  const sttMuc = new Map((muc ?? []).map((m) => [m.id, m.stt]));
  const kqMap = new Map((kq ?? []).map((k) => [k.id, k]));

  const nhom = new Map<string, { nhan: string; khongDat: boolean; anh: typeof anh }>();
  for (const a of anh) {
    const k = kqMap.get(a.ket_qua_kiem_tra_id!);
    if (!k) continue;
    const khoa = `${tenPhong.get(k.phien_kiem_tra_phong_id)}|${sttMuc.get(k.checklist_item_id)}`;
    const g = nhom.get(khoa) ?? { nhan: `${tenPhong.get(k.phien_kiem_tra_phong_id)} · Mục ${sttMuc.get(k.checklist_item_id)}`, khongDat: k.trang_thai === "khong_dat", anh: [] };
    g.anh.push(a);
    nhom.set(khoa, g);
  }
  const ds = [...nhom.values()].sort((a, b) => a.nhan.localeCompare(b.nhan, "vi", { numeric: true }));
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ảnh minh chứng ({anh.length})</h2>
      {ds.map((g) => (
        <div key={g.nhan}>
          <p className={`text-sm ${g.khongDat ? "font-semibold text-red-700" : "text-slate-700"}`}>{g.nhan}{g.khongDat ? " — Không đạt" : ""}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {g.anh.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-slate-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={`Ảnh minh chứng ${g.nhan}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
