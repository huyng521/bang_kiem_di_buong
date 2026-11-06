// Mốc 9: đồng bộ khi mất mạng — mới nhất theo từng ô thắng, báo xung đột, vẫn giữ phân quyền.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
let m1: string;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
  m1 = await mucTheoStt(db, 1);
}, 60_000);

const dongBo = (pktp: string, tt: string, luc: string) =>
  db.query<{ ket_qua: string; trang_thai_may_chu: string }>(`select * from dong_bo_ket_qua($1, $2, $3, null, $4)`, [pktp, m1, tt, luc]);

describe("Đồng bộ ô kết quả", () => {
  it("ghi mới; thay đổi mới hơn thắng; thay đổi cũ hơn bị báo xung đột và không ghi đè", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authTkA, async () => {
        expect((await dongBo(ID.pktpA, "khong_dat", "2026-11-05T02:00:00Z")).rows[0].ket_qua).toBe("ap_dung");
        expect((await dongBo(ID.pktpA, "dat_co", "2026-11-05T03:00:00Z")).rows[0].ket_qua).toBe("ap_dung");
        const xd = (await dongBo(ID.pktpA, "khong_co_bo_chuan", "2026-11-05T02:30:00Z")).rows[0];
        expect(xd.ket_qua).toBe("xung_dot");
        expect(xd.trang_thai_may_chu).toBe("dat_co");
      });
      const r = await db.query<{ trang_thai: string }>(`select trang_thai from ket_qua_kiem_tra where phien_kiem_tra_phong_id = $1 and checklist_item_id = $2`, [ID.pktpA, m1]);
      expect(r.rows[0].trang_thai).toBe("dat_co");
    });
  });
  it("vẫn bị chặn khi ghi vào khoa khác hoặc khi tài khoản bị khóa", async () => {
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authTkA, () => dongBo(ID.pktpB, "dat_co", "2026-11-05T02:00:00Z"))).rejects.toThrow();
    });
    await roiHoanTac(db, async () => {
      await db.query(`update nguoi_dung set active = false where id = $1`, [ID.ndTkA]);
      await expect(voiTuCach(db, ID.authTkA, () => dongBo(ID.pktpA, "dat_co", "2026-11-05T02:00:00Z"))).rejects.toThrow();
    });
  });
  it("sửa trực tuyến tự đóng dấu thời điểm", async () => {
    await roiHoanTac(db, async () => {
      await db.query(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1,$2,'dat_co')`, [ID.pktpA, m1]);
      const r = await db.query<{ cap_nhat_luc: unknown }>(`select cap_nhat_luc from ket_qua_kiem_tra where phien_kiem_tra_phong_id = $1`, [ID.pktpA]);
      expect(r.rows[0].cap_nhat_luc).not.toBeNull();
    });
  });
});
