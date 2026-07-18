import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dangXuat } from "@/app/login/actions";

const NHAN_VAI_TRO: Record<string, string> = {
  admin: "Quản trị viên",
  truong_khoa: "ĐD/HS Trưởng khoa",
  ban_giam_doc: "Ban Giám đốc",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { nguoiDung } = user;

  const navLinks =
    nguoiDung.vai_tro === "admin"
      ? [
          { href: "/admin", label: "Danh mục" },
          { href: "/bao-cao", label: "Báo cáo" },
        ]
      : nguoiDung.vai_tro === "truong_khoa"
      ? [{ href: "/di-buong", label: "Đi buồng" }]
      : [{ href: "/bao-cao", label: "Báo cáo" }];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link href="/" className="block truncate font-bold text-slate-900">
              Bảng kiểm đi buồng
            </Link>
            <p className="truncate text-xs text-slate-500">
              {nguoiDung.ho_ten} · {NHAN_VAI_TRO[nguoiDung.vai_tro]}
            </p>
          </div>
          <form action={dangXuat}>
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 active:bg-slate-100"
            >
              Đăng xuất
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
