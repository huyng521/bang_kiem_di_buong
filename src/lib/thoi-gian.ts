// Mọi ngày giờ hiển thị và tính toán theo múi giờ Việt Nam.
export const TZ = "Asia/Ho_Chi_Minh";

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam của một thời điểm. */
export function ngayVN(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export const homNayVN = () => ngayVN();

/** Cộng/trừ số ngày trên chuỗi YYYY-MM-DD (không phụ thuộc múi giờ máy chủ). */
export function congNgay(ymd: string, soNgay: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + soNgay));
  return t.toISOString().slice(0, 10);
}

/** "2026-11-05" → "05/11/2026" */
export function hienNgay(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function hienGio(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
export function hienNgayGio(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
/** Thứ trong tuần theo giờ VN: 1 = thứ 2 … 7 = chủ nhật. */
export function thuTrongTuanVN(d: Date = new Date()): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(w) + 1;
}
/** Giờ:phút hiện tại theo giờ VN, dạng "HH:MM". */
export function gioPhutVN(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
