// Mốc 7: hàm dashboard — dùng công thức chung và tôn trọng phân quyền.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
  const tt = ["dat_co", "dat_co", "dat_co", "khong_dat", "khong_co_bo_chuan"];
  for (let i = 0; i < tt.length; i++) {
    await db.query(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1,$2,$3)`, [ID.pktpB, await mucTheoStt(db, i + 1), tt[i]]);
  }
  await db.query(`update phien_kiem_tra set tong_so_nb_thuc_te = 30, so_dd_dang_cong_tac_trong_ngay = 10, so_giuong_dv_trong = 1, so_giuong_thuong_trong = 1 where id = $1`, [ID.phienB]);
  await db.query(`update khoa set so_giuong_ke_hoach = 20 where id = $1`, [ID.khoaB]);
}, 60_000);

describe("Dashboard", () => {
  it("xu hướng theo tháng = 75% (3/4), cùng công thức", async () => {
    const r = (await db.query<{ ty_le_dat: string }>(`select * from db_xu_huong('2026-11-01', '2026-11-30', 'thang')`)).rows;
    expect(r).toHaveLength(1);
    expect(Number(r[0].ty_le_dat)).toBe(75);
  });
  it("theo phòng và theo mục", async () => {
    const p = (await db.query<{ ty_le_dat: string }>(`select * from db_theo_phong('2026-11-01', '2026-11-30', $1)`, [ID.khoaB])).rows;
    expect(Number(p[0].ty_le_dat)).toBe(75);
    const m = (await db.query<{ ma_muc_goc: string; so_khong_dat: number }>(`select * from db_theo_muc('2026-11-01', '2026-11-30')`)).rows;
    expect(Number(m.find((x) => x.ma_muc_goc === "M-004")!.so_khong_dat)).toBe(1);
  });
  it("Phần I: tỷ số NB/ĐD = 3, công suất giường = 90%", async () => {
    const r = (await db.query<{ ty_so_nb_dd: string; cong_suat_giuong: string }>(`select * from db_phan_1('2026-11-01', '2026-11-30')`)).rows[0];
    expect(Number(r.ty_so_nb_dd)).toBe(3);
    expect(Number(r.cong_suat_giuong)).toBe(90);
  });
  it("tuân thủ: đếm ngày phải đi buồng thứ 2–6 và ngày có phiên hoàn thành", async () => {
    // 26/10–02/11/2026: thứ 2–6 tuần 26–30/10 (5 ngày) + thứ 2 ngày 02/11 = 6 ngày phải đi buồng;
    // không tính ngày tương lai nên chọn khoảng đã qua.
    const r = (await voiTuCach(db, ID.authAdmin, () => db.query<{ khoa_id: string; so_ngay_phai: number; so_ngay_co_phien: number }>(`select * from db_tuan_thu('2026-10-26', '2026-11-02')`))).rows;
    const b = r.find((x) => x.khoa_id === ID.khoaB)!;
    expect(b.so_ngay_phai).toBe(6);
    expect(b.so_ngay_co_phien).toBe(1);
  });
  it("trưởng khoa A không thấy số liệu khoa B ở mọi hàm", async () => {
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authTkA, async () => {
        expect((await db.query(`select * from db_xu_huong('2026-11-01', '2026-11-30')`)).rows).toHaveLength(0);
        expect((await db.query(`select * from db_nhiet_khoa_muc('2026-11-01', '2026-11-30')`)).rows).toHaveLength(0);
        const tt = (await db.query<{ khoa_id: string }>(`select * from db_tuan_thu('2026-11-02', '2026-11-08')`)).rows;
        expect(tt.every((x) => x.khoa_id === ID.khoaA)).toBe(true);
        const c = (await db.query<{ khoa_id: string }>(`select * from db_chua_di_buong_hom_nay()`)).rows;
        expect(c.every((x) => x.khoa_id === ID.khoaA)).toBe(true);
      });
    });
  });
});
