"use client";

import { useActionState } from "react";
import { doiMatKhau, type DoiMatKhauState } from "./actions";

const init: DoiMatKhauState = {};
const o = "w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

export function DoiMatKhauForm() {
  const [state, action, pending] = useActionState(doiMatKhau, init);
  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu mới (ít nhất 8 ký tự)</span>
        <input name="mat_khau_moi" type="password" autoComplete="new-password" minLength={8} required className={o} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Nhập lại mật khẩu mới</span>
        <input name="nhap_lai" type="password" autoComplete="new-password" minLength={8} required className={o} />
      </label>
      {state.loi && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.loi}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Đang lưu..." : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}
