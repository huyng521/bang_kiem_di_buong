// Kho IndexedDB tối giản cho chế độ ngoại tuyến.
import type { AnhCho, BanSaoPhien, MucHangDoi } from "./kieu";

const TEN_DB = "bang-kiem-ngoai-tuyen";
type Bang = "phien" | "hang_doi" | "anh";

function moDb(): Promise<IDBDatabase> {
  return new Promise((ok, loi) => {
    const r = indexedDB.open(TEN_DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("phien")) db.createObjectStore("phien", { keyPath: "phienId" });
      if (!db.objectStoreNames.contains("hang_doi")) db.createObjectStore("hang_doi", { keyPath: "id", autoIncrement: true }).createIndex("phienId", "phienId");
      if (!db.objectStoreNames.contains("anh")) db.createObjectStore("anh", { keyPath: "id", autoIncrement: true }).createIndex("phienId", "phienId");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => loi(r.error);
  });
}

async function giaoDich<T>(bang: Bang, che: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await moDb();
  return new Promise((ok, loi) => {
    const tx = db.transaction(bang, che);
    const req = fn(tx.objectStore(bang));
    tx.oncomplete = () => { ok(req.result); db.close(); };
    tx.onerror = () => { loi(tx.error); db.close(); };
  });
}

export const kho = {
  layPhien: (id: string) => giaoDich<BanSaoPhien | undefined>("phien", "readonly", (s) => s.get(id)),
  luuPhien: (p: BanSaoPhien) => giaoDich("phien", "readwrite", (s) => s.put(p)),
  themThayDoi: (m: MucHangDoi) => giaoDich("hang_doi", "readwrite", (s) => s.add(m)),
  hangDoi: async (phienId: string) => (await giaoDich<MucHangDoi[]>("hang_doi", "readonly", (s) => s.getAll())).filter((m) => m.phienId === phienId),
  xoaThayDoi: (id: number) => giaoDich("hang_doi", "readwrite", (s) => s.delete(id)),
  themAnh: (a: AnhCho) => giaoDich("anh", "readwrite", (s) => s.add(a)),
  anhCho: async (phienId: string) => (await giaoDich<AnhCho[]>("anh", "readonly", (s) => s.getAll())).filter((a) => a.phienId === phienId),
  xoaAnh: (id: number) => giaoDich("anh", "readwrite", (s) => s.delete(id)),
  /** Xóa sạch dữ liệu cục bộ (khi đăng xuất hoặc tài khoản bị khóa). */
  xoaHet: () => new Promise<void>((ok) => { const r = indexedDB.deleteDatabase(TEN_DB); r.onsuccess = r.onerror = r.onblocked = () => ok(); }),
};
