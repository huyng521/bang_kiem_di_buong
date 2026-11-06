"use client";

import { useEffect, useState } from "react";
import { kho } from "@/lib/ngoai-tuyen/kho";

/** Không cho bấm "Hoàn thành" khi trên máy còn thay đổi (từ chế độ ngoại tuyến) chưa đồng bộ. */
export function ChanHoanThanh({ phienId, children }: { phienId: string; children: React.ReactNode }) {
  const [soCho, setSoCho] = useState(0);
  useEffect(() => {
    (async () => {
      try { setSoCho((await kho.hangDoi(phienId)).length + (await kho.anhCho(phienId)).length); } catch {}
    })();
  }, [phienId]);
  if (!soCho) return <>{children}</>;
  return (
    <div className="space-y-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">Máy này còn {soCho} thay đổi/ảnh nhập lúc mất mạng chưa được gửi lên — chưa thể hoàn thành phiên.</p>
      <a href={`/ngoai-tuyen?phien=${phienId}`} className="inline-block rounded-lg bg-red-700 px-3 py-2 font-semibold text-white">Mở chế độ ngoại tuyến để đồng bộ</a>
    </div>
  );
}
