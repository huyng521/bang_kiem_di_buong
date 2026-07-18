import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { themPhongBenh, suaPhongBenh, doiTrangThaiPhongBenh } from "./actions";

export default async function PhongBenhPage({
  searchParams,
}: {
  searchParams: Promise<{ khoa?: string }>;
}) {
  const { khoa: khoaLoc } = await searchParams;
  const supabase = await createClient();
  const { data: dsKhoa } = await supabase.from("khoa").select("id, ten_khoa").eq("active", true).order("ten_khoa");

  const khoaHienTai = khoaLoc || dsKhoa?.[0]?.id;

  const { data: dsPhong } = khoaHienTai
    ? await supabase.from("phong_benh").select("*").eq("khoa_id", khoaHienTai).order("so_phong")
    : { data: [] };

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">
          ← Quản trị
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Danh mục Phòng bệnh</h1>
      </div>

      <form method="get" className="flex gap-2">
        <select
          name="khoa"
          defaultValue={khoaHienTai}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {(dsKhoa ?? []).map((k) => (
            <option key={k.id} value={k.id}>
              {k.ten_khoa}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600">
          Chọn khoa
        </button>
      </form>

      {khoaHienTai && (
        <form action={themPhongBenh} className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <input type="hidden" name="khoa_id" value={khoaHienTai} />
          <input
            type="text"
            name="so_phong"
            required
            placeholder="Vd. Phòng số 1"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Thêm
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {(dsPhong ?? []).map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <form action={suaPhongBenh.bind(null, p.id)} className="flex flex-1 gap-2">
              <input
                type="text"
                name="so_phong"
                defaultValue={p.so_phong}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600">
                Lưu
              </button>
            </form>
            <form action={doiTrangThaiPhongBenh.bind(null, p.id, !p.active)}>
              <button
                type="submit"
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  p.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {p.active ? "Đang dùng" : "Đã ẩn"}
              </button>
            </form>
          </li>
        ))}
        {khoaHienTai && (dsPhong ?? []).length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            Khoa này chưa có phòng bệnh nào.
          </li>
        )}
      </ul>
    </div>
  );
}
