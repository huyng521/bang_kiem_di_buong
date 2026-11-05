"use client";

import { useActionState, useState, useTransition } from "react";
import { boMuc, congBo, luuMuc, sapXep, themMuc, type KetQua } from "../actions";

interface Muc { id: string; stt: number; noi_dung: string; ghi_chu_huong_dan: string | null; ma_muc_goc: string; coTrongBanGoc: boolean }

function DongMuc({ versionId, m, chiSo, tong, onDoi, keoTha }: {
  versionId: string; m: Muc; chiSo: number; tong: number; onDoi: (huong: -1 | 1) => void;
  keoTha: { onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void };
}) {
  const [noiDung, setNoiDung] = useState(m.noi_dung);
  const [ghiChu, setGhiChu] = useState(m.ghi_chu_huong_dan ?? "");
  const [cachLuu, setCachLuu] = useState<"giu_ma" | "ma_moi">("giu_ma");
  const [kq, setKq] = useState<KetQua | null>(null);
  const [xacNhanBo, setXacNhanBo] = useState(false);
  const [dang, start] = useTransition();
  const daDoi = noiDung !== m.noi_dung || ghiChu !== (m.ghi_chu_huong_dan ?? "");
  const o = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <li draggable onDragStart={keoTha.onDragStart} onDragOver={keoTha.onDragOver} onDrop={keoTha.onDrop}
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="cursor-grab select-none pt-2 text-slate-400" title="Kéo để đổi thứ tự">⋮⋮</span>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="rounded bg-slate-100 px-2 py-1 text-sm font-bold">{chiSo + 1}</span>
          <span className="text-[10px] text-slate-500">{m.ma_muc_goc}</span>
        </div>
        <textarea value={noiDung} onChange={(e) => setNoiDung(e.target.value)} rows={2} className={o} aria-label={`Nội dung mục ${chiSo + 1}`} />
      </div>
      <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Ghi chú hướng dẫn (phần in nghiêng)" className={`${o} italic`} />
      {daDoi && m.coTrongBanGoc && (
        <fieldset className="space-y-1 rounded-lg bg-amber-50 p-2 text-sm">
          <legend className="font-semibold text-amber-900">Bạn đang sửa một mục đã có. Đây là:</legend>
          <label className="flex gap-2"><input type="radio" checked={cachLuu === "giu_ma"} onChange={() => setCachLuu("giu_ma")} /> Chỉ chỉnh câu chữ của cùng tiêu chí (giữ mã {m.ma_muc_goc})</label>
          <label className="flex gap-2"><input type="radio" checked={cachLuu === "ma_moi"} onChange={() => setCachLuu("ma_moi")} /> Đây là tiêu chí mới (cấp mã mới — thống kê không gộp với mục cũ)</label>
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={chiSo === 0} onClick={() => onDoi(-1)} className="rounded border px-2 py-1 text-sm disabled:opacity-30" aria-label="Lên">↑</button>
        <button type="button" disabled={chiSo === tong - 1} onClick={() => onDoi(1)} className="rounded border px-2 py-1 text-sm disabled:opacity-30" aria-label="Xuống">↓</button>
        {daDoi && (
          <button type="button" disabled={dang} onClick={() => start(async () => setKq(await luuMuc(versionId, m.id, noiDung, ghiChu, m.coTrongBanGoc && cachLuu === "ma_moi")))}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">{dang ? "Đang lưu..." : "Lưu mục"}</button>
        )}
        <button type="button" onClick={() => (xacNhanBo ? start(async () => setKq(await boMuc(versionId, m.id))) : setXacNhanBo(true))}
          className={`ml-auto rounded-lg px-3 py-1.5 text-sm ${xacNhanBo ? "bg-red-600 text-white" : "border border-red-300 text-red-700"}`}>
          {xacNhanBo ? "Bấm lần nữa để bỏ mục" : "Bỏ mục"}
        </button>
      </div>
      {kq?.loi && <p className="text-sm text-red-700">{kq.loi}</p>}
    </li>
  );
}

export function SuaBanNhap({ versionId, muc, homNay }: { versionId: string; muc: Muc[]; homNay: string }) {
  const [ds, setDs] = useState(muc);
  const [keo, setKeo] = useState<number | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [moi, setMoi] = useState({ noiDung: "", ghiChu: "" });
  const [, start] = useTransition();
  const [cbState, cbAction, cbDang] = useActionState(congBo.bind(null, versionId), {} as KetQua);

  function datThuTu(moiDs: Muc[]) {
    setDs(moiDs);
    start(async () => { const r = await sapXep(versionId, moiDs.map((x) => x.id)); if (r.loi) setLoi(r.loi); });
  }
  function doi(i: number, huong: -1 | 1) {
    const x = [...ds]; [x[i], x[i + huong]] = [x[i + huong], x[i]]; datThuTu(x);
  }
  const o = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      {loi && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{loi}</p>}
      <ol className="space-y-2">
        {ds.map((m, i) => (
          <DongMuc key={m.id} versionId={versionId} m={m} chiSo={i} tong={ds.length} onDoi={(h) => doi(i, h)}
            keoTha={{
              onDragStart: () => setKeo(i),
              onDragOver: (e) => e.preventDefault(),
              onDrop: () => { if (keo === null || keo === i) return; const x = [...ds]; const [a] = x.splice(keo, 1); x.splice(i, 0, a); setKeo(null); datThuTu(x); },
            }} />
        ))}
      </ol>
      <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">
        <p className="text-sm font-semibold">Thêm tiêu chí mới (được cấp mã mới)</p>
        <textarea value={moi.noiDung} onChange={(e) => setMoi({ ...moi, noiDung: e.target.value })} rows={2} placeholder="Nội dung mục" className={o} />
        <input value={moi.ghiChu} onChange={(e) => setMoi({ ...moi, ghiChu: e.target.value })} placeholder="Ghi chú hướng dẫn (không bắt buộc)" className={o} />
        <button type="button" onClick={() => start(async () => { const r = await themMuc(versionId, moi.noiDung, moi.ghiChu); if (r.loi) setLoi(r.loi); else { setMoi({ noiDung: "", ghiChu: "" }); location.reload(); } })}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Thêm mục</button>
      </div>
      <form action={cbAction} className="space-y-2 rounded-xl border border-green-300 bg-green-50 p-4">
        <p className="font-semibold text-green-900">Công bố phiên bản</p>
        <p className="text-xs text-green-900">Sau khi công bố, phiên bản và các mục bị khóa. Phiên đi buồng bắt đầu từ ngày hiệu lực sẽ dùng phiên bản này; phiên đang làm dở giữ nguyên phiên bản cũ.</p>
        <input name="so_hieu" required placeholder="Số hiệu văn bản căn cứ, ví dụ: 125/QĐ-BV" className={o} />
        <label className="block text-xs">Ngày ban hành<input type="date" name="ngay_ban_hanh" required className={o} /></label>
        <textarea name="trich_yeu" required rows={2} placeholder="Trích yếu văn bản" className={o} />
        <label className="block text-xs">Ngày hiệu lực (không trước hôm nay)<input type="date" name="ngay_hieu_luc" required min={homNay} defaultValue={homNay} className={o} /></label>
        {cbState.loi && <p className="text-sm text-red-700">{cbState.loi}</p>}
        <button disabled={cbDang} className="w-full rounded-lg bg-green-700 py-2.5 font-semibold text-white disabled:opacity-60">{cbDang ? "Đang công bố..." : "Công bố"}</button>
      </form>
    </div>
  );
}
