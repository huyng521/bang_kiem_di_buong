import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Bảng kiểm đi buồng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Đăng nhập để bắt đầu đi buồng kiểm tra
          </p>
        </div>
        <LoginForm redirectTo={redirect ?? ""} />
      </div>
    </main>
  );
}
