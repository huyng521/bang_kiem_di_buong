// Kiểm tra dữ liệu nhập hàng loạt (khoa, phòng, người dùng) — báo lỗi theo từng dòng, chưa ghi gì.
import type { VaiTro } from "@/types/database";

export type LoaiNhap = "khoa" | "phong" | "nguoi_dung";

export const COT_MAU: Record<LoaiNhap, { cot: string[]; viDu: (string | number)[][]; huongDan: string }> = {
  khoa: { cot: ["Tên khoa", "Số giường kế hoạch (không bắt buộc)"], viDu: [["Khoa Nội tổng hợp", 40], ["Khoa Ngoại chấn thương", ""]], huongDan: "Mỗi dòng một khoa. Tên khoa không được trùng khoa đã có." },
  phong: { cot: ["Tên khoa", "Tên phòng"], viDu: [["Khoa Nội tổng hợp", "Phòng số 1"], ["Khoa Nội tổng hợp", "Phòng số 2"]], huongDan: "Tên khoa phải trùng đúng tên khoa đã có trong hệ thống." },
  nguoi_dung: {
    cot: ["Họ và tên", "Email", "Vai trò", "Tên khoa (bắt buộc với Trưởng khoa)"],
    viDu: [["Nguyễn Thị Lan", "lan.nt@benhvien.vn", "Trưởng khoa", "Khoa Nội tổng hợp"], ["Trần Văn Bình", "binh.tv@benhvien.vn", "Ban Giám đốc", ""]],
    huongDan: "Vai trò ghi một trong: Trưởng khoa / Ban Giám đốc / Quản trị viên. Mật khẩu tạm được hệ thống tự sinh.",
  },
};

export interface DongKiemTra<T> { dong: number; duLieu: T | null; loi: string[]; tho: string[] }
export type DongKhoa = { ten_khoa: string; so_giuong_ke_hoach: number | null };
export type DongPhong = { khoa_id: string; ten_khoa: string; so_phong: string };
export type DongNguoiDung = { ho_ten: string; email: string; vai_tro: VaiTro; khoa_id: string | null; ten_khoa: string };

const chuan = (s: unknown) => String(s ?? "").trim();
const khoaSo = (s: string) => s.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
const VAI_TRO: Record<string, VaiTro> = {
  "truong khoa": "truong_khoa", "trưởng khoa": "truong_khoa", truong_khoa: "truong_khoa", "dd/hs trưởng khoa": "truong_khoa",
  "ban giám đốc": "ban_giam_doc", "ban giam doc": "ban_giam_doc", ban_giam_doc: "ban_giam_doc", bgđ: "ban_giam_doc",
  "quản trị viên": "admin", "quan tri vien": "admin", admin: "admin",
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Bỏ dòng trống; trả về các dòng (đánh số theo dòng Excel, tiêu đề là dòng 1). */
export function locDong(rows: unknown[][]): { dong: number; o: string[] }[] {
  return rows.map((r, i) => ({ dong: i + 2, o: r.map(chuan) })).filter((r) => r.o.some(Boolean));
}

export function kiemTraKhoa(rows: unknown[][], tenDaCo: string[]): DongKiemTra<DongKhoa>[] {
  const daCo = new Set(tenDaCo.map(khoaSo));
  const trongFile = new Map<string, number>();
  return locDong(rows).map(({ dong, o }) => {
    const loi: string[] = [];
    const [ten, giuong] = o;
    if (!ten) loi.push("Thiếu tên khoa");
    else if (daCo.has(khoaSo(ten))) loi.push("Khoa đã có trong hệ thống");
    else if (trongFile.has(khoaSo(ten))) loi.push(`Trùng với dòng ${trongFile.get(khoaSo(ten))}`);
    else trongFile.set(khoaSo(ten), dong);
    let so: number | null = null;
    if (giuong) { so = Number(giuong); if (!Number.isInteger(so) || so < 0) loi.push("Số giường phải là số nguyên ≥ 0"); }
    return { dong, tho: o, loi, duLieu: loi.length ? null : { ten_khoa: ten, so_giuong_ke_hoach: so } };
  });
}

export function kiemTraPhong(rows: unknown[][], khoa: { id: string; ten_khoa: string }[], phongDaCo: { khoa_id: string; so_phong: string }[]): DongKiemTra<DongPhong>[] {
  const theoTen = new Map(khoa.map((k) => [khoaSo(k.ten_khoa), k]));
  const daCo = new Set(phongDaCo.map((p) => `${p.khoa_id}|${khoaSo(p.so_phong)}`));
  const trongFile = new Map<string, number>();
  return locDong(rows).map(({ dong, o }) => {
    const loi: string[] = [];
    const [tenKhoa, phong] = o;
    const k = theoTen.get(khoaSo(tenKhoa));
    if (!tenKhoa) loi.push("Thiếu tên khoa");
    else if (!k) loi.push(`Không có khoa “${tenKhoa}” trong hệ thống`);
    if (!phong) loi.push("Thiếu tên phòng");
    if (k && phong) {
      const khoaP = `${k.id}|${khoaSo(phong)}`;
      if (daCo.has(khoaP)) loi.push("Phòng đã có trong khoa này");
      else if (trongFile.has(khoaP)) loi.push(`Trùng với dòng ${trongFile.get(khoaP)}`);
      else trongFile.set(khoaP, dong);
    }
    return { dong, tho: o, loi, duLieu: loi.length || !k ? null : { khoa_id: k.id, ten_khoa: k.ten_khoa, so_phong: phong } };
  });
}

export function kiemTraNguoiDung(rows: unknown[][], khoa: { id: string; ten_khoa: string }[], emailDaCo: string[]): DongKiemTra<DongNguoiDung>[] {
  const theoTen = new Map(khoa.map((k) => [khoaSo(k.ten_khoa), k]));
  const daCo = new Set(emailDaCo.map((e) => e.toLowerCase()));
  const trongFile = new Map<string, number>();
  return locDong(rows).map(({ dong, o }) => {
    const loi: string[] = [];
    const [hoTen, emailTho, vaiTroTho, tenKhoa] = o;
    const email = emailTho.toLowerCase();
    const vaiTro = VAI_TRO[khoaSo(vaiTroTho)];
    if (!hoTen) loi.push("Thiếu họ tên");
    if (!EMAIL.test(email)) loi.push("Email không hợp lệ");
    else if (daCo.has(email)) loi.push("Email đã có tài khoản");
    else if (trongFile.has(email)) loi.push(`Email trùng với dòng ${trongFile.get(email)}`);
    else trongFile.set(email, dong);
    if (!vaiTro) loi.push("Vai trò phải là Trưởng khoa / Ban Giám đốc / Quản trị viên");
    const k = tenKhoa ? theoTen.get(khoaSo(tenKhoa)) : undefined;
    if (vaiTro === "truong_khoa" && !tenKhoa) loi.push("Trưởng khoa phải có tên khoa");
    else if (tenKhoa && !k) loi.push(`Không có khoa “${tenKhoa}” trong hệ thống`);
    return {
      dong, tho: o, loi,
      duLieu: loi.length ? null : { ho_ten: hoTen, email, vai_tro: vaiTro!, khoa_id: vaiTro === "truong_khoa" ? k!.id : null, ten_khoa: vaiTro === "truong_khoa" ? k!.ten_khoa : "" },
    };
  });
}
