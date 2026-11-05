"use client";

import { useRef } from "react";

export type DongDuLieu = Record<string, string | number | null>;

/** Tải dữ liệu nền dạng CSV (Excel mở được, giữ dấu tiếng Việt nhờ BOM UTF-8). */
function taiCsv(ten: string, dong: DongDuLieu[]) {
  if (!dong.length) return;
  const cot = Object.keys(dong[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [cot.map(esc).join(","), ...dong.map((d) => cot.map((c) => esc(d[c])).join(","))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `${ten}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Xuất biểu đồ (SVG của Recharts) thành ảnh PNG. */
async function taiAnh(ten: string, khung: HTMLElement | null) {
  const svg = khung?.querySelector("svg.recharts-surface") as SVGSVGElement | null;
  if (!svg) return;
  const { width, height } = svg.getBoundingClientRect();
  const ban = svg.cloneNode(true) as SVGSVGElement;
  ban.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  ban.setAttribute("width", String(width));
  ban.setAttribute("height", String(height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(ban)], { type: "image/svg+xml" }));
  const img = new Image();
  await new Promise((ok) => { img.onload = ok; img.src = url; });
  const c = document.createElement("canvas");
  c.width = width * 2;
  c.height = height * 2;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.scale(2, 2);
  g.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `${ten}.png`;
  a.click();
}

export function KhungBieuDo({ tieuDe, moTa, ten, duLieu, coAnh = true, children }: {
  tieuDe: string; moTa?: string; ten: string; duLieu: DongDuLieu[]; coAnh?: boolean; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{tieuDe}</h2>
          {moTa && <p className="text-xs text-slate-500">{moTa}</p>}
        </div>
        <div className="flex gap-1">
          {coAnh && <button type="button" onClick={() => taiAnh(ten, ref.current)} className="rounded border border-slate-300 px-2 py-1 text-xs">Tải ảnh</button>}
          <button type="button" onClick={() => taiCsv(ten, duLieu)} disabled={!duLieu.length} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40">Tải dữ liệu</button>
        </div>
      </div>
      <div ref={ref}>{duLieu.length ? children : <p className="py-6 text-center text-sm text-slate-500">Chưa có dữ liệu trong khoảng này.</p>}</div>
    </section>
  );
}
