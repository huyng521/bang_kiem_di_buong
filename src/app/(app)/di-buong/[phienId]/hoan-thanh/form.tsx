"use client";

import { useActionState } from "react";
import { luuGhiChuChung, type HoanThanhState } from "./actions";

const initialState: HoanThanhState = {};

export function HoanThanhForm({
  phienId,
  yKienBanDau,
  bienPhapBanDau,
}: {
  phienId: string;
  yKienBanDau: string;
  bienPhapBanDau: string;
}) {
  const luuVoiId = luuGhiChuChung.bind(null, phienId);
  const [state, formAction, pending] = useActionState(luuVoiId, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label htmlFor="y_kien_van_de_nguoi_benh" className="mb-1 block text-sm font-medium text-slate-700">
          Ý kiến/vấn đề của người bệnh
        </label>
        <textarea
          id="y_kien_van_de_nguoi_benh"
          name="y_kien_van_de_nguoi_benh"
          rows={3}
          defaultValue={yKienBanDau}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="bien_phap_khac_phuc" className="mb-1 block text-sm font-medium text-slate-700">
          Biện pháp khắc phục
        </label>
        <textarea
          id="bien_phap_khac_phuc"
          name="bien_phap_khac_phuc"
          rows={3}
          defaultValue={bienPhapBanDau}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state.loi && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.loi}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 active:bg-slate-100 disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Lưu ghi chú"}
      </button>
    </form>
  );
}
