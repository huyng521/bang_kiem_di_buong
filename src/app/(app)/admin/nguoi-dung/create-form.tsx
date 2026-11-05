"use client";

import { useActionState, useState } from "react";
import { datLaiMatKhau, taoNguoiDung, type KetQuaMatKhau } from "./actions";

const init: KetQuaMatKhau = {};

/** Hộp hiện mật khẩu tạm MỘT LẦN: không lưu ở đâu, đóng là mất. */
export function MatKhauTam({ kq, onDong }: { kq: KetQuaMatKhau; onDong?: () => void }) {
  const [daChep, setDaChep] = useState(false);
  if (!kq.matKhauTam) return null;
  const noiDung = `Email: ${kq.email ?? ""}\nMật khẩu tạm: ${kq.matKhauTam}`;
  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-semibold text-amber-900">{kq.thanhCong} Mật khẩu tạm chỉ hiện MỘT LẦN — hãy chép gửi cho người dùng ngay.</p>
      <pre className="overflow-x-auto rounded bg-white p-2 font-mono text-base">{noiDung}</pre>
      <p className="text-amber-800">Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập đầu.</p>
      <div className="flex gap-2">
        <button type="button" className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white"
          onClick={() => navigator.clipboard?.writeText(noiDung).then(() => setDaChep(true), () => {})}>
          {daChep ? "Đã chép" : "Chép"}
        </button>
        {onDong && <button type="button" className="rounded-lg border px-3 py-2" onClick={onDong}>Đã gửi, đóng lại</button>}
      </div>
    </div>
  );
}

export function TaoNguoiDungForm({ dsKhoa }: { dsKhoa: { id: string; ten_khoa: string }[] }) {
  const [state, action, pending] = useActionState(taoNguoiDung, init);
  const [an, setAn] = useState(false);
  const o = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <form action={(fd) => { setAn(false); action(fd); }} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">Tạo tài khoản mới</h2>
      <input name="ho_ten" required placeholder="Họ và tên" className={o} />
      <input name="email" type="email" required placeholder="Email đăng nhập" className={o} />
      <select name="vai_tro" defaultValue="truong_khoa" className={o}>
        <option value="truong_khoa">Điều dưỡng/Hộ sinh Trưởng khoa</option>
        <option value="ban_giam_doc">Ban Giám đốc (chỉ xem)</option>
        <option value="admin">Quản trị viên (Phòng Điều dưỡng/QLCL)</option>
      </select>
      <select name="khoa_id" className={o}>
        <option value="">— Khoa (bắt buộc nếu là Trưởng khoa) —</option>
        {dsKhoa.map((k) => <option key={k.id} value={k.id}>{k.ten_khoa}</option>)}
      </select>
      <p className="text-xs text-slate-500">Hệ thống tự sinh mật khẩu tạm ngẫu nhiên.</p>
      {state.loi && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.loi}</p>}
      {!an && <MatKhauTam kq={state} onDong={() => setAn(true)} />}
      <button disabled={pending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Đang tạo..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}

export function NutDatLaiMatKhau({ nguoiDungId }: { nguoiDungId: string }) {
  const [kq, setKq] = useState<KetQuaMatKhau | null>(null);
  const [xacNhan, setXacNhan] = useState(false);
  const [dangChay, setDangChay] = useState(false);
  if (kq?.matKhauTam) return <MatKhauTam kq={kq} onDong={() => setKq(null)} />;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" disabled={dangChay}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${xacNhan ? "bg-red-600 text-white" : "border border-slate-300 text-slate-600"}`}
        onClick={async () => {
          if (!xacNhan) { setXacNhan(true); return; }
          setDangChay(true); setKq(await datLaiMatKhau(nguoiDungId)); setDangChay(false); setXacNhan(false);
        }}>
        {dangChay ? "Đang đặt lại..." : xacNhan ? "Bấm lần nữa để đặt lại" : "Đặt lại mật khẩu"}
      </button>
      {kq?.loi && <span className="text-xs text-red-700">{kq.loi}</span>}
    </span>
  );
}
