import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, phan1DaDayDu, layDanhSachPhongTheoTienDo } from "@/lib/phien";

export default async function TongQuanPhienPage({
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

  const supabase = await createClient();
  const { data: khoa } = await supabase.from("khoa").select("ten_khoa").eq("id", phien.khoa_id).maybeSingle();
  const { data: nguoiKiemTra } = await supabase
    .from("nguoi_dung")
    .select("ho_ten")
    .eq("id", phien.nguoi_kiem_tra_id)
    .maybeSingle();

  const danhSachPhong = await layDanhSachPhongTheoTienDo(phien);
  const tongDaCham = danhSachPhong.reduce((s, p) => s + p.soMucDaCham, 0);
  const tongMuc = danhSachPhong.reduce((s, p) => s + p.tongMuc, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Đi buồng {new Date(phien.ngay_bao_cao).toLocaleDateString("vi-VN")}
          </h1>
          <p className="text-sm text-slate-500">
            {khoa?.ten_khoa} · {nguoiKiemTra?.ho_ten}
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
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Tiến độ chấm điểm: <strong>{tongDaCham}</strong>/{tongMuc} mục ({danhSachPhong.length} phòng)
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href={`/di-buong/${phienId}/phan-1`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:bg-slate-50"
        >
          Phần I — Tổng quan hành chính
        </Link>
        <Link
          href={`/di-buong/${phienId}/phong`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:bg-slate-50"
        >
          Phần II — Danh sách phòng ({danhSachPhong.length})
        </Link>
        {phien.trang_thai === "draft" && (
          <Link
            href={`/di-buong/${phienId}/hoan-thanh`}
            className="rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white active:bg-slate-800"
          >
            Hoàn thành phiên
          </Link>
        )}
        <a
          href={`/di-buong/${phienId}/export`}
          className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-700 active:bg-blue-100"
        >
          ⬇ Xuất Excel
        </a>
      </div>

      {(phien.y_kien_van_de_nguoi_benh || phien.bien_phap_khac_phuc) && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          {phien.y_kien_van_de_nguoi_benh && (
            <p>
              <span className="font-medium text-slate-700">Ý kiến/vấn đề người bệnh: </span>
              {phien.y_kien_van_de_nguoi_benh}
            </p>
          )}
          {phien.bien_phap_khac_phuc && (
            <p>
              <span className="font-medium text-slate-700">Biện pháp khắc phục: </span>
              {phien.bien_phap_khac_phuc}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
