import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { soSanhPhienBan } from "@/lib/so-sanh-phien-ban";
import { hienNgay, hienNgayGio, homNayVN } from "@/lib/thoi-gian";
import { doiTenBanNhap, xoaBanNhap } from "../actions";
import { SuaBanNhap } from "./sua-ban-nhap";

export default async function PhienBanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ da_cong_bo?: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const { da_cong_bo } = await searchParams;
  const supabase = await createClient();
  const { data: v } = await supabase.from("checklist_version").select("*").eq("id", id).maybeSingle();
  if (!v) notFound();
  const { data: hieuLuc } = await supabase.rpc("phien_ban_hieu_luc", {});
  const goc = v.trang_thai === "nhap" ? hieuLuc : v.nhan_ban_tu_id;
  const [{ data: muc }, { data: mucGoc }] = await Promise.all([
    supabase.from("checklist_item").select("*").eq("checklist_version_id", id).eq("active", true).order("stt"),
    goc && goc !== id ? supabase.from("checklist_item").select("*").eq("checklist_version_id", goc).eq("active", true).order("stt") : Promise.resolve({ data: [] as never[] }),
  ]);
  const ss = goc && goc !== id ? soSanhPhienBan(mucGoc ?? [], muc ?? []) : null;
  const maGoc = new Set((mucGoc ?? []).map((m) => m.ma_muc_goc));
  const laNhap = v.trang_thai === "nhap";

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/checklist" className="text-sm text-blue-600">← Lịch sử phiên bản</Link>
        <h1 className="mt-1 text-lg font-bold">{v.ten_phien_ban} {laNhap && <span className="text-sm font-normal text-amber-700">(bản nháp)</span>}</h1>
        <p className="text-sm text-slate-500">
          {(muc ?? []).length} mục · {laNhap ? "chưa công bố" : `hiệu lực từ ${hienNgay(v.ngay_hieu_luc)}${v.id === hieuLuc ? " (đang hiệu lực)" : ""}`}
          {v.ghi_chu_van_ban_can_cu ? ` · Căn cứ: ${v.ghi_chu_van_ban_can_cu}` : ""}
          {v.cong_bo_luc ? ` · Công bố ${hienNgayGio(v.cong_bo_luc)}` : ""}
        </p>
        {da_cong_bo && <p className="mt-2 rounded bg-green-50 px-3 py-2 text-sm text-green-800">Đã công bố. Phiên bản này đã bị khóa.</p>}
      </div>

      {ss && (
        <section className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h2 className="font-semibold">So sánh với {laNhap ? "phiên bản đang hiệu lực" : "phiên bản trước"}</h2>
          {!ss.them.length && !ss.bo.length && !ss.sua.length && !ss.doiThuTu.length && <p className="text-slate-500">Chưa có thay đổi.</p>}
          {ss.them.map((m) => <p key={m.ma_muc_goc} className="text-green-800">+ Thêm {m.ma_muc_goc}: {m.noi_dung}</p>)}
          {ss.bo.map((m) => <p key={m.ma_muc_goc} className="text-red-700">− Bỏ {m.ma_muc_goc}: {m.noi_dung}</p>)}
          {ss.sua.map((x) => (
            <div key={x.ma} className="text-amber-800">
              ~ Sửa câu chữ {x.ma}: <s className="text-slate-500">{x.cu.noi_dung}</s> → {x.moi.noi_dung}
            </div>
          ))}
          {ss.doiThuTu.length > 0 && <p className="text-slate-600">↕ Đổi thứ tự {ss.doiThuTu.length} mục.</p>}
        </section>
      )}

      {laNhap ? (
        <>
          <div className="flex flex-wrap gap-2">
            <form action={doiTenBanNhap.bind(null, id)} className="flex flex-1 gap-2">
              <input name="ten" defaultValue={v.ten_phien_ban} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Tên phiên bản" />
              <button className="rounded-lg border px-3 py-2 text-sm">Đổi tên</button>
            </form>
            <form action={xoaBanNhap.bind(null, id)}><button className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">Xóa bản nháp</button></form>
          </div>
          <SuaBanNhap
            versionId={id}
            homNay={homNayVN()}
            muc={(muc ?? []).map((m) => ({ id: m.id, stt: m.stt, noi_dung: m.noi_dung, ghi_chu_huong_dan: m.ghi_chu_huong_dan, ma_muc_goc: m.ma_muc_goc, coTrongBanGoc: maGoc.has(m.ma_muc_goc) }))}
          />
        </>
      ) : (
        <>
          <a href={`/admin/checklist/${id}/pdf`} target="_blank" rel="noreferrer" className="block rounded-xl border border-blue-300 bg-blue-50 py-3 text-center font-semibold text-blue-700">⬇ Xuất PDF bảng kiểm phiên bản này</a>
          <ol className="space-y-1">
            {(muc ?? []).map((m) => (
              <li key={m.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                <b>{m.stt}.</b> {m.noi_dung} {m.ghi_chu_huong_dan && <em className="text-slate-500">({m.ghi_chu_huong_dan})</em>}
                <span className="ml-1 text-xs text-slate-400">{m.ma_muc_goc}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
