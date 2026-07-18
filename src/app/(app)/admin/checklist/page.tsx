import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { suaMucKiemTra, themMucKiemTra, doiTrangThaiMuc } from "./actions";

export default async function ChecklistAdminPage() {
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("checklist_version")
    .select("*")
    .eq("active", true)
    .order("ngay_hieu_luc", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: dsMuc } = version
    ? await supabase
        .from("checklist_item")
        .select("*")
        .eq("checklist_version_id", version.id)
        .order("stt")
    : { data: [] };

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">
          ← Quản trị
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Mục bảng kiểm</h1>
        {version && <p className="text-sm text-slate-500">{version.ten_phien_ban}</p>}
      </div>

      {!version && (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          Chưa có phiên bản bảng kiểm nào đang kích hoạt. Hãy tạo trực tiếp trong Supabase Table
          Editor ở bảng checklist_version.
        </p>
      )}

      {version && (
        <>
          <ul className="space-y-2">
            {(dsMuc ?? []).map((m) => (
              <li key={m.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <form action={suaMucKiemTra.bind(null, m.id)} className="space-y-2">
                  <div className="flex gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                      {m.stt}
                    </span>
                    <textarea
                      name="noi_dung"
                      defaultValue={m.noi_dung}
                      rows={2}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    name="ghi_chu_huong_dan"
                    defaultValue={m.ghi_chu_huong_dan ?? ""}
                    placeholder="Ghi chú hướng dẫn (phần in nghiêng trong ngoặc)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm italic"
                  />
                  <div className="flex justify-between">
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600"
                    >
                      Lưu
                    </button>
                  </div>
                </form>
                <form action={doiTrangThaiMuc.bind(null, m.id, !m.active)} className="mt-2">
                  <button
                    type="submit"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      m.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {m.active ? "Đang dùng (bấm để ẩn)" : "Đã ẩn (bấm để dùng lại)"}
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <form
            action={themMucKiemTra.bind(null, version.id)}
            className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-slate-900">Thêm mục mới</h2>
            <textarea
              name="noi_dung"
              required
              rows={2}
              placeholder="Nội dung mục kiểm tra mới"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              Thêm mục
            </button>
          </form>
        </>
      )}
    </div>
  );
}
