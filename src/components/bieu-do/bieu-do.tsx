"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KhungBieuDo, type DongDuLieu } from "./khung";
import { kyHieuMucTieu, mauTheoMucTieu } from "@/lib/mau-muc-tieu";

// Bảng màu phân biệt + hình dấu chấm khác nhau, để không chỉ phân biệt bằng màu.
const MAU = ["#0a6870", "#c2410c", "#6d28d9", "#15803d", "#b91c1c", "#1d4ed8", "#a16207", "#be185d"];
const HINH = ["circle", "square", "triangle", "diamond", "cross", "star", "wye", "circle"] as const;


function Dau({ cx, cy, fill, hinh }: { cx?: number; cy?: number; fill?: string; hinh: (typeof HINH)[number] }) {
  if (cx == null || cy == null) return null;
  const r = 4.5;
  switch (hinh) {
    case "square": return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} />;
    case "triangle": return <polygon points={`${cx},${cy - r - 1} ${cx - r},${cy + r} ${cx + r},${cy + r}`} fill={fill} />;
    case "diamond": return <polygon points={`${cx},${cy - r - 1} ${cx + r + 1},${cy} ${cx},${cy + r + 1} ${cx - r - 1},${cy}`} fill={fill} />;
    case "cross": return <path d={`M${cx - r},${cy - r}L${cx + r},${cy + r}M${cx + r},${cy - r}L${cx - r},${cy + r}`} stroke={fill} strokeWidth={2.5} />;
    default: return <circle cx={cx} cy={cy} r={r} fill={fill} />;
  }
}

/** Đường xu hướng tỷ lệ đạt theo kỳ, nhiều khoa; vạch ngang = mục tiêu. */
export function BieuDoXuHuong({ tieuDe, moTa, ten, dong, chuoi, mucTieu }: {
  tieuDe: string; moTa?: string; ten: string; dong: DongDuLieu[]; chuoi: string[]; mucTieu: number;
}) {
  return (
    <KhungBieuDo tieuDe={tieuDe} moTa={moTa} ten={ten} duLieu={dong}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dong} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="ky" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={mucTieu} stroke="#0f172a" strokeDasharray="6 4" label={{ value: `Mục tiêu ${mucTieu}%`, fontSize: 11, position: "insideBottomRight" }} />
          {chuoi.map((c, i) => (
            <Line key={c} type="monotone" dataKey={c} stroke={MAU[i % MAU.length]} strokeWidth={2} connectNulls
              dot={(p: { cx?: number; cy?: number; index?: number }) => <Dau key={`${c}-${p.index}`} cx={p.cx} cy={p.cy} fill={MAU[i % MAU.length]} hinh={HINH[i % HINH.length]} />} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </KhungBieuDo>
  );
}

/** Cột ngang tỷ lệ đạt (xếp hạng khoa, theo phòng). Màu + ký hiệu ✓ ▲ ✗ + số. */
export function BieuDoCotTyLe({ tieuDe, moTa, ten, dong, mucTieu }: {
  tieuDe: string; moTa?: string; ten: string; dong: { nhan: string; ty_le: number | null; [k: string]: string | number | null }[]; mucTieu: number;
}) {
  const cao = Math.max(140, dong.length * 30 + 40);
  return (
    <KhungBieuDo tieuDe={tieuDe} moTa={moTa} ten={ten} duLieu={dong}>
      <ResponsiveContainer width="100%" height={cao}>
        <BarChart data={dong} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="nhan" width={120} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${v}%`} />
          <ReferenceLine x={mucTieu} stroke="#0f172a" strokeDasharray="6 4" />
          <Bar dataKey="ty_le" name="Tỷ lệ đạt">
            {dong.map((d, i) => <Cell key={i} fill={mauTheoMucTieu(d.ty_le, mucTieu)} />)}
            <LabelList dataKey="ty_le" position="right" fontSize={11}
              formatter={(v: unknown) => (v == null ? "—" : `${kyHieuMucTieu(Number(v), mucTieu)}${v}%`)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500">✓ đạt mục tiêu · ▲ dưới mục tiêu không quá 10 điểm · ✗ thấp hơn nhiều · vạch đứt = mục tiêu {mucTieu}%</p>
    </KhungBieuDo>
  );
}

/** Cột chồng phân bố người bệnh theo cấp chăm sóc. */
export function BieuDoCapChamSoc({ dong }: { dong: DongDuLieu[] }) {
  const cap = [["cap_1_tb", "Cấp 1", "#b91c1c"], ["cap_2_tb", "Cấp 2", "#ca8a04"], ["cap_3_tb", "Cấp 3", "#0a6870"]] as const;
  return (
    <KhungBieuDo tieuDe="Người bệnh theo cấp chăm sóc (trung bình mỗi buổi)" ten="cap-cham-soc" duLieu={dong}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={dong} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="ky" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {cap.map(([k, nhan, mau]) => (
            <Bar key={k} dataKey={k} name={nhan} stackId="a" fill={mau}>
              <LabelList dataKey={k} position="center" fontSize={10} fill="#fff" formatter={(v: unknown) => (v ? `${nhan.slice(-1)}: ${v}` : "")} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </KhungBieuDo>
  );
}
