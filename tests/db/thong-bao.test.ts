// Mốc 8: thông báo — đúng người, đúng lúc, không trùng.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
  const m = await mucTheoStt(db, 1);
  await db.query(`insert into hanh_dong_khac_phuc (khoa_id, phien_kiem_tra_id, checklist_item_id, mo_ta_van_de, han_xu_ly) values ($1,$2,$3,'Quá hạn','2026-11-01')`, [ID.khoaB, ID.phienB, m]);
  await db.query(`insert into hanh_dong_khac_phuc (khoa_id, phien_kiem_tra_id, checklist_item_id, mo_ta_van_de, han_xu_ly) values ($1,$2,$3,'Sắp hạn','2026-11-06')`, [ID.khoaB, ID.phienB, m]);
  await db.query(`update phien_kiem_tra set thoi_gian_bat_dau = '2026-11-02T01:00:00Z' where id = $1`, [ID.phienA]);
}, 60_000);

const chay = (luc: string) => db.query<{ n: number }>(`select tao_thong_bao_dinh_ky($1::timestamptz) n`, [luc]);
const cua = (nd: string) => db.query<{ loai: string }>(`select loai from thong_bao where nguoi_dung_id = $1 order by loai`, [nd]);

describe("Thông báo", () => {
  it("thứ 5 05/11 lúc 15:30 giờ VN: đúng loại cho đúng người; chạy lại không trùng", async () => {
    await roiHoanTac(db, async () => {
      const n1 = (await chay("2026-11-05T08:30:00Z")).rows[0].n;
      expect(n1).toBeGreaterThan(0);
      expect((await cua(ID.ndTkA)).rows.map((r) => r.loai)).toEqual(["chua_di_buong", "phien_nhap_24h"]);
      expect((await cua(ID.ndTkB)).rows.map((r) => r.loai)).toEqual(["chua_di_buong", "kp_qua_han", "kp_sap_han"]);
      expect((await cua(ID.ndAdmin)).rows.map((r) => r.loai)).toEqual(["tong_hop_chua_di"]);
      expect((await cua(ID.ndBgd)).rows).toHaveLength(0);
      expect((await chay("2026-11-05T09:30:00Z")).rows[0].n).toBe(0);
    });
  });
  it("trước giờ nhắc (14:00 VN) không nhắc chưa đi buồng; chủ nhật không nhắc", async () => {
    await roiHoanTac(db, async () => {
      await chay("2026-11-05T07:00:00Z");
      expect((await cua(ID.ndTkA)).rows.map((r) => r.loai)).not.toContain("chua_di_buong");
      await chay("2026-11-08T09:00:00Z");
      expect((await cua(ID.ndTkA)).rows.map((r) => r.loai)).not.toContain("chua_di_buong");
    });
  });
  it("mỗi người chỉ thấy thông báo của mình; chỉ đổi được cờ đã đọc; người dùng không tự sinh được", async () => {
    await roiHoanTac(db, async () => {
      await chay("2026-11-05T08:30:00Z");
      const thay = await voiTuCach(db, ID.authTkA, () => db.query<{ nguoi_dung_id: string }>(`select * from thong_bao`));
      expect(thay.rows.every((r) => r.nguoi_dung_id === ID.ndTkA)).toBe(true);
      const r = await voiTuCach(db, ID.authTkA, () => db.query(`update thong_bao set da_doc = true`));
      expect(r.affectedRows).toBe(2);
      await expect(voiTuCach(db, ID.authTkA, () => db.query(`update thong_bao set tieu_de = 'x'`))).rejects.toThrow();
      await expect(voiTuCach(db, ID.authTkA, () => db.query(`select tao_thong_bao_dinh_ky()`))).rejects.toThrow();
    });
  });
});
