"use client";

import { useActionState } from "react";
import type { CauHinhHeThong } from "@/types/database";
import { luuCaiDat, type CaiDatState } from "./actions";

const THU = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const init: CaiDatState = {};

export function CaiDatForm({ ch, logoUrl }: { ch: CauHinhHeThong; logoUrl: string | null }) {
  const [state, action, pending] = useActionState(luuCaiDat, init);
  const o = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium">Tên bệnh viện (đầu trang PDF/Excel)<input name="ten_benh_vien" defaultValue={ch.ten_benh_vien} className={o} /></label>
      <label className="block text-sm font-medium">Tên đơn vị quản lý<input name="ten_don_vi_quan_ly" defaultValue={ch.ten_don_vi_quan_ly} className={o} /></label>
      <div className="space-y-1 text-sm font-medium">
        Logo
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo hiện tại" className="h-14 w-14 rounded border object-contain" />
        )}
        <input type="file" name="logo" accept="image/png,image/jpeg" className="block text-sm" />
        {logoUrl && <label className="flex items-center gap-2 font-normal"><input type="checkbox" name="xoa_logo" value="1" /> Bỏ logo</label>}
      </div>
      <label className="block text-sm font-medium">Mục tiêu tỷ lệ đạt trên dashboard (%)
        <input name="muc_tieu_ty_le_dat" type="number" min={0} max={100} step="0.5" defaultValue={ch.muc_tieu_ty_le_dat} className={o} />
        <span className="block text-xs font-normal text-slate-500">Khác với ngưỡng 90% của từng mục trong văn bản gốc: đây là mục tiêu tổng hợp của khoa.</span>
      </label>
      <fieldset className="text-sm">
        <legend className="font-medium">Ngày phải đi buồng</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {THU.map((t, i) => (
            <label key={t} className="flex items-center gap-1"><input type="checkbox" name="ngay_di_buong" value={i + 1} defaultChecked={ch.ngay_di_buong.includes(i + 1)} /> {t}</label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-medium">Giờ nhắc nếu khoa chưa đi buồng
        <input name="gio_nhac_chua_di_buong" type="time" defaultValue={ch.gio_nhac_chua_di_buong.slice(0, 5)} className={o} />
      </label>
      {state.loi && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.loi}</p>}
      {state.ok && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">Đã lưu cài đặt.</p>}
      <button disabled={pending} className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-60">{pending ? "Đang lưu..." : "Lưu cài đặt"}</button>
    </form>
  );
}
