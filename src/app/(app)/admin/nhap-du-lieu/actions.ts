"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { requireRole, sinhMatKhauTam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ghiNhatKy } from "@/lib/nhat-ky";
import { kiemTraKhoa, kiemTraNguoiDung, kiemTraPhong, type DongKiemTra, type LoaiNhap } from "@/lib/nhap-hang-loat";

const TOI_DA_DONG = 2000;

/** Lấy chữ của một ô Excel: chữ thường, chữ nhiều định dạng, link (email), công thức, ngày. */
function giaTriO(v: unknown): unknown {
  if (v === null || v === undefined || typeof v !== "object") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const o = v as { richText?: { text: string }[]; text?: unknown; result?: unknown; hyperlink?: string };
  if (o.richText) return o.richText.map((r) => r.text).join("");
  if (o.text !== undefined) return giaTriO(o.text);
  if (o.result !== undefined) return o.result;
  if (o.hyperlink) return o.hyperlink.replace(/^mailto:/, "");
  return "";
}

async function docFile(file: File): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, i) => {
    if (i === 1) return; // dòng tiêu đề
    const vals = (row.values as unknown[]).slice(1).map(giaTriO);
    rows[i - 2] = vals;
  });
  return Array.from(rows, (r) => r ?? []);
}

async function kiemTra(loai: LoaiNhap, file: File): Promise<DongKiemTra<unknown>[]> {
  const rows = await docFile(file);
  if (rows.length > TOI_DA_DONG) throw new Error(`Tối đa ${TOI_DA_DONG} dòng mỗi lần.`);
  const supabase = await createClient();
  const { data: khoa } = await supabase.from("khoa").select("id, ten_khoa");
  if (loai === "khoa") return kiemTraKhoa(rows, (khoa ?? []).map((k) => k.ten_khoa));
  if (loai === "phong") {
    const { data: phong } = await supabase.from("phong_benh").select("khoa_id, so_phong");
    return kiemTraPhong(rows, khoa ?? [], phong ?? []);
  }
  const { data: nd } = await supabase.from("nguoi_dung").select("email");
  return kiemTraNguoiDung(rows, khoa ?? [], (nd ?? []).map((x) => x.email).filter(Boolean) as string[]);
}

export interface KetQuaXemTruoc { loi?: string; dong?: { dong: number; tho: string[]; loi: string[] }[] }

export async function xemTruoc(_p: KetQuaXemTruoc, fd: FormData): Promise<KetQuaXemTruoc> {
  await requireRole("admin");
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return { loi: "Chọn file Excel (.xlsx) trước." };
  try {
    const dong = await kiemTra(String(fd.get("loai")) as LoaiNhap, file);
    return { dong: dong.map((d) => ({ dong: d.dong, tho: d.tho, loi: d.loi })) };
  } catch (e) {
    return { loi: e instanceof Error ? e.message : "Không đọc được file. Hãy dùng đúng file mẫu (.xlsx)." };
  }
}

export interface KetQuaApDung { loi?: string; thanhCong?: string; fileMatKhau?: string }

/** Áp dụng. Không bỏ qua lỗi: có lỗi thì không ghi gì. Bỏ qua lỗi: chỉ ghi các dòng hợp lệ. */
export async function apDung(fd: FormData): Promise<KetQuaApDung> {
  await requireRole("admin");
  const loai = String(fd.get("loai")) as LoaiNhap;
  const boQuaLoi = fd.get("bo_qua_loi") === "1";
  const file = fd.get("file");
  if (!(file instanceof File)) return { loi: "Thiếu file." };
  const dong = await kiemTra(loai, file); // kiểm tra lại ở server, không tin dữ liệu gửi từ trình duyệt
  const soLoi = dong.filter((d) => d.loi.length).length;
  if (soLoi && !boQuaLoi) return { loi: `Còn ${soLoi} dòng lỗi — sửa file hoặc chọn “Bỏ qua dòng lỗi”. Chưa ghi gì.` };
  const hopLe = dong.filter((d) => d.duLieu).map((d) => d.duLieu!);
  if (!hopLe.length) return { loi: "Không có dòng hợp lệ nào." };
  const supabase = await createClient();

  if (loai === "khoa" || loai === "phong") {
    // Một lệnh insert = một giao dịch: hoặc ghi hết, hoặc không ghi dòng nào.
    const { error } = loai === "khoa"
      ? await supabase.from("khoa").insert(hopLe as { ten_khoa: string; so_giuong_ke_hoach: number | null }[])
      : await supabase.from("phong_benh").insert((hopLe as { khoa_id: string; so_phong: string }[]).map((p) => ({ khoa_id: p.khoa_id, so_phong: p.so_phong })));
    if (error) return { loi: "Không ghi được (chưa có dòng nào được ghi): " + error.message };
    revalidatePath("/admin");
    return { thanhCong: `Đã thêm ${hopLe.length} ${loai === "khoa" ? "khoa" : "phòng"}${soLoi ? `, bỏ qua ${soLoi} dòng lỗi` : ""}.` };
  }

  // Người dùng: tạo lần lượt; nếu không bỏ qua lỗi mà có tài khoản tạo hỏng thì gỡ lại những tài khoản vừa tạo.
  const admin = createAdminClient();
  const daTao: { authId: string; ho_ten: string; email: string; matKhau: string; vai_tro: string; ten_khoa: string }[] = [];
  const loiTao: string[] = [];
  for (const u of hopLe as { ho_ten: string; email: string; vai_tro: "admin" | "truong_khoa" | "ban_giam_doc"; khoa_id: string | null; ten_khoa: string }[]) {
    const matKhau = sinhMatKhauTam();
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: matKhau, email_confirm: true });
    if (error || !data.user) { loiTao.push(`${u.email}: ${error?.message ?? "lỗi"}`); if (!boQuaLoi) break; continue; }
    const { error: e2 } = await supabase.from("nguoi_dung").insert({ auth_user_id: data.user.id, ho_ten: u.ho_ten, email: u.email, vai_tro: u.vai_tro, khoa_id: u.khoa_id, phai_doi_mat_khau: true });
    if (e2) { await admin.auth.admin.deleteUser(data.user.id); loiTao.push(`${u.email}: ${e2.message}`); if (!boQuaLoi) break; continue; }
    daTao.push({ authId: data.user.id, ho_ten: u.ho_ten, email: u.email, matKhau, vai_tro: u.vai_tro, ten_khoa: u.ten_khoa });
  }
  if (loiTao.length && !boQuaLoi) {
    for (const t of daTao) await admin.auth.admin.deleteUser(t.authId); // hồ sơ nguoi_dung xóa theo (on delete cascade)
    return { loi: `Dừng lại do lỗi: ${loiTao[0]}. Đã gỡ ${daTao.length} tài khoản vừa tạo, không có thay đổi nào được giữ.` };
  }

  // File mật khẩu tạm: tạo trong bộ nhớ, trả về một lần, không lưu ở đâu.
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Mật khẩu tạm");
  ws.addRow(["Họ và tên", "Email", "Vai trò", "Khoa", "Mật khẩu tạm (phải đổi khi đăng nhập lần đầu)"]).font = { bold: true };
  daTao.forEach((t) => ws.addRow([t.ho_ten, t.email, t.vai_tro, t.ten_khoa, t.matKhau]));
  ws.columns.forEach((c) => { c.width = 28; });
  await ghiNhatKy("xuat_file", "mat_khau_tam_hang_loat", { chiTiet: { so_tai_khoan: daTao.length } });
  revalidatePath("/admin/nguoi-dung");
  return {
    thanhCong: `Đã tạo ${daTao.length} tài khoản${loiTao.length ? `, ${loiTao.length} tài khoản lỗi: ${loiTao.join("; ")}` : ""}${soLoi ? `, bỏ qua ${soLoi} dòng lỗi` : ""}.`,
    fileMatKhau: Buffer.from(await wb.xlsx.writeBuffer()).toString("base64"),
  };
}
