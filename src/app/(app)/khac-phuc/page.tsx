import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { layDanhSachKhacPhuc } from "@/lib/khac-phuc-server";
import { MAU_TT_KP, NHAN_TT_KP, NHAN_UU_TIEN } from "@/lib/khac-phuc";
import { congNgay, hienNgay, homNayVN } from "@/lib/thoi-gian";

export default async function KhacPhucPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const loc = await searchParams;
  const supabase = await createClient();
  const ds = await layDanhSachKhacPhuc(user, loc);
  const laToanVien = user.nguoiDung.vai_tro !== "truong_khoa";
  const { data: dsKhoa } = laToanVien ? await supabase.from("khoa").select("id, ten_khoa").eq("active", true).order("ten_khoa") : { data: [] };
  const homNay = homNayVN();
  const { data: thongKe } = await supabase.rpc("thong_ke_khac_phuc", { p_tu: congNgay(homNay, -365), p_den: homNay });
  const tenKhoa = new Map((dsKhoa ?? []).map((k) => [k.id, k.ten_khoa]));
  const tong = (thongKe ?? []).reduce((s, r) => ({ mo: s.mo + Number(r.so_mo), qh: s.qh + Number(r.so_qua_han) }), { mo: 0, qh: 0 });
  const o = "rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const qs = new URLSearchParams(Object.entries(loc).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Việc cần khắc phục</h1>
        <p className="text-sm text-slate-500">
          Đang mở: <b>{tong.mo}</b> · Quá hạn: <b className="text-red-700">{tong.qh}</b> (12 tháng gần nhất)
        </p>
      </div>

      {laToanVien && (thongKe ?? []).length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Khoa</th><th className="px-3 py-2 text-right">Đang mở</th><th className="px-3 py-2 text-right">Quá hạn</th><th className="px-3 py-2 text-right">Đã xác nhận</th><th className="px-3 py-2 text-right">TB ngày khắc phục</th></tr>
            </thead>
            <tbody>
              {(thongKe ?? []).map((r) => (
                <tr key={r.khoa_id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{tenKhoa.get(r.khoa_id) ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.so_mo}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${Number(r.so_qua_han) ? "font-bold text-red-700" : ""}`}>{r.so_qua_han}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.so_da_xac_nhan}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.tb_ngay_khac_phuc ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form method="get" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <select name="trang_thai" defaultValue={loc.trang_thai ?? "mo"} className={o}>
          <option value="mo">Đang mở</option>
          <option value="tat_ca">Tất cả</option>
          {Object.entries(NHAN_TT_KP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="uu_tien" defaultValue={loc.uu_tien ?? ""} className={o}>
          <option value="">Mọi mức ưu tiên</option>
          {Object.entries(NHAN_UU_TIEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="qua_han" defaultValue={loc.qua_han ?? ""} className={o}>
          <option value="">Mọi hạn</option>
          <option value="1">Chỉ quá hạn</option>
        </select>
        {laToanVien && (
          <select name="khoa" defaultValue={loc.khoa ?? ""} className={o}>
            <option value="">Tất cả khoa</option>
            {(dsKhoa ?? []).map((k) => <option key={k.id} value={k.id}>{k.ten_khoa}</option>)}
          </select>
        )}
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">Lọc</button>
      </form>

      <div className="flex justify-end">
        <a href={`/khac-phuc/xuat-excel?${qs}`} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">⬇ Xuất Excel danh sách này</a>
      </div>

      <ul className="space-y-2">
        {ds.map((h) => (
          <li key={h.id}>
            <Link href={`/khac-phuc/${h.id}`} className={`block rounded-xl border bg-white p-3 shadow-sm active:bg-slate-50 ${h.qua_han ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium text-slate-900">{h.stt_muc ? `Mục ${h.stt_muc}: ` : ""}{h.bien_phap || h.mo_ta_van_de}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${MAU_TT_KP[h.trang_thai]}`}>{NHAN_TT_KP[h.trang_thai]}</span>
              </div>
              <p className={`mt-1 text-xs ${h.qua_han ? "font-semibold text-red-700" : "text-slate-500"}`}>
                {laToanVien ? `${h.ten_khoa} · ` : ""}Hạn {hienNgay(h.han_xu_ly)}{h.qua_han ? " — QUÁ HẠN" : ""} · Ưu tiên {NHAN_UU_TIEN[h.muc_uu_tien]}
                {h.nguoi_phu_trach ? ` · ${h.nguoi_phu_trach}` : ""} · Phiên {hienNgay(h.ngay_phien)}
              </p>
            </Link>
          </li>
        ))}
        {ds.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Không có hành động nào khớp bộ lọc.</li>}
      </ul>
    </div>
  );
}
