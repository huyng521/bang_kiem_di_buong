// Mốc 2: ảnh minh chứng — quy tắc truy cập ảnh giống hệt phiên kiểm tra tương ứng.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
let kqA: string;
let kqB: string;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
  const m = await mucTheoStt(db, 1);
  kqA = (await db.query<{ id: string }>(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1,$2,'khong_dat') returning id`, [ID.pktpA, m])).rows[0].id;
  kqB = (await db.query<{ id: string }>(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1,$2,'khong_dat') returning id`, [ID.pktpB, m])).rows[0].id;
  await db.query(`insert into minh_chung_anh (ket_qua_kiem_tra_id, storage_path) values ($1, 'b/anh-cu.jpg')`, [kqB]);
}, 60_000);

const themAnh = (kq: string, path: string) =>
  db.query(`insert into minh_chung_anh (ket_qua_kiem_tra_id, storage_path) values ($1, $2)`, [kq, path]);
const datFile = (path: string) => db.query(`insert into storage.objects (bucket_id, name) values ('minh-chung', $1)`, [path]);

describe("Ảnh minh chứng", () => {
  it("trưởng khoa A thêm ảnh vào phiên nháp khoa mình; khoa/phiên tự điền", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authTkA, () => themAnh(kqA, `${ID.khoaA}/${ID.phienA}/1.jpg`));
      const r = await db.query<{ khoa_id: string; phien_kiem_tra_id: string; nguoi_tai_len_id: string }>(`select * from minh_chung_anh where ket_qua_kiem_tra_id = $1`, [kqA]);
      expect(r.rows[0].khoa_id).toBe(ID.khoaA);
      expect(r.rows[0].phien_kiem_tra_id).toBe(ID.phienA);
      expect(r.rows[0].nguoi_tai_len_id).toBe(ID.ndTkA);
    });
  });
  it("trưởng khoa A không thấy ảnh khoa B", async () => {
    const n = await voiTuCach(db, ID.authTkA, () => db.query(`select 1 from minh_chung_anh where khoa_id = $1`, [ID.khoaB]));
    expect(n.rows).toHaveLength(0);
  });
  it("ban giám đốc thấy ảnh nhưng không xóa được", async () => {
    await roiHoanTac(db, async () => {
      expect((await voiTuCach(db, ID.authBgd, () => db.query(`select 1 from minh_chung_anh`))).rows.length).toBe(1);
      expect((await voiTuCach(db, ID.authBgd, () => db.query(`delete from minh_chung_anh`))).affectedRows ?? 0).toBe(0);
    });
  });
  it("phiên đã hoàn thành: trưởng khoa không xóa được ảnh, admin xóa được", async () => {
    await roiHoanTac(db, async () => {
      expect((await voiTuCach(db, ID.authTkB, () => db.query(`delete from minh_chung_anh`))).affectedRows ?? 0).toBe(0);
      expect((await voiTuCach(db, ID.authAdmin, () => db.query(`delete from minh_chung_anh`))).affectedRows).toBe(1);
    });
  });
  it("tối đa 5 ảnh mỗi ô", async () => {
    await roiHoanTac(db, async () => {
      for (let i = 0; i < 5; i++) await themAnh(kqA, `${ID.khoaA}/${ID.phienA}/${i}.jpg`);
      await expect(themAnh(kqA, `${ID.khoaA}/${ID.phienA}/6.jpg`)).rejects.toThrow(/tối đa 5/);
    });
  });
  it("Storage: trưởng khoa A tải file vào thư mục phiên khoa mình, không vào khoa B", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authTkA, () => datFile(`${ID.khoaA}/${ID.phienA}/x.jpg`));
      await expect(voiTuCach(db, ID.authTkA, () => datFile(`${ID.khoaB}/${ID.phienB}/x.jpg`))).rejects.toThrow();
      // giả mạo: đặt phiên khoa A dưới thư mục khoa B
      await expect(voiTuCach(db, ID.authTkA, () => datFile(`${ID.khoaB}/${ID.phienA}/x.jpg`))).rejects.toThrow();
    });
  });
  it("Storage: trưởng khoa A không đọc được file của khoa B", async () => {
    await roiHoanTac(db, async () => {
      await datFile(`${ID.khoaB}/${ID.phienB}/y.jpg`);
      const r = await voiTuCach(db, ID.authTkA, () => db.query(`select 1 from storage.objects where name like $1`, [`${ID.khoaB}%`]));
      expect(r.rows).toHaveLength(0);
    });
  });
});
