"use client";

import { kho } from "@/lib/ngoai-tuyen/kho";

/** Đăng xuất: xóa dữ liệu lưu trên máy (IndexedDB + bộ nhớ đệm) trước khi gửi yêu cầu đăng xuất. */
export function NutDangXuat({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={async (e) => {
        const form = e.currentTarget;
        if (form.dataset.daXoa) return;
        e.preventDefault();
        try {
          await kho.xoaHet();
          navigator.serviceWorker?.controller?.postMessage("xoa-bo-nho-dem");
          if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
        } catch {}
        form.dataset.daXoa = "1";
        form.requestSubmit();
      }}
    >
      <button type="submit" className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 active:bg-slate-100">
        Đăng xuất
      </button>
    </form>
  );
}
