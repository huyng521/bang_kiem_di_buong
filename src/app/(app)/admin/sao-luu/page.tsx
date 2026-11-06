import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { BANG_SAO_LUU } from "@/lib/sao-luu";

export default async function SaoLuuPage() {
  await requireRole("admin");
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">← Quản trị</Link>
        <h1 className="mt-1 text-lg font-bold">Xuất toàn bộ dữ liệu</h1>
        <p className="text-sm text-slate-500">
          Mỗi bảng một file CSV (mở được bằng Excel). Đây là bản sao lưu phụ, dễ xem; bản sao lưu chính để khôi phục là
          file của Supabase (xem tài liệu vận hành). File ảnh nằm ở Supabase Storage, không có trong các file này.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {BANG_SAO_LUU.map((b) => (
          <li key={b.bang}>
            <a href={`/admin/sao-luu/${b.bang}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm active:bg-slate-50">
              <span>{b.nhan}</span><span className="text-blue-700">⬇ CSV</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
