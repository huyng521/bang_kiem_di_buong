import Link from "next/link";

const MUC: { href: string; label: string; mota: string }[] = [
  { href: "/admin/khoa", label: "Danh mục Khoa", mota: "Thêm/sửa/ẩn các khoa điều trị" },
  { href: "/admin/phong-benh", label: "Danh mục Phòng bệnh", mota: "Cấu hình phòng bệnh theo từng khoa" },
  { href: "/admin/nguoi-dung", label: "Người dùng", mota: "Tạo tài khoản, phân quyền, gán khoa" },
  { href: "/admin/checklist", label: "Mục bảng kiểm (35 mục)", mota: "Sửa nội dung/ghi chú các mục kiểm tra" },
];

export default function AdminPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold text-slate-900">Quản trị</h1>
      {MUC.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">{m.label}</p>
          <p className="text-sm text-slate-500">{m.mota}</p>
        </Link>
      ))}
    </div>
  );
}
