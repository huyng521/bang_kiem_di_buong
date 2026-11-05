// Mốc 6: phiên bản bảng kiểm — dữ liệu lịch sử không bị sai lệch.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ID, napDuLieuMau, roiHoanTac, taoDb, voiTuCach } from "./harness";

let db: PGlite;
let ver2: string;
beforeAll(async () => {
  db = await taoDb();
  await napDuLieuMau(db);
  ver2 = (await db.query<{ id: string }>(`select id from checklist_version`)).rows[0].id;
}, 60_000);

const homNay = async () => (await db.query<{ d: string }>(`select ((now() at time zone 'Asia/Ho_Chi_Minh')::date)::text d`)).rows[0].d;
const congBo = (id: string, ngay: string) =>
  db.query(`select cong_bo_phien_ban($1, 'Số 12/QĐ-BV', '2026-10-01', 'Sửa đổi bảng kiểm đi buồng', $2::date)`, [id, ngay]);

describe("Dữ liệu cũ sau migration", () => {
  it("một phiên bản 'Ver 2', đã công bố; mục có mã M-001…", async () => {
    const v = (await db.query<{ ten_phien_ban: string; trang_thai: string }>(`select * from checklist_version`)).rows;
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ ten_phien_ban: "Ver 2", trang_thai: "da_cong_bo" });
    const m = (await db.query<{ ma_muc_goc: string }>(`select ma_muc_goc from checklist_item order by stt limit 2`)).rows;
    expect(m.map((x) => x.ma_muc_goc)).toEqual(["M-001", "M-002"]);
  });
});

describe("Khóa phiên bản đã công bố", () => {
  it("không sửa/xóa được mục, không sửa được phiên bản — kể cả admin", async () => {
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authAdmin, () => db.query(`update checklist_item set noi_dung = 'x' where checklist_version_id = $1`, [ver2]))).rejects.toThrow(/không sửa/);
    });
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authAdmin, () => db.query(`update checklist_version set ten_phien_ban = 'x'`))).rejects.toThrow(/không sửa/);
    });
    await roiHoanTac(db, async () => {
      await expect(voiTuCach(db, ID.authAdmin, () => db.query(`insert into checklist_item (checklist_version_id, stt, noi_dung, ma_muc_goc) values ($1, 99, 'x', 'M-099')`, [ver2]))).rejects.toThrow();
    });
  });
});

describe("Luồng tạo và công bố phiên bản mới", () => {
  it("nhân bản đủ mục, giữ mã; chỉ một bản nháp; trưởng khoa không thấy bản nháp", async () => {
    await roiHoanTac(db, async () => {
      const id = (await voiTuCach(db, ID.authAdmin, () => db.query<{ id: string }>(`select tao_phien_ban_moi('Ver 3') id`))).rows[0].id;
      const n = (await db.query<{ n: number }>(`select count(*)::int n from checklist_item where checklist_version_id = $1`, [id])).rows[0].n;
      expect(n).toBe(35);
      await expect(voiTuCach(db, ID.authAdmin, () => db.query(`select tao_phien_ban_moi('Ver 4')`))).rejects.toThrow(/bản nháp/);
      expect((await voiTuCach(db, ID.authTkA, () => db.query(`select 1 from checklist_version where id = $1`, [id]))).rows).toHaveLength(0);
    });
  });
  it("sửa được bản nháp; công bố bắt buộc văn bản căn cứ và ngày hiệu lực ≥ hôm nay", async () => {
    await roiHoanTac(db, async () => {
      const id = (await voiTuCach(db, ID.authAdmin, () => db.query<{ id: string }>(`select tao_phien_ban_moi('Ver 3') id`))).rows[0].id;
      await voiTuCach(db, ID.authAdmin, async () => {
        await db.query(`update checklist_item set noi_dung = 'Câu chữ mới' where checklist_version_id = $1 and stt = 1`, [id]);
        await db.query(`insert into checklist_item (checklist_version_id, stt, noi_dung, ma_muc_goc) values ($1, 36, 'Tiêu chí mới', ma_muc_moi())`, [id]);
      });
      const ma = (await db.query<{ ma_muc_goc: string }>(`select ma_muc_goc from checklist_item where checklist_version_id = $1 and stt = 36`, [id])).rows[0].ma_muc_goc;
      expect(ma).toBe("M-036");
      await expect(voiTuCach(db, ID.authAdmin, () => db.query(`select cong_bo_phien_ban($1, '', null, '', $2::date)`, [id, "2099-01-01"]))).rejects.toThrow(/văn bản/);
      await expect(voiTuCach(db, ID.authAdmin, () => congBo(id, "2000-01-01"))).rejects.toThrow(/trước hôm nay/);
      await expect(voiTuCach(db, ID.authTkA, () => congBo(id, "2099-01-01"))).rejects.toThrow(/quản trị/);
      await voiTuCach(db, ID.authAdmin, () => congBo(id, "2099-01-01"));
      const v = (await db.query<{ trang_thai: string; nguoi_cong_bo_id: string }>(`select * from checklist_version where id = $1`, [id])).rows[0];
      expect(v).toMatchObject({ trang_thai: "da_cong_bo", nguoi_cong_bo_id: ID.ndAdmin });
      // hiệu lực năm 2099 nên hôm nay vẫn là Ver 2
      expect((await db.query<{ v: string }>(`select phien_ban_hieu_luc() v`)).rows[0].v).toBe(ver2);
      expect((await db.query<{ v: string }>(`select phien_ban_hieu_luc('2099-02-01') v`)).rows[0].v).toBe(id);
    });
  });
  it("không cho hai phiên bản trùng ngày hiệu lực", async () => {
    await roiHoanTac(db, async () => {
      const d = await homNay();
      const id = (await voiTuCach(db, ID.authAdmin, () => db.query<{ id: string }>(`select tao_phien_ban_moi('Ver 3') id`))).rows[0].id;
      const ngayVer2 = (await db.query<{ d: string }>(`select ngay_hieu_luc::text d from checklist_version where id = $1`, [ver2])).rows[0].d;
      if (ngayVer2 >= d) await expect(voiTuCach(db, ID.authAdmin, () => congBo(id, ngayVer2))).rejects.toThrow(/đúng ngày/);
    });
  });
  it("phiên mới lấy phiên bản hiệu lực lúc bắt đầu; phiên nháp cũ giữ nguyên phiên bản", async () => {
    await roiHoanTac(db, async () => {
      const d = await homNay();
      const id = (await voiTuCach(db, ID.authAdmin, () => db.query<{ id: string }>(`select tao_phien_ban_moi('Ver 3') id`))).rows[0].id;
      // Đưa ngày hiệu lực Ver 2 về quá khứ (dữ liệu thử) để Ver 3 hiệu lực hôm nay được.
      await db.exec(`set app.cho_doi_trang_thai_phien_ban = 'off'; alter table checklist_version disable trigger trg_khoa_phien_ban; update checklist_version set ngay_hieu_luc = '2020-01-01' where id = '${ver2}'; alter table checklist_version enable trigger trg_khoa_phien_ban;`);
      await voiTuCach(db, ID.authAdmin, () => congBo(id, d));
      const moi = (await voiTuCach(db, ID.authTkA, () => db.query<{ checklist_version_id: string }>(
        `insert into phien_kiem_tra (khoa_id, nguoi_kiem_tra_id, checklist_version_id) values ($1, $2, $3) returning checklist_version_id`, [ID.khoaA, ID.ndTkA, ver2]))).rows[0];
      expect(moi.checklist_version_id).toBe(id);
      const cu = (await db.query<{ checklist_version_id: string }>(`select checklist_version_id from phien_kiem_tra where id = $1`, [ID.phienA])).rows[0];
      expect(cu.checklist_version_id).toBe(ver2);
      expect((await db.query<{ trang_thai: string }>(`select trang_thai from checklist_version where id = $1`, [ver2])).rows[0].trang_thai).toBe("het_hieu_luc");
    });
  });
});
