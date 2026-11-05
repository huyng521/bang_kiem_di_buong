import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound } from "@/lib/phien";
import { layMucKhongDat } from "@/lib/khong-dat";
import { MAU_TT_KP, NHAN_TT_KP } from "@/lib/khac-phuc";
import { congNgay, hienNgay, homNayVN } from "@/lib/thoi-gian";
import { boQuaMuc, huyBoQua, taoHanhDong } from "./actions";

export default async function KhacPhucPhienPage({ params }: { params: Promise<{ phienId: string }> }) {
  const { phienId } = await params;
  const user = await requireRole("truong_khoa", "admin", "ban_giam_doc");
  const phien = await getPhienOrNotFound(phienId, user);
  const choTao = user.nguoiDung.vai_tro !== "ban_giam_doc";
  const supabase = await createClient();

  const mucs = await layMucKhongDat(phien.id);
  const { data: dsHd } = await supabase.from("hanh_dong_khac_phuc").select("*").eq("phien_kiem_tra_id", phien.id).order("created_at");
  const { data: boQua } = await supabase.from("khac_phuc_bo_qua").select("checklist_item_id").eq("phien_kiem_tra_id", phien.id);
  const daBoQua = new Set((boQua ?? []).map((b) => b.checklist_item_id));
  const chuaXuLy = mucs.filter((m) => !(dsHd ?? []).some((h) => h.checklist_item_id === m.itemId) && !daBoQua.has(m.itemId)).length;
  const hanMacDinh = congNgay(homNayVN(), 7);
  const o = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/di-buong/${phienId}`} className="text-sm text-blue-600">← Tổng quan phiên {hienNgay(phien.ngay_bao_cao)}</Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Mục không đạt cần khắc phục</h1>
        <p className="text-sm text-slate-500">
          {mucs.length === 0
            ? "Phiên này không có mục nào “Không đạt”."
            : `${mucs.length} mục không đạt · ${chuaXuLy} mục chưa tạo hành động và chưa bỏ qua.`}
        </p>
      </div>

      {mucs.map((m) => {
        const hds = (dsHd ?? []).filter((h) => h.checklist_item_id === m.itemId);
        return (
          <section key={m.itemId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold text-slate-900">Mục {m.stt}: {m.noiDung}</p>
              <p className="text-sm text-red-700">Không đạt ở: {m.phong.join(", ")}</p>
            </div>

            {hds.map((h) => (
              <Link key={h.id} href={`/khac-phuc/${h.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm active:bg-slate-50">
                <span className="min-w-0 truncate">{h.bien_phap || h.mo_ta_van_de}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${MAU_TT_KP[h.trang_thai]}`}>{NHAN_TT_KP[h.trang_thai]}</span>
              </Link>
            ))}

            {hds.length === 0 && daBoQua.has(m.itemId) && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-600">Đã bỏ qua — chưa tạo hành động</span>
                {choTao && (
                  <form action={huyBoQua.bind(null, phien.id, m.itemId)}>
                    <button className="text-xs text-blue-600 underline">Tạo hành động</button>
                  </form>
                )}
              </div>
            )}

            {hds.length === 0 && !daBoQua.has(m.itemId) && choTao && (
              <form action={taoHanhDong.bind(null, phien.id, m.itemId)} className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">Mô tả vấn đề
                  <textarea name="mo_ta_van_de" rows={2} required className={o} defaultValue={`Mục ${m.stt}: ${m.noiDung} — không đạt ở ${m.phong.join(", ")}.`} />
                </label>
                <label className="block text-xs font-medium text-slate-600">Biện pháp khắc phục
                  <textarea name="bien_phap" rows={2} className={o} />
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label className="col-span-2 block text-xs font-medium text-slate-600 sm:col-span-1">Người phụ trách
                    <input name="nguoi_phu_trach" className={o} placeholder="Họ tên / bộ phận" />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">Hạn xử lý
                    <input name="han_xu_ly" type="date" defaultValue={hanMacDinh} className={o} />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">Ưu tiên
                    <select name="muc_uu_tien" defaultValue="trung_binh" className={o}>
                      <option value="cao">Cao</option>
                      <option value="trung_binh">Trung bình</option>
                      <option value="thap">Thấp</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white">Tạo hành động khắc phục</button>
                  <button formAction={boQuaMuc.bind(null, phien.id, m.itemId)} formNoValidate className="rounded-lg border border-slate-300 px-3 text-sm text-slate-600">Bỏ qua</button>
                </div>
              </form>
            )}
            {hds.length === 0 && !daBoQua.has(m.itemId) && !choTao && <p className="text-sm font-semibold text-amber-700">Chưa tạo hành động</p>}
          </section>
        );
      })}

      <Link href={`/di-buong/${phienId}`} className="block rounded-xl bg-slate-900 py-3 text-center font-semibold text-white">Xong, về tổng quan phiên</Link>
    </div>
  );
}
