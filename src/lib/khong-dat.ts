import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface MucKhongDat {
  itemId: string;
  stt: number;
  noiDung: string;
  phong: string[];
}

/** Các mục "Không đạt" của một phiên, gom theo mục kèm danh sách phòng. */
export async function layMucKhongDat(phienId: string): Promise<MucKhongDat[]> {
  const supabase = await createClient();
  const { data: pp } = await supabase.from("phien_kiem_tra_phong").select("id, phong_benh_id").eq("phien_kiem_tra_id", phienId);
  if (!pp?.length) return [];
  const { data: kq } = await supabase
    .from("ket_qua_kiem_tra")
    .select("phien_kiem_tra_phong_id, checklist_item_id")
    .in("phien_kiem_tra_phong_id", pp.map((x) => x.id))
    .eq("trang_thai", "khong_dat");
  if (!kq?.length) return [];
  const { data: phong } = await supabase.from("phong_benh").select("id, so_phong").in("id", pp.map((x) => x.phong_benh_id));
  const { data: muc } = await supabase.from("checklist_item").select("id, stt, noi_dung").in("id", [...new Set(kq.map((k) => k.checklist_item_id))]);
  const tenPhong = new Map(pp.map((x) => [x.id, phong?.find((p) => p.id === x.phong_benh_id)?.so_phong ?? ""]));
  const theoMuc = new Map<string, MucKhongDat>();
  for (const k of kq) {
    const m = muc?.find((x) => x.id === k.checklist_item_id);
    if (!m) continue;
    const g = theoMuc.get(m.id) ?? { itemId: m.id, stt: m.stt, noiDung: m.noi_dung, phong: [] };
    g.phong.push(tenPhong.get(k.phien_kiem_tra_phong_id) ?? "");
    theoMuc.set(m.id, g);
  }
  return [...theoMuc.values()]
    .map((g) => ({ ...g, phong: g.phong.sort((a, b) => a.localeCompare(b, "vi", { numeric: true })) }))
    .sort((a, b) => a.stt - b.stt);
}
