import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DoiMatKhauForm } from "./form";

export default async function DoiMatKhauPage({ searchParams }: { searchParams: Promise<{ khoi_phuc?: string }> }) {
  const user = await requireUser({ boQuaDoiMatKhau: true });
  const { khoi_phuc } = await searchParams;
  const batBuoc = user.nguoiDung.phai_doi_mat_khau;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Đổi mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-500">
            {batBuoc
              ? "Đây là lần đăng nhập đầu (hoặc mật khẩu vừa được đặt lại). Hãy đặt mật khẩu riêng của bạn để tiếp tục."
              : khoi_phuc
              ? "Đặt mật khẩu mới cho tài khoản của bạn."
              : `Tài khoản: ${user.email ?? user.nguoiDung.ho_ten}`}
          </p>
        </div>
        <DoiMatKhauForm />
        {!batBuoc && (
          <p className="text-center text-sm">
            <Link href="/" className="text-blue-600">← Quay lại</Link>
          </p>
        )}
      </div>
    </main>
  );
}
