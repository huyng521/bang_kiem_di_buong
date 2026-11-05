import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hienNgay, hienNgayGio } from "@/lib/thoi-gian";
import { taoPhienBanMoi } from "./actions";

const NHAN = { nhap: "Bản nháp", da_cong_bo: "Đã công bố", het_hieu_luc: "Hết hiệu lực" } as const;

export default async function LichSuPhienBanPage({ searchParams }: { searchParams: Promise<{ loi?: string }> }) {
  await requireRole("admin");
  const { loi } = await searchParams;
  const supabase = await createClient();
  const [{ data: ds }, { data: hieuLuc }, { data: nguoi }] = await Promise.all([
    supabase.from("checklist_version").select("*").order("ngay_hieu_luc", { ascending: false }),
    supabase.rpc("phien_ban_hieu_luc", {}),
    supabase.from("nguoi_dung").select("id, ho_ten"),
  ]);
  const { data: demMuc } = await supabase.from("checklist_item").select("checklist_version_id").eq("active", true);
  const soMuc = new Map<string, number>();
  for (const m of demMuc ?? []) soMuc.set(m.checklist_version_id, (soMuc.get(m.checklist_version_id) ?? 0) + 1);
  const coNhap = (ds ?? []).some((v) => v.trang_thai === "nhap");

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">← Quản trị</Link>
        <h1 className="mt-1 text-lg font-bold">Bảng kiểm và lịch sử phiên bản</h1>
        <p className="text-sm text-slate-500">Phiên bản đã công bố không sửa được. Khi có văn bản mới, hãy tạo phiên bản mới — dữ liệu các phiên cũ vẫn giữ đúng phiên bản đã dùng.</p>
      </div>
      {loi && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{loi}</p>}
      {!coNhap && (
        <form action={taoPhienBanMoi} className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <input name="ten" placeholder="Tên phiên bản mới, ví dụ: Ver 3" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Tạo phiên bản mới</button>
        </form>
      )}
      <ul className="space-y-2">
        {(ds ?? []).map((v) => (
          <li key={v.id}>
            <Link href={`/admin/checklist/${v.id}`} className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{v.ten_phien_ban} <span className="text-sm font-normal text-slate-500">· {soMuc.get(v.id) ?? 0} mục</span></p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.id === hieuLuc ? "bg-green-100 text-green-800" : v.trang_thai === "nhap" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                  {v.id === hieuLuc ? "Đang hiệu lực" : NHAN[v.trang_thai]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {v.trang_thai === "nhap" ? "Đang soạn — chưa áp dụng" : `Hiệu lực từ ${hienNgay(v.ngay_hieu_luc)}`}
                {v.ghi_chu_van_ban_can_cu ? ` · Căn cứ: ${v.ghi_chu_van_ban_can_cu}` : ""}
                {v.cong_bo_luc && v.nguoi_cong_bo_id ? ` · Công bố ${hienNgayGio(v.cong_bo_luc)} bởi ${(nguoi ?? []).find((n) => n.id === v.nguoi_cong_bo_id)?.ho_ten ?? ""}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
