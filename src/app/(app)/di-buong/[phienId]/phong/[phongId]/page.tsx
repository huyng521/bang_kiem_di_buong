import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, layHoacTaoPhienKiemTraPhong, phienCoTheSua } from "@/lib/phien";
import { ChecklistForm } from "./checklist-form";

export default async function ChecklistPhongPage({
  params,
}: {
  params: Promise<{ phienId: string; phongId: string }>;
}) {
  const { phienId, phongId } = await params;
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);
  const supabase = await createClient();

  const { data: phongBenh } = await supabase
    .from("phong_benh")
    .select("id, so_phong")
    .eq("id", phongId)
    .maybeSingle();
  if (!phongBenh) notFound();

  const phienKiemTraPhong = await layHoacTaoPhienKiemTraPhong(phien, phongId);

  const { data: mucKiemTra } = await supabase
    .from("checklist_item")
    .select("id, stt, noi_dung, ghi_chu_huong_dan")
    .eq("checklist_version_id", phien.checklist_version_id)
    .eq("active", true)
    .order("stt");

  const { data: ketQua } = await supabase
    .from("ket_qua_kiem_tra")
    .select("checklist_item_id, trang_thai, ghi_chu")
    .eq("phien_kiem_tra_phong_id", phienKiemTraPhong.id);

  const ketQuaTheoMuc = new Map((ketQua ?? []).map((k) => [k.checklist_item_id, k]));
  const chiXem = !phienCoTheSua(phien, user.nguoiDung.vai_tro);

  return (
    <div className="space-y-4 pb-20">
      <div>
        <Link href={`/di-buong/${phienId}/phong`} className="text-sm text-blue-600">
          ← Danh sách phòng
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">{phongBenh.so_phong}</h1>
        <p className="text-sm text-slate-500">35 mục kiểm tra — chạm để chấm, tự động lưu.</p>
      </div>

      <ChecklistForm
        phienId={phienId}
        phienKiemTraPhongId={phienKiemTraPhong.id}
        readOnly={chiXem}
        items={(mucKiemTra ?? []).map((m) => ({
          id: m.id,
          stt: m.stt,
          noiDung: m.noi_dung,
          ghiChuHuongDan: m.ghi_chu_huong_dan,
          ketQuaBanDau: ketQuaTheoMuc.get(m.id) ?? null,
        }))}
      />
    </div>
  );
}
