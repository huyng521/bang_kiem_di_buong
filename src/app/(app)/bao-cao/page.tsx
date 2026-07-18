import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function ngayMacDinh() {
  const den = new Date();
  const tu = new Date();
  tu.setDate(tu.getDate() - 29);
  return {
    tu: tu.toISOString().slice(0, 10),
    den: den.toISOString().slice(0, 10),
  };
}

export default async function BaoCaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tu_ngay?: string; den_ngay?: string }>;
}) {
  await requireRole("admin", "ban_giam_doc");
  const { tu_ngay, den_ngay } = await searchParams;
  const macDinh = ngayMacDinh();
  const tuNgay = tu_ngay || macDinh.tu;
  const denNgay = den_ngay || macDinh.den;

  const supabase = await createClient();
  const { data: baoCao, error } = await supabase.rpc("bao_cao_ty_le_dat", {
    p_tu_ngay: tuNgay,
    p_den_ngay: denNgay,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Báo cáo tỷ lệ đạt theo khoa</h1>
        <p className="text-sm text-slate-500">
          Chỉ tính các phiên đã hoàn thành. Mục &quot;Không có/Bỏ chuẩn&quot; được loại khỏi mẫu số.
        </p>
      </div>

      <form className="flex gap-2" method="get">
        <input
          type="date"
          name="tu_ngay"
          defaultValue={tuNgay}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="den_ngay"
          defaultValue={denNgay}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600">
          Lọc
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Khoa</th>
              <th className="px-3 py-2 text-right">Số phiên</th>
              <th className="px-3 py-2 text-right">Tỷ lệ đạt</th>
            </tr>
          </thead>
          <tbody>
            {(baoCao ?? []).map((row) => (
              <tr key={row.khoa_id} className="border-t border-slate-100">
                <td className="px-3 py-2">{row.ten_khoa}</td>
                <td className="px-3 py-2 text-right">{row.so_phien}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  {row.ty_le_dat === null ? "—" : `${row.ty_le_dat}%`}
                </td>
              </tr>
            ))}
            {(baoCao ?? []).length === 0 && !error && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                  Chưa có dữ liệu trong khoảng thời gian này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
