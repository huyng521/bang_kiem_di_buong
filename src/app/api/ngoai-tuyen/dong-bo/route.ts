import { NextResponse, type NextRequest } from "next/server";
import { nguoiDungApi } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { TRUONG_PHIEN_CHO_PHEP, type KetQuaDongBo, type ThayDoi } from "@/lib/ngoai-tuyen/kieu";
import type { PhienKiemTra, TrangThaiKq } from "@/types/database";

const TT: (TrangThaiKq | null)[] = ["dat_co", "khong_dat", "khong_co_bo_chuan", null];

// Nhận hàng đợi thay đổi từ thiết bị, áp dụng theo thứ tự. Dừng ở lỗi đầu tiên để giữ đúng thứ tự.
export async function POST(request: NextRequest) {
  const u = await nguoiDungApi();
  if (u instanceof NextResponse) return u;
  const { phienId, thayDoi } = (await request.json()) as { phienId: string; thayDoi: ThayDoi[] };
  if (!phienId || !Array.isArray(thayDoi) || thayDoi.length > 2000) return NextResponse.json({ loi: "Dữ liệu không hợp lệ" }, { status: 400 });
  const supabase = await createClient();
  const ketQua: KetQuaDongBo[] = [];

  for (const t of thayDoi) {
    try {
      if (t.loai === "ket_qua") {
        if (!TT.includes(t.tt)) throw new Error("Trạng thái không hợp lệ");
        const { data, error } = await supabase.rpc("dong_bo_ket_qua", { p_pktp: t.pktpId, p_item: t.itemId, p_trang_thai: t.tt, p_ghi_chu: t.gc, p_luc: t.luc });
        if (error) throw new Error(error.message);
        const r = data?.[0];
        ketQua.push(r?.ket_qua === "xung_dot"
          ? { trang_thai: "xung_dot", may_chu: { tt: r.trang_thai_may_chu, gc: r.ghi_chu_may_chu, luc: r.luc_may_chu } }
          : { trang_thai: "ap_dung" });
      } else if (t.loai === "phong") {
        const { data, error } = await supabase.rpc("dong_bo_phong", { p_pktp: t.pktpId, p_ten_dd: t.tenDd, p_tong_nb: t.tongNb, p_luc: t.luc });
        if (error) throw new Error(error.message);
        ketQua.push(data === "xung_dot" ? { trang_thai: "xung_dot" } : { trang_thai: "ap_dung" });
      } else if (t.loai === "phien") {
        const patch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(t.truong)) if ((TRUONG_PHIEN_CHO_PHEP as readonly string[]).includes(k)) patch[k] = v;
        const { data, error } = await supabase.from("phien_kiem_tra").update({ ...(patch as Partial<PhienKiemTra>), cap_nhat_luc: t.luc }).eq("id", phienId).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("Phiên đã khóa hoặc bạn không có quyền sửa.");
        ketQua.push({ trang_thai: "ap_dung" });
      } else throw new Error("Loại thay đổi không hợp lệ");
    } catch (e) {
      ketQua.push({ trang_thai: "loi", thong_bao: e instanceof Error ? e.message : "Lỗi" });
      break;
    }
  }
  return NextResponse.json({ ketQua });
}
