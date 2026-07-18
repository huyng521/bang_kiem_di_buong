import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getPhienOrNotFound, phienCoTheSua } from "@/lib/phien";
import { HoanThanhForm } from "./form";
import { hoanThanhPhien } from "./actions";

export default async function HoanThanhPage({
  params,
}: {
  params: Promise<{ phienId: string }>;
}) {
  const { phienId } = await params;
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);

  if (!phienCoTheSua(phien, user.nguoiDung.vai_tro)) {
    redirect(`/di-buong/${phienId}`);
  }

  const hoanThanhVoiId = hoanThanhPhien.bind(null, phienId);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/di-buong/${phienId}/phong`} className="text-sm text-blue-600">
          ← Danh sách phòng
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Hoàn thành buổi đi buồng</h1>
      </div>

      <HoanThanhForm
        phienId={phienId}
        yKienBanDau={phien.y_kien_van_de_nguoi_benh ?? ""}
        bienPhapBanDau={phien.bien_phap_khac_phuc ?? ""}
      />

      <form action={hoanThanhVoiId}>
        <button
          type="submit"
          className="w-full rounded-xl bg-green-600 px-4 py-4 text-base font-bold text-white active:bg-green-700"
        >
          ✓ Hoàn thành phiên kiểm tra
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          Sau khi hoàn thành, phiên sẽ bị khóa và không thể sửa (trừ admin).
        </p>
      </form>
    </div>
  );
}
