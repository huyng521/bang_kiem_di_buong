"use client";

import { useActionState, useState, useTransition } from "react";
import { apDung, xemTruoc, type KetQuaApDung, type KetQuaXemTruoc } from "./actions";

const LOAI = [["khoa", "Khoa"], ["phong", "Phòng bệnh"], ["nguoi_dung", "Người dùng"]] as const;

export function NhapForm() {
  const [loai, setLoai] = useState<(typeof LOAI)[number][0]>("khoa");
  const [file, setFile] = useState<File | null>(null);
  const [xt, xemAction, dangXem] = useActionState(xemTruoc, {} as KetQuaXemTruoc);
  const [kq, setKq] = useState<KetQuaApDung | null>(null);
  const [daTaiMk, setDaTaiMk] = useState(false);
  const [dangApDung, start] = useTransition();
  const soLoi = xt.dong?.filter((d) => d.loi.length).length ?? 0;
  const soDung = (xt.dong?.length ?? 0) - soLoi;

  function chay(boQua: boolean) {
    if (!file) return;
    const fd = new FormData();
    fd.set("loai", loai); fd.set("file", file); fd.set("bo_qua_loi", boQua ? "1" : "0");
    start(async () => { setKq(await apDung(fd)); setDaTaiMk(false); });
  }
  function taiMatKhau() {
    if (!kq?.fileMatKhau || daTaiMk) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([Uint8Array.from(atob(kq.fileMatKhau), (c) => c.charCodeAt(0))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = "mat-khau-tam.xlsx";
    a.click();
    setDaTaiMk(true);
    setKq({ ...kq, fileMatKhau: undefined }); // bỏ khỏi bộ nhớ: chỉ tải được một lần
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {LOAI.map(([k, n]) => (
          <button key={k} type="button" onClick={() => { setLoai(k); setKq(null); }}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${loai === k ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300"}`}>{n}</button>
        ))}
      </div>
      <form action={xemAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <a href={`/admin/nhap-du-lieu/mau?loai=${loai}`} className="inline-block text-sm font-semibold text-blue-700">⬇ Tải file mẫu</a>
        <input type="hidden" name="loai" value={loai} />
        <input type="file" name="file" accept=".xlsx" required onChange={(e) => { setFile(e.target.files?.[0] ?? null); setKq(null); }} className="block text-sm" />
        <button disabled={dangXem || !file} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{dangXem ? "Đang kiểm tra..." : "Kiểm tra và xem trước"}</button>
        {xt.loi && <p className="text-sm text-red-700">{xt.loi}</p>}
      </form>

      {xt.dong && (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm"><b className="text-green-700">{soDung} dòng hợp lệ</b> · <b className={soLoi ? "text-red-700" : ""}>{soLoi} dòng lỗi</b></p>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left"><tr><th className="p-1">Dòng</th><th className="p-1">Dữ liệu</th><th className="p-1">Kết quả kiểm tra</th></tr></thead>
              <tbody>{xt.dong.map((d) => (
                <tr key={d.dong} className={`border-t ${d.loi.length ? "bg-red-50" : ""}`}>
                  <td className="p-1 tabular-nums">{d.dong}</td><td className="p-1">{d.tho.filter(Boolean).join(" · ")}</td>
                  <td className={`p-1 ${d.loi.length ? "text-red-700" : "text-green-700"}`}>{d.loi.length ? d.loi.join("; ") : "✓ Hợp lệ"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={dangApDung || soLoi > 0 || !soDung} onClick={() => chay(false)} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Áp dụng tất cả</button>
            {soLoi > 0 && soDung > 0 && <button type="button" disabled={dangApDung} onClick={() => chay(true)} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-800">Bỏ qua {soLoi} dòng lỗi, áp dụng {soDung} dòng</button>}
            {dangApDung && <span className="text-sm text-slate-500">Đang ghi...</span>}
          </div>
          {soLoi > 0 && <p className="text-xs text-slate-500">“Áp dụng tất cả” chỉ chạy khi không còn dòng lỗi (ghi hết hoặc không ghi gì).</p>}
        </section>
      )}

      {kq?.loi && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{kq.loi}</p>}
      {kq?.thanhCong && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{kq.thanhCong}</p>}
      {kq?.fileMatKhau && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">Danh sách mật khẩu tạm chỉ tải được MỘT LẦN, không lưu trên hệ thống.</p>
          <button type="button" onClick={taiMatKhau} className="mt-2 rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white">⬇ Tải danh sách mật khẩu tạm</button>
        </div>
      )}
      {daTaiMk && <p className="text-sm text-slate-600">Đã tải. Hãy gửi riêng cho từng người và xóa file sau khi gửi.</p>}
    </div>
  );
}
