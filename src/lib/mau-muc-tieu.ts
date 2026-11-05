// Màu + ký hiệu theo mục tiêu tỷ lệ đạt (dùng được cả ở server và trình duyệt).
export function mauTheoMucTieu(x: number | null, mucTieu: number) {
  if (x === null) return "#94a3b8";
  return x >= mucTieu ? "#15803d" : x >= mucTieu - 10 ? "#ca8a04" : "#b91c1c";
}
export const kyHieuMucTieu = (x: number | null, mucTieu: number) => (x === null ? "" : x >= mucTieu ? "✓ " : x >= mucTieu - 10 ? "▲ " : "✗ ");
