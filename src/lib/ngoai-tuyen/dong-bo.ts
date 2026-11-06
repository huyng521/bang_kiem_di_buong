// Ghi thay đổi vào bản sao cục bộ + hàng đợi; đồng bộ khi có mạng.
import { kho } from "./kho";
import type { BanSaoPhien, KetQuaDongBo, ThayDoi } from "./kieu";

export const khoaO = (pktpId: string, itemId: string) => `${pktpId}:${itemId}`;

/** Áp một thay đổi lên bản sao (dùng cả khi ghi mới và khi phủ hàng đợi lên bản tải về). */
export function apThayDoi(p: BanSaoPhien, t: ThayDoi): BanSaoPhien {
  if (t.loai === "ket_qua") return { ...p, ketQua: { ...p.ketQua, [khoaO(t.pktpId, t.itemId)]: { tt: t.tt, gc: t.gc, luc: t.luc } } };
  if (t.loai === "phong") return { ...p, phong: p.phong.map((x) => (x.pktpId === t.pktpId ? { ...x, tenDd: t.tenDd, tongNb: t.tongNb } : x)) };
  return { ...p, phien: { ...p.phien, ...t.truong } };
}

export async function ghiThayDoi(p: BanSaoPhien, t: ThayDoi): Promise<BanSaoPhien> {
  const moi = apThayDoi(p, t);
  await kho.luuPhien(moi);
  await kho.themThayDoi({ phienId: p.phienId, thayDoi: t });
  return moi;
}

export interface KetQuaPhienDongBo {
  daGui: number;
  xungDot: string[];
  loi: string | null;
  canDangNhapLai?: boolean;
  biKhoa?: boolean;
}

/**
 * Gửi hàng đợi lên máy chủ theo đúng thứ tự. Thay đổi đã áp dụng thì xóa khỏi hàng đợi;
 * xung đột (máy chủ có bản mới hơn) thì lấy bản máy chủ và báo cho người dùng.
 */
export async function dongBoPhien(phienId: string, goi: typeof fetch = fetch): Promise<KetQuaPhienDongBo> {
  const hang = await kho.hangDoi(phienId);
  if (!hang.length) return { daGui: 0, xungDot: [], loi: null };
  let res: Response;
  try {
    res = await goi("/api/ngoai-tuyen/dong-bo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phienId, thayDoi: hang.map((h) => h.thayDoi) }),
    });
  } catch {
    return { daGui: 0, xungDot: [], loi: "Chưa có mạng" };
  }
  if (res.status === 401) return { daGui: 0, xungDot: [], loi: "Phiên đăng nhập đã hết, hãy đăng nhập lại để đồng bộ.", canDangNhapLai: true };
  if (res.status === 403) {
    await kho.xoaHet();
    return { daGui: 0, xungDot: [], loi: "Tài khoản đã bị khóa — dữ liệu trên máy đã được xóa.", biKhoa: true };
  }
  if (!res.ok) return { daGui: 0, xungDot: [], loi: `Máy chủ lỗi (${res.status}), sẽ thử lại.` };
  const { ketQua } = (await res.json()) as { ketQua: KetQuaDongBo[] };

  let p = await kho.layPhien(phienId);
  const xungDot: string[] = [];
  let daGui = 0;
  let loi: string | null = null;
  for (let i = 0; i < hang.length; i++) {
    const kq = ketQua[i];
    const t = hang[i].thayDoi;
    if (!kq || kq.trang_thai === "loi") { loi = kq?.thong_bao ?? "Lỗi không rõ"; break; } // giữ lại để thử lại, không bỏ qua thứ tự
    if (kq.trang_thai === "xung_dot") {
      if (t.loai === "ket_qua" && p) {
        const muc = p.muc.find((m) => m.id === t.itemId);
        const phong = p.phong.find((x) => x.pktpId === t.pktpId);
        xungDot.push(`${phong?.soPhong ?? "Phòng"} · Mục ${muc?.stt ?? "?"}: đã được sửa ở nơi khác lúc ${kq.may_chu?.luc ? new Date(kq.may_chu.luc).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "?"} — giữ bản mới hơn đó.`);
        if (kq.may_chu) p = apThayDoi(p, { ...t, tt: kq.may_chu.tt, gc: kq.may_chu.gc, luc: kq.may_chu.luc });
      } else xungDot.push("Thông tin phòng đã được sửa ở nơi khác — giữ bản mới hơn.");
    }
    await kho.xoaThayDoi(hang[i].id!);
    daGui++;
  }
  if (p) await kho.luuPhien(p);
  return { daGui, xungDot, loi };
}

/** Tải bản mới nhất của phiên về máy, phủ lại các thay đổi còn chờ để không mất dữ liệu chưa gửi. */
export async function taiVeMay(phienId: string, goi: typeof fetch = fetch): Promise<BanSaoPhien> {
  const res = await goi(`/api/ngoai-tuyen/${phienId}`, { cache: "no-store" });
  if (res.status === 401) throw new Error("dang_nhap_lai");
  if (res.status === 403) { await kho.xoaHet(); throw new Error("bi_khoa"); }
  if (!res.ok) throw new Error(`Không tải được phiên (${res.status})`);
  let p = (await res.json()) as BanSaoPhien;
  for (const h of await kho.hangDoi(phienId)) p = apThayDoi(p, h.thayDoi);
  await kho.luuPhien(p);
  return p;
}
