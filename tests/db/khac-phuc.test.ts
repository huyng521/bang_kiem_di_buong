// Mốc 3: hành động khắc phục — quyền theo khoa, quy tắc chuyển trạng thái, không xóa cứng.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
let muc: string;
let hdB: string;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
  muc = await mucTheoStt(db, 22);
  hdB = (await db.query<{ id: string }>(
    `insert into hanh_dong_khac_phuc (khoa_id, phien_kiem_tra_id, checklist_item_id, mo_ta_van_de, han_xu_ly)
     values ($1, $2, $3, 'Nhà vệ sinh có mùi', '2026-01-01') returning id`, [ID.khoaB, ID.phienB, muc])).rows[0].id;
}, 60_000);

const taoHd = (khoa: string, phien: string) =>
  db.query<{ id: string }>(`insert into hanh_dong_khac_phuc (khoa_id, phien_kiem_tra_id, checklist_item_id, mo_ta_van_de) values ($1,$2,$3,'x') returning id`, [khoa, phien, muc]);
const doiTT = (id: string, tt: string, extra = "") => db.query(`update hanh_dong_khac_phuc set trang_thai = '${tt}' ${extra} where id = $1`, [id]);

describe("Hành động khắc phục", () => {
  it("trưởng khoa B tạo được cho phiên đã hoàn thành của khoa mình; lịch sử ghi 'mới'", async () => {
    await roiHoanTac(db, async () => {
      const id = (await voiTuCach(db, ID.authTkB, () => taoHd(ID.khoaB, ID.phienB))).rows[0].id;
      const ls = await db.query(`select * from hanh_dong_khac_phuc_lich_su where hanh_dong_id = $1`, [id]);
      expect(ls.rows).toHaveLength(1);
    });
  });
  it("trưởng khoa A không tạo/xem/sửa được hành động khoa B", async () => {
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authTkA, () => taoHd(ID.khoaB, ID.phienB))).rejects.toThrow();
      expect((await voiTuCach(db, ID.authTkA, () => db.query(`select 1 from hanh_dong_khac_phuc`))).rows).toHaveLength(0);
      expect((await voiTuCach(db, ID.authTkA, () => doiTT(hdB, "dang_xu_ly"))).affectedRows).toBe(0);
    });
  });
  it("không gắn được hành động khoa A vào phiên khoa B (giả mạo khoa)", async () => {
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authAdmin, () => taoHd(ID.khoaA, ID.phienB))).rejects.toThrow(/đúng khoa/);
    });
  });
  it("đi đúng luồng Mới → Đang xử lý → Đã khắc phục → Đã xác nhận", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authTkB, async () => {
        await doiTT(hdB, "dang_xu_ly");
        await doiTT(hdB, "da_khac_phuc");
        await doiTT(hdB, "da_xac_nhan");
      });
      const r = (await db.query<{ ngay_hoan_thanh: unknown; nguoi_xac_nhan_id: string }>(`select * from hanh_dong_khac_phuc where id = $1`, [hdB])).rows[0];
      expect(r.ngay_hoan_thanh).not.toBeNull();
      expect(r.nguoi_xac_nhan_id).toBe(ID.ndTkB);
    });
  });
  it("không nhảy cóc Mới → Đã xác nhận", async () => {
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authTkB, () => doiTT(hdB, "da_xac_nhan"))).rejects.toThrow(/Không chuyển được/);
    });
  });
  it("hủy phải có lý do", async () => {
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authTkB, () => doiTT(hdB, "huy"))).rejects.toThrow(/lý do/);
      await voiTuCach(db, ID.authTkB, () => doiTT(hdB, "huy", ", ly_do_huy = 'Trùng'"));
    });
  });
  it("ban giám đốc chỉ xem; không ai xóa cứng được", async () => {
    await roiHoanTac(db, async () => {
      expect((await voiTuCach(db, ID.authBgd, () => db.query(`select 1 from hanh_dong_khac_phuc`))).rows).toHaveLength(1);
      expect((await voiTuCach(db, ID.authBgd, () => doiTT(hdB, "dang_xu_ly"))).affectedRows).toBe(0);
      expect((await voiTuCach(db, ID.authAdmin, () => db.query(`delete from hanh_dong_khac_phuc`))).affectedRows ?? 0).toBe(0);
    });
  });
  it("thống kê: hành động quá hạn được đếm", async () => {
    const r = await db.query<{ so_qua_han: number }>(`select * from thong_ke_khac_phuc('2000-01-01', '2100-01-01') where khoa_id = $1`, [ID.khoaB]);
    expect(Number(r.rows[0].so_qua_han)).toBe(1);
  });
  it("ảnh sau khắc phục: tải được vào thư mục hành động của khoa mình", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authTkB, async () => {
        await db.query(`insert into storage.objects (bucket_id, name) values ('minh-chung', $1)`, [`${ID.khoaB}/${hdB}/a.jpg`]);
        await db.query(`insert into minh_chung_anh (hanh_dong_khac_phuc_id, storage_path) values ($1, $2)`, [hdB, `${ID.khoaB}/${hdB}/a.jpg`]);
      });
      await expect(voiTuCach(db, ID.authTkA, () =>
        db.query(`insert into storage.objects (bucket_id, name) values ('minh-chung', $1)`, [`${ID.khoaB}/${hdB}/b.jpg`]))).rejects.toThrow();
    });
  });
});
