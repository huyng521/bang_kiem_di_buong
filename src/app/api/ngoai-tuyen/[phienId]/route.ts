import { NextResponse } from "next/server";
import { nguoiDungApi } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { layDanhSachPhongTheoTienDo, phienCoTheSua } from "@/lib/phien";
import type { BanSaoPhien } from "@/lib/ngoai-tuyen/kieu";
import { TRUONG_PHIEN_CHO_PHEP } from "@/lib/ngoai-tuyen/kieu";

// Tải toàn bộ dữ liệu cần để nhập một phiên khi mất mạng.
export async function GET(_r: Request, { params }: { params: Promise<{ phienId: string }> }) {
  const u = await nguoiDungApi();
  if (u instanceof NextResponse) return u;
  const { phienId } = await params;
  const supabase = await createClient();
  const { data: phien } = await supabase.from("phien_kiem_tra").select("*").eq("id", phienId).maybeSingle();
  if (!phien) return NextResponse.json({ loi: "Không tìm thấy phiên" }, { status: 404 });
  const coTheSua = phienCoTheSua(phien, u.nguoiDung.vai_tro);
  const phong = await layDanhSachPhongTheoTienDo(phien, coTheSua); // tạo sẵn dòng phòng cho phiên nháp
  const [{ data: muc }, { data: khoa }, { data: nguoi }, { data: kq }] = await Promise.all([
    supabase.from("checklist_item").select("id, stt, noi_dung, ghi_chu_huong_dan").eq("checklist_version_id", phien.checklist_version_id).eq("active", true).order("stt"),
    supabase.from("khoa").select("ten_khoa").eq("id", phien.khoa_id).maybeSingle(),
    supabase.from("nguoi_dung").select("ho_ten").eq("id", phien.nguoi_kiem_tra_id).maybeSingle(),
    phong.length ? supabase.from("ket_qua_kiem_tra").select("phien_kiem_tra_phong_id, checklist_item_id, trang_thai, ghi_chu, cap_nhat_luc").in("phien_kiem_tra_phong_id", phong.map((p) => p.phienKiemTraPhongId)) : Promise.resolve({ data: [] }),
  ]);
  const truong: BanSaoPhien["phien"] = { ngay_bao_cao: phien.ngay_bao_cao, trang_thai: phien.trang_thai };
  for (const k of TRUONG_PHIEN_CHO_PHEP) truong[k] = (phien as unknown as Record<string, string | number | null>)[k];
  const ban: BanSaoPhien = {
    phienId, taiLuc: new Date().toISOString(), tenKhoa: khoa?.ten_khoa ?? "", nguoiBaoCao: nguoi?.ho_ten ?? "", coTheSua,
    phien: truong,
    muc: muc ?? [],
    phong: phong.map((p) => ({ pktpId: p.phienKiemTraPhongId, soPhong: p.phongBenh.so_phong, tenDd: p.tenDdPhuTrach, tongNb: p.tongSoNguoiBenh })),
    ketQua: Object.fromEntries((kq ?? []).map((k) => [`${k.phien_kiem_tra_phong_id}:${k.checklist_item_id}`, { tt: k.trang_thai, gc: k.ghi_chu, luc: k.cap_nhat_luc }])),
  };
  return NextResponse.json(ban, { headers: { "Cache-Control": "no-store" } });
}
