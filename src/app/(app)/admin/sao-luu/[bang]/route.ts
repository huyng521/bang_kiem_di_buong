import { type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BANG_SAO_LUU } from "@/lib/sao-luu";
import { ghiNhatKy } from "@/lib/nhat-ky";
import { homNayVN } from "@/lib/thoi-gian";

export const maxDuration = 60;

// Xuất một bảng ra CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt), đọc dần từng trang 1000 dòng.
export async function GET(_r: NextRequest, { params }: { params: Promise<{ bang: string }> }) {
  await requireRole("admin");
  const { bang } = await params;
  const cfg = BANG_SAO_LUU.find((b) => b.bang === bang);
  if (!cfg) return new Response("Bảng không hợp lệ", { status: 400 });
  const supabase = await createClient();
  await ghiNhatKy("xuat_file", "sao_luu_csv", { id: bang });
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      ctrl.enqueue(enc.encode("﻿"));
      let cot: string[] | null = null;
      for (let tu = 0; ; tu += 1000) {
        // Bảng tên động: ép kiểu lỏng vì danh sách bảng đã được kiểm tra ở trên.
        const { data, error } = await (supabase.from(cfg.bang as "khoa") as unknown as {
          select: (c: string) => { order: (c: string) => { range: (a: number, b: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> } };
        }).select("*").order(cfg.khoa).range(tu, tu + 999);
        if (error) { ctrl.enqueue(enc.encode(`LỖI: ${error.message}\r\n`)); break; }
        if (!data?.length) break;
        if (!cot) { cot = Object.keys(data[0]); ctrl.enqueue(enc.encode(cot.join(",") + "\r\n")); }
        ctrl.enqueue(enc.encode(data.map((d) => cot!.map((c) => esc(d[c])).join(",")).join("\r\n") + "\r\n"));
        if (data.length < 1000) break;
      }
      ctrl.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${bang}-${homNayVN()}.csv"` },
  });
}
