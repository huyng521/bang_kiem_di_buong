import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batDauDiBuong } from "./actions";

export default async function DiBuongPage({
  searchParams,
}: {
  searchParams: Promise<{ tu_ngay?: string; den_ngay?: string }>;
}) {
  const user = await requireRole("truong_khoa", "admin");
  const { tu_ngay, den_ngay } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("phien_kiem_tra")
    .select("id, ngay_bao_cao, trang_thai, thoi_gian_bat_dau, khoa_id")
    .eq("an", false)
    .order("ngay_bao_cao", { ascending: false })
    .limit(50);

  if (user.nguoiDung.vai_tro === "truong_khoa" && user.nguoiDung.khoa_id) {
    query = query.eq("khoa_id", user.nguoiDung.khoa_id);
  }
  if (tu_ngay) query = query.gte("ngay_bao_cao", tu_ngay);
  if (den_ngay) query = query.lte("ngay_bao_cao", den_ngay);

  const { data: danhSach } = await query;

  const tenKhoaTheoId = new Map<string, string>();
  if (user.nguoiDung.vai_tro === "admin" && danhSach?.length) {
    const { data: dsKhoa } = await supabase.from("khoa").select("id, ten_khoa");
    for (const k of dsKhoa ?? []) tenKhoaTheoId.set(k.id, k.ten_khoa);
  }

  return (
    <div className="space-y-6">
      {user.nguoiDung.vai_tro === "truong_khoa" && (
        <form action={batDauDiBuong}>
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-sm active:bg-blue-700"
          >
            + Bắt đầu đi buồng
          </button>
        </form>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Lịch sử kiểm tra
        </h2>

        <form className="mb-3 flex gap-2" method="get">
          <input
            type="date"
            name="tu_ngay"
            defaultValue={tu_ngay}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="den_ngay"
            defaultValue={den_ngay}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
          >
            Lọc
          </button>
        </form>

        <ul className="space-y-2">
          {(danhSach ?? []).map((phien) => (
            <li key={phien.id}>
              <Link
                href={`/di-buong/${phien.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {new Date(phien.ngay_bao_cao).toLocaleDateString("vi-VN")}
                    {user.nguoiDung.vai_tro === "admin" && tenKhoaTheoId.has(phien.khoa_id) ? (
                      <span className="text-slate-500"> · {tenKhoaTheoId.get(phien.khoa_id)}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    Bắt đầu lúc{" "}
                    {new Date(phien.thoi_gian_bat_dau).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    phien.trang_thai === "hoan_thanh"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {phien.trang_thai === "hoan_thanh" ? "Hoàn thành" : "Đang làm"}
                </span>
              </Link>
            </li>
          ))}
          {(danhSach ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Chưa có phiên kiểm tra nào.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
