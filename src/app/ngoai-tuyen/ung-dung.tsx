"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { kho } from "@/lib/ngoai-tuyen/kho";
import { dongBoPhien, ghiThayDoi, khoaO, taiVeMay } from "@/lib/ngoai-tuyen/dong-bo";
import type { BanSaoPhien } from "@/lib/ngoai-tuyen/kieu";
import { nenAnh, taiLenStorage } from "@/lib/nen-anh";
import { createClient } from "@/lib/supabase/client";
import { NHAC_RIENG_TU } from "@/components/khung-anh";
import type { TrangThaiKq } from "@/types/database";

const NUT: { v: TrangThaiKq; nhan: string; on: string; off: string }[] = [
  { v: "dat_co", nhan: "Đạt/Có", on: "bg-green-600 text-white border-green-600", off: "text-green-700 border-green-300" },
  { v: "khong_dat", nhan: "Không đạt", on: "bg-red-600 text-white border-red-600", off: "text-red-700 border-red-300" },
  { v: "khong_co_bo_chuan", nhan: "Không có/Bỏ chuẩn", on: "bg-slate-600 text-white border-slate-600", off: "text-slate-600 border-slate-300" },
];
const PHAN1: [string, string, boolean][] = [
  ["tong_so_nb_thuc_te", "Tổng số người bệnh hiện có thực tế tại khoa", false], ["so_nb_cap_1", "Số NB chăm sóc cấp 1", false],
  ["so_nb_cap_2", "Số NB chăm sóc cấp 2", false], ["so_nb_cap_3", "Số NB chăm sóc cấp 3", false],
  ["so_giuong_dv_trong", "Số giường dịch vụ còn trống", false], ["so_giuong_thuong_trong", "Số giường thường còn trống", false],
  ["so_nb_nam_bang_ca", "Số NB đang nằm băng ca (cho phép 0)", false], ["tong_so_dd_co_huu", "Tổng số ĐD/HS cơ hữu của khoa", false],
  ["so_dd_dang_cong_tac_trong_ngay", "Số ĐD/HS đang công tác trong ngày (không tính ra trực)", false], ["so_dd_ra_truc", "Số ĐD/HS ra trực", false],
  ["so_dd_nghi_bu_nghi_phep", "Số ĐD/HS nghỉ bù - nghỉ phép", false], ["so_dd_nghi_che_do", "Số ĐD/HS nghỉ theo chế độ (cho phép 0)", false],
];
type Man = { ten: "tong" } | { ten: "phan1" } | { ten: "phong"; pktpId: string } | { ten: "ket_thuc" };

export function UngDungNgoaiTuyen() {
  const phienId = useSearchParams().get("phien");
  const [p, setP] = useState<BanSaoPhien | null>(null);
  const [man, setMan] = useState<Man>({ ten: "tong" });
  const [coMang, setCoMang] = useState(true);
  const [soCho, setSoCho] = useState(0);
  const [soAnh, setSoAnh] = useState(0);
  const [dangDongBo, setDangDongBo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xungDot, setXungDot] = useState<string[]>([]);
  const dongBoRef = useRef(false);

  const demCho = useCallback(async (id: string) => {
    setSoCho((await kho.hangDoi(id)).length);
    setSoAnh((await kho.anhCho(id)).length);
  }, []);

  const taiAnhCho = useCallback(async (id: string) => {
    const ds = await kho.anhCho(id);
    if (!ds.length) return;
    const { data } = await createClient().auth.getSession();
    if (!data.session) throw new Error("Hãy đăng nhập lại để tải ảnh lên.");
    for (const a of ds) {
      const cb = await (await fetch("/api/ngoai-tuyen/anh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buoc: "chuan_bi", phienId: id }) })).json();
      if (cb.loi || !cb.path) throw new Error(cb.loi ?? "Không xin được chỗ lưu ảnh");
      await taiLenStorage({ bucket: cb.bucket, path: cb.path, blob: a.blob, accessToken: data.session.access_token, onTienTrinh: () => {} });
      const gn = await (await fetch("/api/ngoai-tuyen/anh", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buoc: "ghi_nhan", phienId: id, pktpId: a.pktpId, itemId: a.itemId, path: cb.path, ten: a.ten, kichThuoc: a.blob.size }) })).json();
      if (gn.loi) throw new Error(gn.loi);
      await kho.xoaAnh(a.id!);
    }
  }, []);

  const dongBo = useCallback(async (id: string) => {
    if (dongBoRef.current || !navigator.onLine) return;
    dongBoRef.current = true;
    setDangDongBo(true);
    try {
      const kq = await dongBoPhien(id);
      if (kq.biKhoa) { setP(null); setLoi(kq.loi); return; }
      if (kq.xungDot.length) setXungDot((x) => [...x, ...kq.xungDot]);
      setLoi(kq.loi && kq.loi !== "Chưa có mạng" ? kq.loi : null);
      if (!kq.loi) await taiAnhCho(id).catch((e) => setLoi(e instanceof Error ? e.message : "Lỗi tải ảnh"));
      const moi = await kho.layPhien(id);
      if (moi) setP(moi);
    } finally {
      dongBoRef.current = false;
      setDangDongBo(false);
      await demCho(id);
    }
  }, [demCho, taiAnhCho]);

  // Khởi động: đọc phiên từ máy; có mạng thì đồng bộ rồi tải bản mới nhất.
  useEffect(() => {
    const id = phienId;
    if (!id) return;
    (async () => {
      setCoMang(navigator.onLine);
      const coSan = await kho.layPhien(id);
      if (coSan) setP(coSan);
      await demCho(id);
      if (navigator.onLine) {
        await dongBo(id);
        try { setP(await taiVeMay(id)); } catch (e) {
          const m = e instanceof Error ? e.message : "";
          if (m === "dang_nhap_lai") setLoi("Phiên đăng nhập đã hết — mở lại trang khi có mạng để đăng nhập.");
          else if (m === "bi_khoa") { setP(null); setLoi("Tài khoản đã bị khóa — dữ liệu trên máy đã được xóa."); }
          else if (!coSan) setLoi("Chưa tải được dữ liệu phiên về máy.");
        }
      } else if (!coSan) setLoi("Đang mất mạng và máy chưa có dữ liệu phiên này. Hãy mở phiên một lần khi có mạng.");
    })();
    const len = () => { setCoMang(true); dongBo(id); };
    const xuong = () => setCoMang(false);
    window.addEventListener("online", len);
    window.addEventListener("offline", xuong);
    const t = setInterval(() => navigator.onLine && dongBo(id), 30_000);
    return () => { window.removeEventListener("online", len); window.removeEventListener("offline", xuong); clearInterval(t); };
  }, [phienId, dongBo, demCho]);

  async function ghi(t: Parameters<typeof ghiThayDoi>[1]) {
    if (!p) return;
    const moi = await ghiThayDoi(p, t);
    setP(moi);
    await demCho(p.phienId);
    if (navigator.onLine) dongBo(p.phienId);
  }

  if (!phienId) return <main className="p-6 text-center">Thiếu mã phiên. Hãy mở từ trang “Đi buồng”.</main>;
  const choSua = !!p?.coTheSua && p.phien.trang_thai === "draft";
  const tongCho = soCho + soAnh;
  const trangThaiDongBo = dangDongBo ? ["Đang đồng bộ…", "bg-blue-600"] : loi && tongCho ? ["Lỗi đồng bộ — bấm để thử lại", "bg-red-600"]
    : tongCho ? [`Chưa đồng bộ — ${soCho} thay đổi${soAnh ? `, ${soAnh} ảnh` : ""}${coMang ? "" : " (đang mất mạng)"}`, "bg-amber-600"]
    : [coMang ? "Đã đồng bộ" : "Đã đồng bộ — đang mất mạng, vẫn nhập được", "bg-green-700"];

  return (
    <div className="mx-auto w-full max-w-3xl pb-16">
      <button type="button" onClick={() => dongBo(phienId)} className={`sticky top-0 z-10 w-full px-4 py-2 text-left text-sm font-semibold text-white ${trangThaiDongBo[1]}`}>
        {coMang ? "● " : "○ "}{trangThaiDongBo[0]}
      </button>
      <div className="space-y-4 px-4 py-4">
        {loi && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loi}</p>}
        {xungDot.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-semibold">Có {xungDot.length} ô đã được sửa ở thiết bị khác với thời điểm mới hơn — đã giữ bản mới hơn:</p>
            <ul className="list-disc pl-5">{xungDot.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <button className="mt-1 underline" onClick={() => setXungDot([])}>Đã hiểu</button>
          </div>
        )}
        {!p ? <p className="text-sm text-slate-500">Đang mở dữ liệu…</p> : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold">Đi buồng {p.phien.ngay_bao_cao?.toString().split("-").reverse().join("/")}</h1>
                <p className="text-sm text-slate-500">{p.tenKhoa} · {p.nguoiBaoCao}{!choSua ? " · chỉ xem" : ""}</p>
              </div>
              <a href={`/di-buong/${p.phienId}`} className="text-sm text-blue-600">Về chế độ trực tuyến</a>
            </div>
            <nav className="grid grid-cols-3 gap-1 text-sm">
              {([["tong", "Danh sách phòng"], ["phan1", "Phần I"], ["ket_thuc", "Kết thúc"]] as const).map(([k, n]) => (
                <button key={k} onClick={() => setMan({ ten: k })} className={`rounded-lg border px-2 py-2 font-semibold ${man.ten === k ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300"}`}>{n}</button>
              ))}
            </nav>
            {man.ten === "tong" && <DanhSachPhong p={p} choSua={choSua} ghi={ghi} mo={(pktpId) => setMan({ ten: "phong", pktpId })} />}
            {man.ten === "phan1" && <Phan1 p={p} choSua={choSua} ghi={ghi} />}
            {man.ten === "phong" && <ChamPhong p={p} pktpId={man.pktpId} choSua={choSua} ghi={ghi} veDs={() => setMan({ ten: "tong" })}
              themAnh={async (pktpId, itemId, f) => { const blob = await nenAnh(f); await kho.themAnh({ phienId: p.phienId, pktpId, itemId, blob, ten: f.name, luc: new Date().toISOString() }); await demCho(p.phienId); if (navigator.onLine) dongBo(p.phienId); }} />}
            {man.ten === "ket_thuc" && <KetThuc p={p} choSua={choSua} ghi={ghi} tongCho={tongCho} coMang={coMang} />}
          </>
        )}
      </div>
    </div>
  );
}

type Ghi = (t: Parameters<typeof ghiThayDoi>[1]) => Promise<void>;
const bayGio = () => new Date().toISOString();

function DanhSachPhong({ p, choSua, ghi, mo }: { p: BanSaoPhien; choSua: boolean; ghi: Ghi; mo: (id: string) => void }) {
  return (
    <ul className="space-y-3">
      {p.phong.map((ph) => {
        const da = p.muc.filter((m) => p.ketQua[khoaO(ph.pktpId, m.id)]?.tt).length;
        return (
          <li key={ph.pktpId} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex justify-between"><b>{ph.soPhong}</b><span className="text-sm tabular-nums text-slate-600">{da}/{p.muc.length} mục</span></div>
            <div className="grid grid-cols-2 gap-2">
              <input disabled={!choSua} defaultValue={ph.tenDd ?? ""} placeholder="Tên ĐD phụ trách" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onBlur={(e) => e.target.value !== (ph.tenDd ?? "") && ghi({ loai: "phong", pktpId: ph.pktpId, tenDd: e.target.value.trim() || null, tongNb: ph.tongNb, luc: bayGio() })} />
              <input disabled={!choSua} type="number" inputMode="numeric" min={0} defaultValue={ph.tongNb ?? ""} placeholder="Tổng số NB" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== ph.tongNb && (v === null || (Number.isInteger(v) && v >= 0))) ghi({ loai: "phong", pktpId: ph.pktpId, tenDd: ph.tenDd, tongNb: v, luc: bayGio() }); }} />
            </div>
            <button onClick={() => mo(ph.pktpId)} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white">Chấm {p.muc.length} mục →</button>
          </li>
        );
      })}
      {p.phong.length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Khoa chưa có phòng bệnh.</li>}
    </ul>
  );
}

function Phan1({ p, choSua, ghi }: { p: BanSaoPhien; choSua: boolean; ghi: Ghi }) {
  const luu = (k: string, v: string | number | null) => v !== p.phien[k] && ghi({ loai: "phien", truong: { [k]: v }, luc: bayGio() });
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium">Ngày báo cáo *<input type="date" disabled={!choSua} defaultValue={String(p.phien.ngay_bao_cao ?? "")} onBlur={(e) => e.target.value && luu("ngay_bao_cao", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium">Họ và tên người báo cáo<input disabled value={p.nguoiBaoCao} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2" /></label>
      <label className="block text-sm font-medium">ĐD được ĐDTK ủy quyền khi vắng mặt<input disabled={!choSua} defaultValue={String(p.phien.dd_uy_quyen_khi_vang_mat ?? "")} onBlur={(e) => luu("dd_uy_quyen_khi_vang_mat", e.target.value.trim() || null)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      {PHAN1.map(([k, nhan]) => (
        <label key={k} className="block text-sm font-medium">{nhan} *
          <input type="number" inputMode="numeric" min={0} disabled={!choSua} defaultValue={p.phien[k] ?? ""}
            onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v === null || (Number.isInteger(v) && v >= 0)) luu(k, v); }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${p.phien[k] === null || p.phien[k] === undefined ? "border-amber-400" : "border-slate-300"}`} />
        </label>
      ))}
      <p className="text-xs text-slate-500">Lưu ngay trên máy khi rời khỏi ô; tự gửi lên khi có mạng.</p>
    </div>
  );
}

function ChamPhong({ p, pktpId, choSua, ghi, veDs, themAnh }: {
  p: BanSaoPhien; pktpId: string; choSua: boolean; ghi: Ghi; veDs: () => void; themAnh: (pktpId: string, itemId: string, f: File) => Promise<void>;
}) {
  const ph = p.phong.find((x) => x.pktpId === pktpId);
  const [moAnh, setMoAnh] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><button onClick={veDs} className="text-sm text-blue-600">← Danh sách phòng</button><b>{ph?.soPhong}</b></div>
      {p.muc.map((m) => {
        const o = p.ketQua[khoaO(pktpId, m.id)];
        return (
          <div key={m.id} className={`space-y-2 rounded-xl border bg-white p-3 shadow-sm ${o?.tt ? "border-slate-200" : "border-amber-300"}`}>
            <p className="text-sm"><b>{m.stt}.</b> {m.noi_dung}{m.ghi_chu_huong_dan && <em className="block text-xs text-slate-500">({m.ghi_chu_huong_dan})</em>}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {NUT.map((n) => (
                <button key={n.v} disabled={!choSua} onClick={() => ghi({ loai: "ket_qua", pktpId, itemId: m.id, tt: n.v, gc: o?.gc ?? null, luc: bayGio() })}
                  className={`min-h-[44px] rounded-lg border text-xs font-semibold ${o?.tt === n.v ? n.on : `bg-white ${n.off}`}`}>{n.nhan}</button>
              ))}
            </div>
            {choSua && (
              <div className="flex gap-3 text-xs">
                <input defaultValue={o?.gc ?? ""} placeholder="Ghi chú (không ghi tên/mã người bệnh)" className="flex-1 rounded border border-slate-300 px-2 py-1.5"
                  onBlur={(e) => (e.target.value.trim() || null) !== (o?.gc ?? null) && ghi({ loai: "ket_qua", pktpId, itemId: m.id, tt: o?.tt ?? null, gc: e.target.value.trim() || null, luc: bayGio() })} />
                <button className="text-blue-600" onClick={() => setMoAnh(moAnh === m.id ? null : m.id)}>📷 Ảnh</button>
              </div>
            )}
            {moAnh === m.id && (
              <div className="space-y-2 rounded-lg bg-slate-50 p-2 text-xs">
                <p className="font-medium text-amber-900">⚠ {NHAC_RIENG_TU}</p>
                <input type="file" accept="image/*" capture="environment" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await themAnh(pktpId, m.id, f); e.target.value = ""; } }} />
                <p className="text-slate-500">Ảnh được nén và xếp hàng chờ tải lên khi có mạng.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KetThuc({ p, choSua, ghi, tongCho, coMang }: { p: BanSaoPhien; choSua: boolean; ghi: Ghi; tongCho: number; coMang: boolean }) {
  const chuaCham = p.phong.map((ph) => ({ ph, n: p.muc.filter((m) => !p.ketQua[khoaO(ph.pktpId, m.id)]?.tt).length })).filter((x) => x.n);
  return (
    <div className="space-y-3">
      {(["y_kien_van_de_nguoi_benh", "bien_phap_khac_phuc"] as const).map((k) => (
        <label key={k} className="block text-sm font-medium">{k === "y_kien_van_de_nguoi_benh" ? "Ý kiến/vấn đề của người bệnh" : "Biện pháp khắc phục"}
          <textarea rows={3} disabled={!choSua} defaultValue={String(p.phien[k] ?? "")} onBlur={(e) => (e.target.value.trim() || null) !== (p.phien[k] ?? null) && ghi({ loai: "phien", truong: { [k]: e.target.value.trim() || null }, luc: bayGio() })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      ))}
      {chuaCham.length > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Còn ô chưa chấm: {chuaCham.map((x) => `${x.ph.soPhong} (${x.n})`).join(", ")}.</p>}
      {tongCho > 0 ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Còn {tongCho} thay đổi/ảnh chưa đồng bộ — chưa thể hoàn thành phiên. {coMang ? "Đang chờ gửi…" : "Hãy chờ có mạng."}</p>
      ) : choSua ? (
        <a href={`/di-buong/${p.phienId}/hoan-thanh`} className="block rounded-xl bg-green-600 py-3 text-center font-bold text-white">Đã đồng bộ — sang bước hoàn thành →</a>
      ) : null}
    </div>
  );
}
