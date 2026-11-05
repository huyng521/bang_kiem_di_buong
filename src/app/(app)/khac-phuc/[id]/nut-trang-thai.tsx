"use client";

import { useActionState, useState } from "react";
import type { TrangThaiKhacPhuc } from "@/types/database";
import { doiTrangThai, type DoiTrangThaiState } from "./actions";

const NHAN_NUT: Record<TrangThaiKhacPhuc, string> = {
  moi: "Mới",
  dang_xu_ly: "Bắt đầu xử lý",
  da_khac_phuc: "Đã khắc phục xong",
  da_xac_nhan: "Xác nhận đã kiểm tra lại",
  huy: "Hủy hành động",
};
const init: DoiTrangThaiState = {};

export function NutTrangThai({ id, den, quayLai }: { id: string; den: TrangThaiKhacPhuc; quayLai?: boolean }) {
  const [state, action, pending] = useActionState(doiTrangThai.bind(null, id, den), init);
  const [mo, setMo] = useState(false);
  const nhan = quayLai ? "Chưa đạt, xử lý lại" : NHAN_NUT[den];
  const mau = den === "huy" ? "border border-slate-300 text-slate-600" : den === "da_xac_nhan" ? "bg-green-600 text-white" : "bg-blue-600 text-white";
  if (!mo) return <button type="button" onClick={() => setMo(true)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mau}`}>{nhan}</button>;
  return (
    <form action={action} className="w-full space-y-2 rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-semibold">{nhan}</p>
      {den === "huy" ? (
        <textarea name="ly_do_huy" required rows={2} placeholder="Lý do hủy (bắt buộc)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      ) : (
        <textarea name="ghi_chu_khac_phuc" rows={2} placeholder="Ghi chú (không bắt buộc)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      )}
      {state.loi && <p className="text-sm text-red-700">{state.loi}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mau}`}>{pending ? "Đang lưu..." : "Xác nhận"}</button>
        <button type="button" onClick={() => setMo(false)} className="rounded-lg border px-3 py-2 text-sm">Thôi</button>
      </div>
    </form>
  );
}
