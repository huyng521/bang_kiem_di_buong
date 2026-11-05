// Kiểm thử công thức tỷ lệ đạt dùng chung: đạt / (đạt + không đạt),
// loại "Không có/Bỏ chuẩn" và ô chưa chấm (NULL); chỉ phiên hoàn thành, chưa ẩn.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
}, 60_000);

async function cham(pktp: string, ketQua: (string | null)[]) {
  for (let i = 0; i < ketQua.length; i++) {
    const m = await mucTheoStt(db, i + 1);
    await db.query(
      `insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1, $2, $3)`,
      [pktp, m, ketQua[i]],
    );
  }
}
const baoCao = async (tu = "2026-11-01", den = "2026-11-30") =>
  (await db.query<{ khoa_id: string; ty_le_dat: string | null; tong_muc_ap_dung: number; so_dat: number }>(
    `select * from bao_cao_ty_le_dat($1, $2)`, [tu, den])).rows;

describe("bao_cao_ty_le_dat", () => {
  it("3 đạt, 1 không đạt, 2 bỏ chuẩn, 1 chưa chấm → 75%", async () => {
    await roiHoanTac(db, async () => {
      await cham(ID.pktpB, ["dat_co", "dat_co", "dat_co", "khong_dat", "khong_co_bo_chuan", "khong_co_bo_chuan", null]);
      const r = (await baoCao()).find((x) => x.khoa_id === ID.khoaB)!;
      expect(Number(r.tong_muc_ap_dung)).toBe(4);
      expect(Number(r.so_dat)).toBe(3);
      expect(Number(r.ty_le_dat)).toBe(75);
    });
  });
  it("chỉ có bỏ chuẩn → tỷ lệ để trống (không phải 0%)", async () => {
    await roiHoanTac(db, async () => {
      await cham(ID.pktpB, ["khong_co_bo_chuan", null]);
      const r = (await baoCao()).find((x) => x.khoa_id === ID.khoaB)!;
      expect(r.ty_le_dat).toBeNull();
    });
  });
  it("không tính phiên nháp", async () => {
    await roiHoanTac(db, async () => {
      await cham(ID.pktpA, ["khong_dat", "khong_dat"]);
      expect((await baoCao()).find((x) => x.khoa_id === ID.khoaA)).toBeUndefined();
    });
  });
  it("không tính phiên đã ẩn", async () => {
    await roiHoanTac(db, async () => {
      await cham(ID.pktpB, ["dat_co"]);
      await db.query(`update phien_kiem_tra set an = true where id = $1`, [ID.phienB]);
      expect((await baoCao()).find((x) => x.khoa_id === ID.khoaB)).toBeUndefined();
    });
  });
  it("lọc đúng khoảng ngày", async () => {
    await roiHoanTac(db, async () => {
      await cham(ID.pktpB, ["dat_co"]);
      expect(await baoCao("2026-11-03", "2026-11-30")).toHaveLength(0);
    });
  });
  it("trưởng khoa A gọi báo cáo chỉ thấy khoa A", async () => {
    await roiHoanTac(db, async () => {
      await cham(ID.pktpB, ["dat_co"]);
      const rows = await voiTuCach(db, ID.authTkA, () => baoCao());
      expect(rows.every((x) => x.khoa_id === ID.khoaA)).toBe(true);
    });
  });
});
