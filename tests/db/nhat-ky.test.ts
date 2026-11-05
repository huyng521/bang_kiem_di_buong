// Mốc 5: nhật ký thao tác — tự ghi bằng trigger, bất biến, chỉ admin xem.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
}, 60_000);

const nhatKy = (where = "true", p: unknown[] = []) =>
  db.query<{ hanh_dong: string; doi_tuong_loai: string; khoa_id: string; nguoi_dung_id: string; gia_tri_cu: Record<string, unknown>; gia_tri_moi: Record<string, unknown> }>(`select * from audit_log where ${where} order by id`, p);

describe("Nhật ký thao tác", () => {
  it("trưởng khoa chấm 1 ô → ghi 'tao' ở ket_qua_kiem_tra, đúng người, đúng khoa", async () => {
    await roiHoanTac(db, async () => {
      const m = await mucTheoStt(db, 3);
      await voiTuCach(db, ID.authTkA, () => db.query(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1,$2,'dat_co')`, [ID.pktpA, m]));
      const r = (await nhatKy(`doi_tuong_loai = 'ket_qua_kiem_tra'`)).rows.at(-1)!;
      expect(r.hanh_dong).toBe("tao");
      expect(r.nguoi_dung_id).toBe(ID.ndTkA);
      expect(r.khoa_id).toBe(ID.khoaA);
    });
  });
  it("admin sửa phiên đã hoàn thành → lưu giá trị cũ và mới, chỉ cột thay đổi", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authAdmin, () => db.query(`update phien_kiem_tra set bien_phap_khac_phuc = 'mới' where id = $1`, [ID.phienB]));
      const r = (await nhatKy(`doi_tuong_loai = 'phien_kiem_tra'`)).rows.at(-1)!;
      expect(r.hanh_dong).toBe("sua");
      expect(r.gia_tri_moi).toEqual({ bien_phap_khac_phuc: "mới" });
      expect(Object.keys(r.gia_tri_cu)).toEqual(["bien_phap_khac_phuc"]);
    });
  });
  it("khóa tài khoản được ghi là 'khoa_tai_khoan'", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authAdmin, () => db.query(`update nguoi_dung set active = false where id = $1`, [ID.ndTkB]));
      expect((await nhatKy(`doi_tuong_loai = 'nguoi_dung'`)).rows.at(-1)!.hanh_dong).toBe("khoa_tai_khoan");
    });
  });
  it("không ai sửa/xóa được nhật ký, kể cả quyền cao nhất", async () => {
    await roiHoanTac(db, async () => {
      await db.query(`update khoa set ten_khoa = 'X' where id = $1`, [ID.khoaA]);
      await expect(db.query(`delete from audit_log`)).rejects.toThrow(/chỉ được thêm/);
    });
    await roiHoanTac(db, async () => {
      await expect(db.query(`update audit_log set hanh_dong = 'x'`)).rejects.toThrow(/chỉ được thêm/);
    });
  });
  it("trưởng khoa không đọc được nhật ký, không ghi trực tiếp được", async () => {
    await roiHoanTac(db, async () => {
      await db.query(`update khoa set ten_khoa = 'Y' where id = $1`, [ID.khoaA]);
      expect((await voiTuCach(db, ID.authTkA, () => db.query(`select 1 from audit_log`))).rows).toHaveLength(0);
      await expect(voiTuCach(db, ID.authTkA, () => db.query(`insert into audit_log (hanh_dong, doi_tuong_loai) values ('x','y')`))).rejects.toThrow();
    });
  });
  it("ghi sự kiện xuất file qua hàm ghi_nhat_ky; loại sự kiện lạ bị từ chối", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authBgd, () => db.query(`select ghi_nhat_ky('xuat_file', 'pdf_phien', $1, $2, '{"anh":false}')`, [ID.phienB, ID.khoaB]));
      const r = (await nhatKy(`hanh_dong = 'xuat_file'`)).rows.at(-1)!;
      expect(r.nguoi_dung_id).toBe(ID.ndBgd);
      await expect(voiTuCach(db, ID.authBgd, () => db.query(`select ghi_nhat_ky('xoa', 'phien_kiem_tra')`))).rejects.toThrow();
    });
  });
});
