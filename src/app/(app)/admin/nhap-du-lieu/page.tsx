import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { NhapForm } from "./nhap-form";

export default async function NhapDuLieuPage() {
  await requireRole("admin");
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-blue-600">← Quản trị</Link>
        <h1 className="mt-1 text-lg font-bold">Nhập hàng loạt từ Excel</h1>
        <p className="text-sm text-slate-500">Thứ tự nên làm: 1) Khoa → 2) Phòng bệnh → 3) Người dùng. Hệ thống kiểm tra và hiện lỗi từng dòng trước khi ghi.</p>
      </div>
      <NhapForm />
    </div>
  );
}
