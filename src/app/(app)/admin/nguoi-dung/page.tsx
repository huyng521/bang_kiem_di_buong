import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaoNguoiDungForm } from "./create-form";
import { suaNguoiDung, doiTrangThaiNguoiDung } from "./actions";

const NHAN_VAI_TRO: Record<string, string> = {
  admin: "Quản trị viên",
  truong_khoa: "Trưởng khoa",
  ban_giam_doc: "Ban Giám đốc",
};

export default async function NguoiDungPage() {
  const supabase = await createClient();
  const { data: dsKhoaTatCa } = await supabase.from("khoa").select("id, ten_khoa, active").order("ten_khoa");
  const dsKhoa = (dsKhoaTatCa ?? []).filter((k) => k.active);
  const { data: dsNguoiDung } = await supabase
    .from("nguoi_dung")
    .select("*")
    .order("created_at", { ascending: false });

  const tenKhoaTheoId = new Map((dsKhoaTatCa ?? []).map((k) => [k.id, k.ten_khoa]));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">
          ← Quản trị
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Người dùng</h1>
      </div>

      <TaoNguoiDungForm dsKhoa={dsKhoa ?? []} />

      <ul className="space-y-2">
        {(dsNguoiDung ?? []).map((nd) => (
          <li key={nd.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <form action={suaNguoiDung.bind(null, nd.id)} className="grid grid-cols-2 gap-2">
              <input
                type="text"
                name="ho_ten"
                defaultValue={nd.ho_ten}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select name="vai_tro" defaultValue={nd.vai_tro} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="truong_khoa">Trưởng khoa</option>
                <option value="ban_giam_doc">Ban Giám đốc</option>
                <option value="admin">Quản trị viên</option>
              </select>
              <select name="khoa_id" defaultValue={nd.khoa_id ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">— Không thuộc khoa —</option>
                {(dsKhoa ?? []).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ten_khoa}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600"
              >
                Lưu thay đổi
              </button>
              <span className="self-center text-xs text-slate-500">
                Vai trò hiện tại: {NHAN_VAI_TRO[nd.vai_tro]}
                {nd.khoa_id && tenKhoaTheoId.has(nd.khoa_id) ? ` · ${tenKhoaTheoId.get(nd.khoa_id)}` : ""}
              </span>
            </form>
            <form action={doiTrangThaiNguoiDung.bind(null, nd.id, !nd.active)} className="mt-2">
              <button
                type="submit"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  nd.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {nd.active ? "Đang hoạt động (bấm để khóa)" : "Đã khóa (bấm để mở lại)"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
