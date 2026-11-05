import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { laQuaHan, NHAN_TT_KP, TT_MO } from "@/lib/khac-phuc";
import { hienNgay, homNayVN } from "@/lib/thoi-gian";

/** Khung nhắc các hành động khắc phục còn tồn đọng của khoa — hiện khi bắt đầu đi buồng. */
export async function NhacKhacPhuc({ khoaId }: { khoaId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hanh_dong_khac_phuc")
    .select("id, mo_ta_van_de, bien_phap, han_xu_ly, trang_thai")
    .eq("khoa_id", khoaId)
    .in("trang_thai", TT_MO)
    .order("han_xu_ly", { ascending: true, nullsFirst: false })
    .limit(50);
  if (!data?.length) return null;
  const homNay = homNayVN();
  const quaHan = data.filter((h) => laQuaHan(h, homNay)).length;
  return (
    <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="font-semibold text-amber-900">
        Còn {data.length} việc khắc phục chưa xác nhận{quaHan ? `, ${quaHan} việc quá hạn` : ""} — hãy kiểm tra lại khi đi buồng.
      </p>
      <ul className="space-y-1 text-sm">
        {data.slice(0, 5).map((h) => (
          <li key={h.id}>
            <Link href={`/khac-phuc/${h.id}`} className={`underline ${laQuaHan(h, homNay) ? "font-semibold text-red-700" : "text-amber-900"}`}>
              {h.bien_phap || h.mo_ta_van_de}
            </Link>{" "}
            <span className="text-amber-800">({NHAN_TT_KP[h.trang_thai]}, hạn {hienNgay(h.han_xu_ly)})</span>
          </li>
        ))}
      </ul>
      {data.length > 5 && <Link href="/khac-phuc" className="text-sm font-semibold text-amber-900 underline">Xem tất cả</Link>}
    </section>
  );
}
