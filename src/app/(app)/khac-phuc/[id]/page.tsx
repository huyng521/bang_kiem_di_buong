import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kyDuongDanAnh } from "@/lib/anh-server";
import { BUOC_TIEP, laQuaHan, MAU_TT_KP, NHAN_TT_KP, NHAN_UU_TIEN } from "@/lib/khac-phuc";
import { hienNgay, hienNgayGio, homNayVN } from "@/lib/thoi-gian";
import { KhungAnh } from "@/components/khung-anh";
import { capNhatHanhDong, chuanBiAnhKhacPhuc, ghiNhanAnhKhacPhuc, xoaAnhKhacPhuc } from "./actions";
import { NutTrangThai } from "./nut-trang-thai";

export default async function ChiTietKhacPhucPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: hd } = await supabase.from("hanh_dong_khac_phuc").select("*").eq("id", id).maybeSingle();
  if (!hd) notFound();

  const [{ data: khoa }, { data: muc }, { data: phien }, { data: lichSu }, { data: dongAnh }, { data: lienKet }] = await Promise.all([
    supabase.from("khoa").select("ten_khoa").eq("id", hd.khoa_id).maybeSingle(),
    supabase.from("checklist_item").select("stt, noi_dung").eq("id", hd.checklist_item_id).maybeSingle(),
    supabase.from("phien_kiem_tra").select("id, ngay_bao_cao").eq("id", hd.phien_kiem_tra_id).maybeSingle(),
    supabase.from("hanh_dong_khac_phuc_lich_su").select("*").eq("hanh_dong_id", id).order("luc"),
    supabase.from("minh_chung_anh").select("id, storage_path, ket_qua_kiem_tra_id, hanh_dong_khac_phuc_id, loai").eq("hanh_dong_khac_phuc_id", id).order("thoi_gian_tai_len"),
    supabase.from("hanh_dong_khac_phuc_ket_qua").select("ket_qua_kiem_tra_id").eq("hanh_dong_id", id),
  ]);
  const ids = [...new Set((lichSu ?? []).map((l) => l.nguoi_id).filter(Boolean) as string[])];
  const { data: nguoi } = ids.length ? await supabase.from("nguoi_dung").select("id, ho_ten").in("id", ids) : { data: [] };
  const anh = await kyDuongDanAnh(dongAnh ?? []);
  const vt = user.nguoiDung.vai_tro;
  const ketThuc = hd.trang_thai === "da_xac_nhan" || hd.trang_thai === "huy";
  const choSua = vt === "admin" || (vt === "truong_khoa" && hd.khoa_id === user.nguoiDung.khoa_id && !ketThuc);
  const quaHan = laQuaHan(hd, homNayVN());
  const o = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50";

  return (
    <div className="space-y-4">
      <div>
        <Link href="/khac-phuc" className="text-sm text-blue-600">← Việc cần khắc phục</Link>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold text-slate-900">{muc ? `Mục ${muc.stt}: ${muc.noi_dung}` : "Hành động khắc phục"}</h1>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${MAU_TT_KP[hd.trang_thai]}`}>{NHAN_TT_KP[hd.trang_thai]}</span>
        </div>
        <p className="text-sm text-slate-500">
          {khoa?.ten_khoa} · Phiên{" "}
          {phien ? <Link className="text-blue-600" href={`/di-buong/${phien.id}`}>{hienNgay(phien.ngay_bao_cao)}</Link> : "—"} · {(lienKet ?? []).length} ô không đạt
        </p>
        {quaHan && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Quá hạn xử lý ({hienNgay(hd.han_xu_ly)})</p>}
        {hd.trang_thai === "huy" && <p className="mt-2 text-sm text-slate-600">Lý do hủy: {hd.ly_do_huy}</p>}
      </div>

      <form action={capNhatHanhDong.bind(null, id)} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <fieldset disabled={!choSua} className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">Mô tả vấn đề<textarea name="mo_ta_van_de" rows={2} defaultValue={hd.mo_ta_van_de} className={o} /></label>
          <label className="block text-xs font-medium text-slate-600">Biện pháp<textarea name="bien_phap" rows={2} defaultValue={hd.bien_phap ?? ""} className={o} /></label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="col-span-2 block text-xs font-medium text-slate-600 sm:col-span-1">Người phụ trách<input name="nguoi_phu_trach" defaultValue={hd.nguoi_phu_trach ?? ""} className={o} /></label>
            <label className="block text-xs font-medium text-slate-600">Hạn xử lý<input type="date" name="han_xu_ly" defaultValue={hd.han_xu_ly ?? ""} className={o} /></label>
            <label className="block text-xs font-medium text-slate-600">Ưu tiên
              <select name="muc_uu_tien" defaultValue={hd.muc_uu_tien} className={o}>
                {Object.entries(NHAN_UU_TIEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium text-slate-600">Ghi chú khắc phục<textarea name="ghi_chu_khac_phuc" rows={2} defaultValue={hd.ghi_chu_khac_phuc ?? ""} className={o} /></label>
          {choSua && <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">Lưu thông tin</button>}
        </fieldset>
      </form>

      {choSua && BUOC_TIEP[hd.trang_thai].length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cập nhật trạng thái</h2>
          <div className="flex flex-wrap gap-2">
            {BUOC_TIEP[hd.trang_thai].map((den) => (
              <NutTrangThai key={den} id={id} den={den} quayLai={hd.trang_thai === "da_khac_phuc" && den === "dang_xu_ly"} />
            ))}
          </div>
          {hd.trang_thai === "da_khac_phuc" && <p className="text-xs text-slate-500">Hãy kiểm tra lại tại chỗ (có thể chụp ảnh sau khắc phục) trước khi xác nhận.</p>}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ảnh sau khắc phục</h2>
        {anh.length === 0 && !choSua ? (
          <p className="text-sm text-slate-500">Chưa có ảnh.</p>
        ) : (
          <KhungAnh
            ban={anh.map((a) => ({ id: a.id, url: a.url }))}
            choSua={choSua}
            chuanBi={chuanBiAnhKhacPhuc.bind(null, id)}
            ghiNhan={ghiNhanAnhKhacPhuc.bind(null, id)}
            xoa={xoaAnhKhacPhuc.bind(null, id)}
          />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lịch sử</h2>
        <ol className="space-y-1 text-sm">
          {(lichSu ?? []).map((l) => (
            <li key={l.id} className="rounded-lg bg-white px-3 py-2">
              <span className="text-slate-500">{hienNgayGio(l.luc)}</span> · {l.tu_trang_thai ? `${NHAN_TT_KP[l.tu_trang_thai]} → ` : "Tạo · "}
              <b>{NHAN_TT_KP[l.den_trang_thai]}</b> · {nguoi?.find((n) => n.id === l.nguoi_id)?.ho_ten ?? "—"}
              {l.ghi_chu ? <span className="block text-slate-600">{l.ghi_chu}</span> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
