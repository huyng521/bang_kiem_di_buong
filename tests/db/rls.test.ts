// Kiểm thử phân quyền ở tầng database (RLS) theo ma trận quyền trong CLAUDE.md.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, mucTheoStt, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
}, 60_000);

const dem = async (sql: string, params: unknown[] = []) =>
  Number((await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`, params)).rows[0].n);

describe("Xem phiên kiểm tra", () => {
  it("trưởng khoa A chỉ thấy phiên của khoa A", async () => {
    const n = await voiTuCach(db, ID.authTkA, () => dem(`select id, khoa_id from phien_kiem_tra`));
    const khac = await voiTuCach(db, ID.authTkA, () => dem(`select 1 from phien_kiem_tra where khoa_id <> $1`, [ID.khoaA]));
    expect(n).toBeGreaterThan(0);
    expect(khac).toBe(0);
  });
  it("trưởng khoa A không thấy phòng/kết quả của phiên khoa B", async () => {
    expect(await voiTuCach(db, ID.authTkA, () => dem(`select 1 from phien_kiem_tra_phong where id = $1`, [ID.pktpB]))).toBe(0);
  });
  it("ban giám đốc và admin thấy tất cả khoa", async () => {
    expect(await voiTuCach(db, ID.authBgd, () => dem(`select 1 from phien_kiem_tra`))).toBe(2);
    expect(await voiTuCach(db, ID.authAdmin, () => dem(`select 1 from phien_kiem_tra`))).toBe(2);
  });
  it("người chưa đăng nhập không thấy gì", async () => {
    await expect(voiTuCach(db, null, () => dem(`select 1 from phien_kiem_tra`))).rejects.toThrow();
  });
});

describe("Ghi phiên kiểm tra", () => {
  it("trưởng khoa A không tạo được phiên cho khoa B", async () => {
    await roiHoanTac(db, async () => {
      await expect(
        voiTuCach(db, ID.authTkA, () =>
          db.query(`insert into phien_kiem_tra (khoa_id, nguoi_kiem_tra_id, checklist_version_id)
                    select $1, $2, id from checklist_version limit 1`, [ID.khoaB, ID.ndTkA]),
        ),
      ).rejects.toThrow();
    });
  });
  it("trưởng khoa A không sửa được phiên khoa B", async () => {
    await roiHoanTac(db, async () => {
      const r = await voiTuCach(db, ID.authTkA, () =>
        db.query(`update phien_kiem_tra set y_kien_van_de_nguoi_benh = 'x' where id = $1`, [ID.phienB]));
      expect(r.affectedRows).toBe(0);
    });
  });
  it("trưởng khoa A không chấm được kết quả vào phòng của khoa B", async () => {
    const m1 = await mucTheoStt(db, 1);
    await roiHoanTac(db, async () => {
      await expect(
        voiTuCach(db, ID.authTkA, () =>
          db.query(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1, $2, 'dat_co')`, [ID.pktpB, m1])),
      ).rejects.toThrow();
    });
  });
  it("trưởng khoa A chấm được phiên nháp của khoa mình", async () => {
    const m1 = await mucTheoStt(db, 1);
    await roiHoanTac(db, async () => {
      await voiTuCach(db, ID.authTkA, () =>
        db.query(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1, $2, 'dat_co')`, [ID.pktpA, m1]));
    });
  });
  it("trưởng khoa không sửa được phiên đã hoàn thành của khoa mình", async () => {
    await roiHoanTac(db, async () => {
      const r = await voiTuCach(db, ID.authTkB, () =>
        db.query(`update phien_kiem_tra set y_kien_van_de_nguoi_benh = 'x' where id = $1`, [ID.phienB]));
      expect(r.affectedRows).toBe(0);
    });
  });
  it("admin sửa được phiên đã hoàn thành", async () => {
    await roiHoanTac(db, async () => {
      const r = await voiTuCach(db, ID.authAdmin, () =>
        db.query(`update phien_kiem_tra set y_kien_van_de_nguoi_benh = 'x' where id = $1`, [ID.phienB]));
      expect(r.affectedRows).toBe(1);
    });
  });
  it("không ai xóa cứng được phiên (kể cả admin)", async () => {
    await roiHoanTac(db, async () => {
      const r = await voiTuCach(db, ID.authAdmin, () => db.query(`delete from phien_kiem_tra where id = $1`, [ID.phienB]));
      expect(r.affectedRows ?? 0).toBe(0);
    });
  });
  it("trưởng khoa không tự ẩn mềm được phiên (chỉ admin)", async () => {
    await roiHoanTac(db, async () => {
      await expect(
        voiTuCach(db, ID.authTkA, () => db.query(`update phien_kiem_tra set an = true where id = $1`, [ID.phienA])),
      ).rejects.toThrow();
    });
  });
  it("trưởng khoa không đổi được người kiểm tra của phiên", async () => {
    await roiHoanTac(db, async () => {
      await expect(
        voiTuCach(db, ID.authTkA, () => db.query(`update phien_kiem_tra set nguoi_kiem_tra_id = $2 where id = $1`, [ID.phienA, ID.ndAdmin])),
      ).rejects.toThrow();
    });
  });
});

describe("Ban giám đốc chỉ xem", () => {
  it("không sửa được phiên, kết quả, danh mục", async () => {
    await roiHoanTac(db, async () => {
      const a = await voiTuCach(db, ID.authBgd, () => db.query(`update phien_kiem_tra set y_kien_van_de_nguoi_benh='x'`));
      const b = await voiTuCach(db, ID.authBgd, () => db.query(`update khoa set ten_khoa='x'`));
      expect(a.affectedRows).toBe(0);
      expect(b.affectedRows).toBe(0);
    });
  });
});

describe("Danh mục chỉ admin quản lý", () => {
  for (const [bang, sql] of [
    ["khoa", `insert into khoa (ten_khoa) values ('X')`],
    ["checklist_item", `update checklist_item set noi_dung = 'x'`],
    ["nguoi_dung", `update nguoi_dung set vai_tro = 'admin'`],
  ] as const) {
    it(`trưởng khoa không ghi được bảng ${bang}`, async () => {
      await roiHoanTac(db, async () => {
        const run = voiTuCach(db, ID.authTkA, () => db.query(sql));
        if (sql.startsWith("insert")) await expect(run).rejects.toThrow();
        else expect((await run).affectedRows).toBe(0);
      });
    });
  }
});

describe("Tài khoản bị khóa", () => {
  it("bị chặn ở database ngay cả khi còn phiên đăng nhập", async () => {
    await roiHoanTac(db, async () => {
      await db.query(`update nguoi_dung set active = false where id = $1`, [ID.ndTkA]);
      expect(await voiTuCach(db, ID.authTkA, () => dem(`select 1 from phien_kiem_tra`))).toBe(0);
    });
  });
});

describe("Mốc 1 — bổ sung", () => {
  it("tài khoản bị khóa không ghi được kết quả", async () => {
    const m1 = await mucTheoStt(db, 2);
    await roiHoanTac(db, async () => {
      await db.query(`update nguoi_dung set active = false where id = $1`, [ID.ndTkA]);
      await expect(
        voiTuCach(db, ID.authTkA, () =>
          db.query(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1, $2, 'dat_co')`, [ID.pktpA, m1])),
      ).rejects.toThrow();
    });
  });
  it("tài khoản bị khóa không đọc được danh mục khoa", async () => {
    await roiHoanTac(db, async () => {
      await db.query(`update nguoi_dung set active = false where id = $1`, [ID.ndTkA]);
      expect(await voiTuCach(db, ID.authTkA, () => dem(`select 1 from khoa`))).toBe(0);
    });
  });
  it("trưởng khoa không tạo được phiên ở trạng thái đã hoàn thành", async () => {
    await roiHoanTac(db, async () => {
      await expect(
        voiTuCach(db, ID.authTkA, () =>
          db.query(`insert into phien_kiem_tra (khoa_id, nguoi_kiem_tra_id, checklist_version_id, trang_thai)
                    select $1, $2, id, 'hoan_thanh' from checklist_version limit 1`, [ID.khoaA, ID.ndTkA])),
      ).rejects.toThrow();
    });
  });
  it("trưởng khoa vẫn hoàn thành được phiên nháp của khoa mình", async () => {
    await roiHoanTac(db, async () => {
      const r = await voiTuCach(db, ID.authTkA, () =>
        db.query(`update phien_kiem_tra set trang_thai = 'hoan_thanh', thoi_gian_hoan_thanh = now() where id = $1`, [ID.phienA]));
      expect(r.affectedRows).toBe(1);
    });
  });
  it("admin ẩn mềm được phiên", async () => {
    await roiHoanTac(db, async () => {
      const r = await voiTuCach(db, ID.authAdmin, () => db.query(`update phien_kiem_tra set an = true where id = $1`, [ID.phienA]));
      expect(r.affectedRows).toBe(1);
    });
  });
});

describe("Mốc 10 — nguồn dữ liệu báo cáo tối ưu vẫn đúng quyền", () => {
  it("trưởng khoa A chỉ nhận dòng khoa A; tài khoản khóa không nhận gì; ban giám đốc nhận mọi khoa", async () => {
    const m1 = await mucTheoStt(db, 1);
    await roiHoanTac(db, async () => {
      await db.query(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai) values ($1,$2,'dat_co')`, [ID.pktpB, m1]);
      expect(await voiTuCach(db, ID.authTkA, () => dem(`select 1 from ket_qua_trong_khoang('2000-01-01', '2100-01-01')`))).toBe(0);
      expect(await voiTuCach(db, ID.authTkB, () => dem(`select 1 from ket_qua_trong_khoang('2000-01-01', '2100-01-01')`))).toBe(1);
      expect(await voiTuCach(db, ID.authBgd, () => dem(`select 1 from ket_qua_trong_khoang('2000-01-01', '2100-01-01')`))).toBe(1);
      await db.query(`update nguoi_dung set active = false where id = $1`, [ID.ndTkB]);
      expect(await voiTuCach(db, ID.authTkB, () => dem(`select 1 from ket_qua_trong_khoang('2000-01-01', '2100-01-01')`))).toBe(0);
    });
  });
});
