import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NutDatLaiMatKhau, TaoNguoiDungForm } from "./create-form";
import { doiKhoaTaiKhoan, suaNguoiDung } from "./actions";

export default async function NguoiDungPage() {
  const toi = await requireRole("admin");
  const supabase = await createClient();
  const { data: dsKhoaTatCa } = await supabase.from("khoa").select("id, ten_khoa, active").order("ten_khoa");
  const dsKhoa = (dsKhoaTatCa ?? []).filter((k) => k.active);
  const { data: dsNguoiDung } = await supabase.from("nguoi_dung").select("*").order("ho_ten");
  const tenKhoa = new Map((dsKhoaTatCa ?? []).map((k) => [k.id, k.ten_khoa]));
  const o = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">← Quản trị</Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Tài khoản người dùng</h1>
        <p className="text-sm text-slate-500">Không xóa tài khoản; khóa để chặn truy cập ngay lập tức.</p>
      </div>

      <TaoNguoiDungForm dsKhoa={dsKhoa} />

      <ul className="space-y-2">
        {(dsNguoiDung ?? []).map((nd) => (
          <li key={nd.id} className={`space-y-2 rounded-xl border p-3 shadow-sm ${nd.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{nd.ho_ten} {nd.id === toi.nguoiDung.id && <span className="text-xs text-slate-500">(bạn)</span>}</p>
              <p className="text-xs text-slate-500">
                {nd.email ?? "—"} · {nd.active ? "Đang hoạt động" : "ĐÃ KHÓA"}
                {nd.phai_doi_mat_khau ? " · chưa đổi mật khẩu tạm" : ""}
                {nd.khoa_id ? ` · ${tenKhoa.get(nd.khoa_id) ?? ""}` : ""}
              </p>
            </div>
            <form action={suaNguoiDung.bind(null, nd.id)} className="grid gap-2 sm:grid-cols-4">
              <input name="ho_ten" defaultValue={nd.ho_ten} className={`${o} sm:col-span-2`} />
              <select name="vai_tro" defaultValue={nd.vai_tro} className={o}>
                <option value="truong_khoa">Trưởng khoa</option>
                <option value="ban_giam_doc">Ban Giám đốc</option>
                <option value="admin">Quản trị viên</option>
              </select>
              <select name="khoa_id" defaultValue={nd.khoa_id ?? ""} className={o}>
                <option value="">— Không thuộc khoa —</option>
                {dsKhoa.map((k) => <option key={k.id} value={k.id}>{k.ten_khoa}</option>)}
              </select>
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 sm:col-span-4">Lưu thay đổi họ tên / vai trò / khoa</button>
            </form>
            <div className="flex flex-wrap gap-2">
              {nd.id !== toi.nguoiDung.id && (
                <form action={doiKhoaTaiKhoan.bind(null, nd.id, nd.active)}>
                  <button className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${nd.active ? "border border-red-300 text-red-700" : "bg-green-600 text-white"}`}>
                    {nd.active ? "Khóa tài khoản" : "Mở khóa"}
                  </button>
                </form>
              )}
              <NutDatLaiMatKhau nguoiDungId={nd.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
