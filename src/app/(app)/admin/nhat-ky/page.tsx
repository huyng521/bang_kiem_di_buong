import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MOI_TRANG, tomTatThayDoi, truyVanNhatKy, type LocNhatKy } from "@/lib/nhat-ky-server";
import { NHAN_DOI_TUONG, NHAN_HANH_DONG } from "@/lib/nhat-ky";
import { hienNgayGio } from "@/lib/thoi-gian";

export default async function NhatKyPage({ searchParams }: { searchParams: Promise<LocNhatKy> }) {
  await requireRole("admin");
  const loc = await searchParams;
  const trang = Math.max(1, Number(loc.trang) || 1);
  const supabase = await createClient();
  const [{ data: dong, count }, { data: nguoi }, { data: khoa }] = await Promise.all([
    truyVanNhatKy(loc, { tu: (trang - 1) * MOI_TRANG, den: trang * MOI_TRANG - 1 }),
    supabase.from("nguoi_dung").select("id, ho_ten").order("ho_ten"),
    supabase.from("khoa").select("id, ten_khoa").order("ten_khoa"),
  ]);
  const tenNguoi = new Map((nguoi ?? []).map((n) => [n.id, n.ho_ten]));
  const tenKhoa = new Map((khoa ?? []).map((k) => [k.id, k.ten_khoa]));
  const soTrang = Math.max(1, Math.ceil((count ?? 0) / MOI_TRANG));
  const qs = (them: Record<string, string>) => new URLSearchParams({ ...(Object.fromEntries(Object.entries(loc).filter(([, v]) => v)) as Record<string, string>), ...them }).toString();
  const o = "rounded-lg border border-slate-300 px-2 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">← Quản trị</Link>
        <h1 className="mt-1 text-lg font-bold">Nhật ký thao tác</h1>
        <p className="text-sm text-slate-500">Ghi tự động, không ai sửa hoặc xóa được. {count ?? 0} dòng khớp bộ lọc.</p>
      </div>
      <form method="get" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select name="nguoi" defaultValue={loc.nguoi ?? ""} className={o}><option value="">Mọi người</option>{(nguoi ?? []).map((n) => <option key={n.id} value={n.id}>{n.ho_ten}</option>)}</select>
        <select name="khoa" defaultValue={loc.khoa ?? ""} className={o}><option value="">Mọi khoa</option>{(khoa ?? []).map((k) => <option key={k.id} value={k.id}>{k.ten_khoa}</option>)}</select>
        <select name="hanh_dong" defaultValue={loc.hanh_dong ?? ""} className={o}><option value="">Mọi hành động</option>{Object.entries(NHAN_HANH_DONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="loai" defaultValue={loc.loai ?? ""} className={o}><option value="">Mọi đối tượng</option>{Object.entries(NHAN_DOI_TUONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="date" name="tu" defaultValue={loc.tu} className={o} aria-label="Từ ngày" />
        <input type="date" name="den" defaultValue={loc.den} className={o} aria-label="Đến ngày" />
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">Lọc</button>
        <a href={`/admin/nhat-ky/xuat-excel?${qs({})}`} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-700">⬇ Xuất Excel</a>
      </form>
      <ul className="space-y-1.5">
        {(dong ?? []).map((d) => (
          <li key={d.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span><b>{NHAN_HANH_DONG[d.hanh_dong] ?? d.hanh_dong}</b> · {NHAN_DOI_TUONG[d.doi_tuong_loai] ?? d.doi_tuong_loai}{d.khoa_id ? ` · ${tenKhoa.get(d.khoa_id) ?? ""}` : ""}</span>
              <span className="text-xs text-slate-500">{hienNgayGio(d.thoi_gian)} · {d.nguoi_dung_id ? tenNguoi.get(d.nguoi_dung_id) ?? "?" : "Hệ thống"}</span>
            </div>
            {(d.gia_tri_cu || d.gia_tri_moi) && <p className="mt-0.5 break-words text-xs text-slate-600">{tomTatThayDoi(d.gia_tri_cu, d.gia_tri_moi)}</p>}
          </li>
        ))}
        {(dong ?? []).length === 0 && <li className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">Không có dòng nào.</li>}
      </ul>
      <div className="flex items-center justify-between text-sm">
        {trang > 1 ? <Link href={`?${qs({ trang: String(trang - 1) })}`} className="text-blue-600">← Trang trước</Link> : <span />}
        <span className="text-slate-500">Trang {trang}/{soTrang}</span>
        {trang < soTrang ? <Link href={`?${qs({ trang: String(trang + 1) })}`} className="text-blue-600">Trang sau →</Link> : <span />}
      </div>
    </div>
  );
}
