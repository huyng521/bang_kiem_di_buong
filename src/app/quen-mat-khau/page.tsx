"use client";

import Link from "next/link";
import { useActionState } from "react";
import { guiLinkDatLai, type QuenMatKhauState } from "./actions";

const init: QuenMatKhauState = {};

export default function QuenMatKhauPage() {
  const [state, action, pending] = useActionState(guiLinkDatLai, init);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Quên mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-500">Nhập email đăng nhập, hệ thống sẽ gửi link đặt lại mật khẩu.</p>
        </div>
        {state.daGui ? (
          <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            Nếu email này có tài khoản, một link đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư (cả mục Spam). Nếu không nhận được,
            hãy nhờ Quản trị viên đặt lại mật khẩu tạm.
          </p>
        ) : (
          <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <input name="email" type="email" required placeholder="ten@benhvien.vn" className="w-full rounded-lg border border-slate-300 px-4 py-3" />
            {state.loi && <p className="text-sm text-red-700">{state.loi}</p>}
            <button disabled={pending} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
              {pending ? "Đang gửi..." : "Gửi link đặt lại"}
            </button>
          </form>
        )}
        <p className="text-center text-sm"><Link href="/login" className="text-blue-600">← Về đăng nhập</Link></p>
      </div>
    </main>
  );
}
