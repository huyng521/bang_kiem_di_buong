"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nenAnh, taiLenStorage } from "@/lib/nen-anh";

export interface AnhNho {
  id: string;
  url: string;
}

interface DangTai {
  khoa: string;
  file: File;
  phanTram: number;
  loi?: string;
}

export const NHAC_RIENG_TU =
  "Không chụp mặt người bệnh, tên/mã bệnh nhân, bảng thông tin giường bệnh. Chỉ chụp hiện trạng cơ sở vật chất/thiết bị.";

/**
 * Khung ảnh minh chứng dùng chung (ô kết quả kiểm tra, hành động khắc phục).
 * chuanBi: server action cấp đường dẫn lưu; ghiNhan: lưu dòng ảnh và trả về ảnh có URL ký.
 */
export function KhungAnh({
  ban,
  toiDa = 5,
  choSua,
  chuanBi,
  ghiNhan,
  xoa,
}: {
  ban: AnhNho[];
  toiDa?: number;
  choSua: boolean;
  chuanBi: () => Promise<{ path: string; bucket: string } | { loi: string }>;
  ghiNhan: (path: string, ten: string, kichThuoc: number) => Promise<AnhNho | { loi: string }>;
  xoa: (anhId: string) => Promise<void>;
}) {
  const [anh, setAnh] = useState<AnhNho[]>(ban);
  const [hang, setHang] = useState<DangTai[]>([]);
  const [xemLon, setXemLon] = useState<string | null>(null);
  const [xacNhanXoa, setXacNhanXoa] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const thuVienRef = useRef<HTMLInputElement>(null);
  const conCho = toiDa - anh.length - hang.filter((h) => !h.loi).length;

  async function taiMot(muc: DangTai) {
    const capNhat = (p: Partial<DangTai>) => setHang((h) => h.map((x) => (x.khoa === muc.khoa ? { ...x, ...p } : x)));
    capNhat({ loi: undefined, phanTram: 0 });
    try {
      const blob = await nenAnh(muc.file);
      const cb = await chuanBi();
      if ("loi" in cb) throw new Error(cb.loi);
      const { data } = await createClient().auth.getSession();
      if (!data.session) throw new Error("Phiên đăng nhập đã hết, hãy đăng nhập lại.");
      await taiLenStorage({ bucket: cb.bucket, path: cb.path, blob, accessToken: data.session.access_token, onTienTrinh: (p) => capNhat({ phanTram: p }) });
      const kq = await ghiNhan(cb.path, muc.file.name, blob.size);
      if ("loi" in kq) throw new Error(kq.loi);
      setAnh((a) => [...a, kq]);
      setHang((h) => h.filter((x) => x.khoa !== muc.khoa));
    } catch (e) {
      capNhat({ loi: e instanceof Error ? e.message : "Tải ảnh thất bại" });
    }
  }

  function chonFile(files: FileList | null) {
    if (!files) return;
    const moi = Array.from(files).slice(0, Math.max(0, conCho)).map((file) => ({ khoa: crypto.randomUUID(), file, phanTram: 0 }));
    setHang((h) => [...h, ...moi]);
    moi.forEach(taiMot);
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {choSua && <p className="rounded bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-900">⚠ {NHAC_RIENG_TU}</p>}
      {anh.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {anh.map((a) => (
            <div key={a.id} className="relative">
              <button type="button" onClick={() => setXemLon(a.url)} className="block h-16 w-16 overflow-hidden rounded-lg border border-slate-300 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="Ảnh minh chứng" className="h-full w-full object-cover" />
              </button>
              {choSua && (
                <button
                  type="button"
                  aria-label="Xóa ảnh"
                  onClick={async () => {
                    if (xacNhanXoa !== a.id) return setXacNhanXoa(a.id);
                    await xoa(a.id);
                    setAnh((x) => x.filter((y) => y.id !== a.id));
                    setXacNhanXoa(null);
                  }}
                  className={`absolute -right-1 -top-1 rounded-full px-1.5 text-xs font-bold text-white ${xacNhanXoa === a.id ? "bg-red-700" : "bg-slate-700"}`}
                >
                  {xacNhanXoa === a.id ? "Xóa?" : "×"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {hang.map((h) => (
        <div key={h.khoa} className="text-xs">
          {h.loi ? (
            <span className="text-red-700">
              {h.file.name}: {h.loi}{" "}
              <button type="button" className="font-semibold underline" onClick={() => taiMot(h)}>Thử lại</button>{" "}
              <button type="button" className="underline" onClick={() => setHang((x) => x.filter((y) => y.khoa !== h.khoa))}>Bỏ</button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded bg-slate-200"><span className="block h-full bg-blue-600" style={{ width: `${h.phanTram}%` }} /></span>
              {h.phanTram}%
            </span>
          )}
        </div>
      ))}
      {choSua && conCho > 0 && (
        <div className="flex gap-2">
          <button type="button" onClick={() => camRef.current?.click()} className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white">📷 Chụp ảnh</button>
          <button type="button" onClick={() => thuVienRef.current?.click()} className="flex-1 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700">Chọn từ thư viện</button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { chonFile(e.target.files); e.target.value = ""; }} />
          <input ref={thuVienRef} type="file" accept="image/*" multiple hidden onChange={(e) => { chonFile(e.target.files); e.target.value = ""; }} />
        </div>
      )}
      {choSua && conCho <= 0 && <p className="text-xs text-slate-500">Đã đủ {toiDa} ảnh cho ô này.</p>}
      {xemLon && (
        <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setXemLon(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={xemLon} alt="Ảnh minh chứng cỡ lớn" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
