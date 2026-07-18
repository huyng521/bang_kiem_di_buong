import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getPhienOrNotFound } from "@/lib/phien";
import { Phan1Form } from "./form";

export default async function Phan1Page({
  params,
}: {
  params: Promise<{ phienId: string }>;
}) {
  const { phienId } = await params;
  const user = await requireRole("truong_khoa", "admin");
  const phien = await getPhienOrNotFound(phienId, user);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/di-buong" className="text-sm text-blue-600">
          ← Danh sách phiên
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">
          Phần I — Tổng quan hành chính
        </h1>
        <p className="text-sm text-slate-500">
          Nhập thông tin tổng quan của khoa hôm nay trước khi kiểm tra từng phòng.
        </p>
      </div>
      <Phan1Form phienId={phienId} phien={phien} hoTenNguoiBaoCao={user.nguoiDung.ho_ten} />
    </div>
  );
}
