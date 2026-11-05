import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhienOrNotFound, layHoacTaoPhienKiemTraPhong, phienCoTheSua } from "@/lib/phien";
import { ChecklistForm } from "./checklist-form";
import { kyDuongDanAnh } from "@/lib/anh-server";

export default async function ChecklistPhongPage({
  params,
}: {
  params: Promise<{ phienId: string; phongId: string }>;
}) {
  const { phienId, phongId } = await params;
  const user = await requireRole("truong_khoa", "admin", "ban_giam_doc");
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
    .select("id, checklist_item_id, trang_thai, ghi_chu")
    .eq("phien_kiem_tra_phong_id", phienKiemTraPhong.id);

  const ketQuaTheoMuc = new Map((ketQua ?? []).map((k) => [k.checklist_item_id, k]));
  const idsKetQua = (ketQua ?? []).map((k) => k.id);
  const { data: dongAnh } = idsKetQua.length
    ? await supabase
        .from("minh_chung_anh")
        .select("id, storage_path, ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id, loai")
        .in("ket_qua_kiem_tra_id", idsKetQua)
        .order("thoi_gian_tai_len")
    : { data: [] };
  const anh = await kyDuongDanAnh(dongAnh ?? []);
  const itemTheoKetQua = new Map((ketQua ?? []).map((k) => [k.id, k.checklist_item_id]));
  const anhTheoMuc = new Map<string, { id: string; url: string }[]>();
  for (const a of anh) {
    const muc = itemTheoKetQua.get(a.ket_qua_kiem_tra_id ?? "");
    if (muc) anhTheoMuc.set(muc, [...(anhTheoMuc.get(muc) ?? []), { id: a.id, url: a.url }]);
  }
  const chiXem = !phienCoTheSua(phien, user.nguoiDung.vai_tro);

  return (
    <div className="space-y-4 pb-20">
      <div>
        <Link href={`/di-buong/${phienId}/phong`} className="text-sm text-blue-600">
          ← Danh sách phòng
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">{phongBenh.so_phong}</h1>
        <p className="text-sm text-slate-500">{(mucKiemTra ?? []).length} mục kiểm tra{chiXem ? " — chỉ xem." : " — chạm để chấm, tự động lưu."}</p>
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
          anh: anhTheoMuc.get(m.id) ?? [],
        }))}
      />
    </div>
  );
}
