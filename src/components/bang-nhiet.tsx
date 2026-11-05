import { kyHieuMucTieu, mauTheoMucTieu } from "@/lib/mau-muc-tieu";

/** Bảng nhiệt khoa × mục: mỗi ô có số + màu + ký hiệu (không chỉ dựa vào màu). */
export function BangNhiet({ khoa, muc, gt, mucTieu }: {
  khoa: { id: string; ten: string }[];
  muc: { ma: string; stt: number; noiDung: string }[];
  gt: Map<string, number | null>; // `${khoaId}|${ma}`
  mucTieu: number;
}) {
  if (!khoa.length || !muc.length) return <p className="py-4 text-center text-sm text-slate-500">Chưa có dữ liệu.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left">Khoa \ Mục</th>
            {muc.map((m) => <th key={m.ma} title={m.noiDung} className="px-1 py-1 font-semibold tabular-nums">{m.stt}</th>)}
          </tr>
        </thead>
        <tbody>
          {khoa.map((k) => (
            <tr key={k.id}>
              <th className="sticky left-0 z-10 max-w-[140px] truncate bg-white px-2 py-1 text-left font-medium">{k.ten}</th>
              {muc.map((m) => {
                const x = gt.get(`${k.id}|${m.ma}`);
                return (
                  <td key={m.ma} title={`${k.ten} · Mục ${m.stt}: ${x == null ? "chưa có" : x + "%"}`}
                    className="min-w-[34px] border border-white px-0.5 py-1 text-center tabular-nums text-white"
                    style={{ background: x === undefined ? "#f1f5f9" : mauTheoMucTieu(x, mucTieu), color: x === undefined ? "#94a3b8" : "#fff" }}>
                    {x === undefined || x === null ? "·" : `${kyHieuMucTieu(x, mucTieu).trim()}${Math.round(x)}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
