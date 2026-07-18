"use client";

import { useActionState } from "react";
import { taoNguoiDung, type TaoNguoiDungState } from "./actions";

const initialState: TaoNguoiDungState = {};

export function TaoNguoiDungForm({ dsKhoa }: { dsKhoa: { id: string; ten_khoa: string }[] }) {
  const [state, formAction, pending] = useActionState(taoNguoiDung, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">Tạo tài khoản mới</h2>

      <input
        type="text"
        name="ho_ten"
        required
        placeholder="Họ và tên"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="email"
        name="email"
        required
        placeholder="Email đăng nhập"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="text"
        name="mat_khau"
        required
        minLength={6}
        placeholder="Mật khẩu ban đầu (tối thiểu 6 ký tự)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <select name="vai_tro" required defaultValue="truong_khoa" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="truong_khoa">Điều dưỡng/Hộ sinh Trưởng khoa</option>
        <option value="ban_giam_doc">Ban Giám đốc (chỉ xem báo cáo)</option>
        <option value="admin">Quản trị viên</option>
      </select>
      <select name="khoa_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">— Chọn khoa (bắt buộc nếu là Trưởng khoa) —</option>
        {dsKhoa.map((k) => (
          <option key={k.id} value={k.id}>
            {k.ten_khoa}
          </option>
        ))}
      </select>

      {state.loi && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.loi}</p>}
      {state.thanhCong && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.thanhCong}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Đang tạo..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}
