import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getPhienOrNotFound, phan1DaDayDu, layDanhSachPhongTheoTienDo } from "@/lib/phien";
import { capNhatThongTinPhong } from "./actions";

export default async function DanhSachPhongPage({
  params,
}: {
  params: Promise<{ phienId: string }>;
}) {
  const { phienId } = await params;
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);

  if (!phan1DaDayDu(phien)) {
    redirect(`/di-buong/${phienId}/phan-1`);
  }

  const danhSachPhong = await layDanhSachPhongTheoTienDo(phien);
  const chiXem = phien.trang_thai === "hoan_thanh" && user.nguoiDung.vai_tro !== "admin";

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/di-buong/${phienId}`} className="text-sm text-blue-600">
          ← Tổng quan phiên
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Danh sách phòng</h1>
        <p className="text-sm text-slate-500">
          Nhập ĐD phụ trách và tổng số người bệnh, sau đó chọn phòng để chấm 35 mục kiểm tra.
        </p>
      </div>

      {danhSachPhong.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Khoa chưa có phòng bệnh nào. Vui lòng liên hệ admin để thêm phòng.
        </p>
      )}

      <ul className="space-y-3">
        {danhSachPhong.map((p) => (
          <li key={p.phienKiemTraPhongId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{p.phongBenh.so_phong}</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  p.soMucDaCham === p.tongMuc
                    ? "bg-green-100 text-green-700"
                    : p.soMucDaCham === 0
                    ? "bg-slate-100 text-slate-500"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {p.soMucDaCham}/{p.tongMuc} mục
              </span>
            </div>

            {!chiXem ? (
              <form
                action={capNhatThongTinPhong.bind(null, phienId, p.phienKiemTraPhongId)}
                className="mb-3 grid grid-cols-2 gap-2"
              >
                <input
                  type="text"
                  name="ten_dd_phu_trach"
                  placeholder="Tên ĐD phụ trách"
                  defaultValue={p.tenDdPhuTrach ?? ""}
                  className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  name="tong_so_nguoi_benh"
                  placeholder="Tổng số NB"
                  defaultValue={p.tongSoNguoiBenh ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 active:bg-slate-100"
                >
                  Lưu
                </button>
              </form>
            ) : (
              <p className="mb-3 text-sm text-slate-600">
                ĐD phụ trách: {p.tenDdPhuTrach || "—"} · Tổng số NB: {p.tongSoNguoiBenh ?? "—"}
              </p>
            )}

            <Link
              href={`/di-buong/${phienId}/phong/${p.phongBenh.id}`}
              className="block w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-bold text-white active:bg-blue-700"
            >
              {chiXem ? "Xem 35 mục kiểm tra" : "Chấm 35 mục kiểm tra →"}
            </Link>
          </li>
        ))}
      </ul>

      {!chiXem && danhSachPhong.length > 0 && (
        <Link
          href={`/di-buong/${phienId}/hoan-thanh`}
          className="block w-full rounded-xl bg-slate-900 py-4 text-center text-base font-bold text-white active:bg-slate-800"
        >
          Đã xong các phòng, sang bước hoàn thành →
        </Link>
      )}
    </div>
  );
}
