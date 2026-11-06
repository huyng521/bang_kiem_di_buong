import type { Metadata } from "next";
import { Suspense } from "react";
import { UngDungNgoaiTuyen } from "./ung-dung";

export const metadata: Metadata = { title: "Đi buồng (dùng được khi mất mạng)" };

// Trang vỏ: toàn bộ dữ liệu đọc từ máy (IndexedDB) nên service worker lưu sẵn để mở được khi mất mạng.
export default function NgoaiTuyenPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Đang mở dữ liệu…</p>}>
      <UngDungNgoaiTuyen />
    </Suspense>
  );
}
