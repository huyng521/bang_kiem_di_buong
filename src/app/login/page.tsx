import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; thong_bao?: string }>;
}) {
  const { redirect, thong_bao } = await searchParams;
  const thongBao =
    thong_bao === "khoa"
      ? "Tài khoản đã bị khóa hoặc chưa được cấp quyền. Vui lòng liên hệ Quản trị viên."
      : thong_bao === "link_het_han"
      ? "Link đặt lại mật khẩu đã hết hạn hoặc đã dùng. Hãy yêu cầu link mới."
      : null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Bảng kiểm đi buồng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Đăng nhập để bắt đầu đi buồng kiểm tra
          </p>
        </div>
        {thongBao && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{thongBao}</p>}
        <LoginForm redirectTo={redirect ?? ""} />
        <p className="mt-4 text-center text-sm">
          <a href="/quen-mat-khau" className="text-blue-600">Quên mật khẩu?</a>
        </p>
      </div>
    </main>
  );
}
