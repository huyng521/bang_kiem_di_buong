"use client";

import { useState, useTransition } from "react";
import type { TrangThaiKq } from "@/types/database";
import { TIEU_CHI_DANH_GIA } from "@/lib/checklist-constants";
import { chamMucKiemTra } from "./actions";

interface MucItem {
  id: string;
  stt: number;
  noiDung: string;
  ghiChuHuongDan: string | null;
  ketQuaBanDau: { trang_thai: TrangThaiKq | null; ghi_chu: string | null } | null;
}

const NUT_TRANG_THAI: { value: TrangThaiKq; nhan: string; active: string; idle: string }[] = [
  {
    value: "dat_co",
    nhan: "Đạt/Có",
    active: "bg-green-600 text-white border-green-600",
    idle: "bg-white text-green-700 border-green-300",
  },
  {
    value: "khong_dat",
    nhan: "Không đạt",
    active: "bg-red-600 text-white border-red-600",
    idle: "bg-white text-red-700 border-red-300",
  },
  {
    value: "khong_co_bo_chuan",
    nhan: "Không có/Bỏ chuẩn",
    active: "bg-slate-600 text-white border-slate-600",
    idle: "bg-white text-slate-600 border-slate-300",
  },
];

function InfoTooltip() {
  return (
    <details className="group relative inline-block">
      <summary className="ml-1 inline-flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-slate-400 text-xs font-bold text-slate-500 select-none">
        i
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg">
        <p className="mb-1">{TIEU_CHI_DANH_GIA.dat_co}</p>
        <p className="mb-1">{TIEU_CHI_DANH_GIA.khong_dat}</p>
        <p>{TIEU_CHI_DANH_GIA.khong_co_bo_chuan}</p>
      </div>
    </details>
  );
}

function MucRow({
  item,
  phienId,
  phienKiemTraPhongId,
  readOnly,
}: {
  item: MucItem;
  phienId: string;
  phienKiemTraPhongId: string;
  readOnly: boolean;
}) {
  const [trangThai, setTrangThai] = useState<TrangThaiKq | null>(item.ketQuaBanDau?.trang_thai ?? null);
  const [ghiChu, setGhiChu] = useState(item.ketQuaBanDau?.ghi_chu ?? "");
  const [hienGhiChu, setHienGhiChu] = useState(Boolean(item.ketQuaBanDau?.ghi_chu));
  const [dangLuu, startTransition] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  function chon(gt: TrangThaiKq) {
    if (readOnly) return;
    setTrangThai(gt);
    setLoi(null);
    startTransition(async () => {
      try {
        await chamMucKiemTra(phienId, phienKiemTraPhongId, item.id, gt, ghiChu);
      } catch {
        setLoi("Lưu thất bại, thử lại.");
      }
    });
  }

  function luuGhiChu() {
    if (readOnly || !trangThai) return;
    startTransition(async () => {
      try {
        await chamMucKiemTra(phienId, phienKiemTraPhongId, item.id, trangThai, ghiChu);
      } catch {
        setLoi("Lưu thất bại, thử lại.");
      }
    });
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">{item.stt}. </span>
          {item.noiDung}
          {item.ghiChuHuongDan && (
            <em className="block text-xs text-slate-500">({item.ghiChuHuongDan})</em>
          )}
        </p>
        <InfoTooltip />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {NUT_TRANG_THAI.map((nut) => (
          <button
            key={nut.value}
            type="button"
            disabled={readOnly}
            onClick={() => chon(nut.value)}
            className={`rounded-lg border py-2.5 text-xs font-semibold ${
              trangThai === nut.value ? nut.active : nut.idle
            } disabled:opacity-60`}
          >
            {nut.nhan}
          </button>
        ))}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={() => setHienGhiChu((v) => !v)}
          className="mt-2 text-xs text-blue-600"
        >
          {hienGhiChu ? "Ẩn ghi chú" : "+ Ghi chú"}
        </button>
      )}

      {(hienGhiChu || (readOnly && ghiChu)) && (
        <textarea
          value={ghiChu}
          disabled={readOnly}
          onChange={(e) => setGhiChu(e.target.value)}
          onBlur={luuGhiChu}
          rows={2}
          placeholder="Ghi chú riêng cho mục này (không bắt buộc)"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      )}

      {dangLuu && <p className="mt-1 text-xs text-slate-400">Đang lưu...</p>}
      {loi && <p className="mt-1 text-xs text-red-600">{loi}</p>}
    </li>
  );
}

export function ChecklistForm({
  phienId,
  phienKiemTraPhongId,
  items,
  readOnly,
}: {
  phienId: string;
  phienKiemTraPhongId: string;
  items: MucItem[];
  readOnly: boolean;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <MucRow
          key={item.id}
          item={item}
          phienId={phienId}
          phienKiemTraPhongId={phienKiemTraPhongId}
          readOnly={readOnly}
        />
      ))}
    </ul>
  );
}
