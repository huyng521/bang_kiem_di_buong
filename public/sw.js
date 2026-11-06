// Service worker: cho phép mở chế độ đi buồng ngoại tuyến khi mất mạng.
// Không lưu dữ liệu nghiệp vụ ở đây (dữ liệu nằm trong IndexedDB của trang); chỉ lưu vỏ trang và file tĩnh.
const PHIEN_BAN = "v2";
const VO = `vo-${PHIEN_BAN}`;
const TINH = `tinh-${PHIEN_BAN}`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VO).then((c) => c.addAll(["/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => ![VO, TINH].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  // Đăng xuất: xóa toàn bộ bộ nhớ đệm.
  if (e.data === "xoa-bo-nho-dem") e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // File tĩnh có mã băm trong tên: lưu lâu dài, ưu tiên bộ nhớ đệm.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.open(TINH).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) e.waitUntil(c.put(req, r.clone())); return r; })));
    return;
  }

  // Trang ngoại tuyến: ưu tiên mạng, mất mạng thì dùng bản vỏ đã lưu (bỏ qua tham số ?phien=).
  if (req.mode === "navigate" && url.pathname === "/ngoai-tuyen") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          // Sao chép NGAY (trước khi trang đọc nội dung) rồi mới lưu vào bộ nhớ đệm.
          if (r.ok && !r.redirected) { const banSao = r.clone(); e.waitUntil(caches.open(VO).then((c) => c.put("/ngoai-tuyen", banSao))); }
          return r;
        })
        .catch(async () => (await caches.match("/ngoai-tuyen")) || caches.match("/offline.html")),
    );
    return;
  }

  // Các trang khác: cần mạng; mất mạng thì hiện trang hướng dẫn.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});
