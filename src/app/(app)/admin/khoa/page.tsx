import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { themKhoa, suaKhoa, doiTrangThaiKhoa } from "./actions";

export default async function KhoaPage() {
  const supabase = await createClient();
  const { data: dsKhoa } = await supabase.from("khoa").select("*").order("ten_khoa");

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">
          ← Quản trị
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Danh mục Khoa</h1>
      </div>

      <form action={themKhoa} className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          type="text"
          name="ten_khoa"
          required
          placeholder="Tên khoa mới, vd. Khoa Nội tổng hợp"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Thêm
        </button>
      </form>

      <ul className="space-y-2">
        {(dsKhoa ?? []).map((k) => (
          <li key={k.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <form action={suaKhoa.bind(null, k.id)} className="flex flex-1 gap-2">
              <input
                type="text"
                name="ten_khoa"
                defaultValue={k.ten_khoa}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600">
                Lưu
              </button>
            </form>
            <form action={doiTrangThaiKhoa.bind(null, k.id, !k.active)}>
              <button
                type="submit"
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  k.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {k.active ? "Đang hoạt động" : "Đã ẩn"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
