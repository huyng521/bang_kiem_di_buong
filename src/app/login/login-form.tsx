"use client";

import { useActionState } from "react";
import { dangNhap, type DangNhapState } from "./actions";

const initialState: DangNhapState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(dangNhap, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="redirect" value={redirectTo} />

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="ten@benhvien.vn"
        />
      </div>

      <div>
        <label htmlFor="mat_khau" className="mb-1 block text-sm font-medium text-slate-700">
          Mật khẩu
        </label>
        <input
          id="mat_khau"
          name="mat_khau"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="••••••••"
        />
      </div>

      {state.loi && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.loi}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition active:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
