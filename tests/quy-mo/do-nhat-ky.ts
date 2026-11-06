// Đo dung lượng nhật ký thao tác sinh ra cho mỗi ô kết quả (chấm 1 lần + sửa lại 20%).
// Chạy: npx tsx tests/quy-mo/do-nhat-ky.ts
import { taoDb, napDuLieuMau, ID } from "../db/harness";

(async () => {
  try {
    const db = await taoDb();
    await napDuLieuMau(db);
    await db.exec(`insert into phong_benh (khoa_id, so_phong) select '${ID.khoaA}', 'X' || g from generate_series(1, 50) g`);
    await db.exec(`insert into phien_kiem_tra_phong (phien_kiem_tra_id, phong_benh_id) select '${ID.phienA}', id from phong_benh where khoa_id = '${ID.khoaA}' and so_phong like 'X%'`);
    const kt = async () => Number((await db.query<{ n: string }>(`select pg_total_relation_size('audit_log')::text n`)).rows[0].n);
    const a0 = await kt();
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [ID.authTkA]);
    await db.exec(`set role authenticated`);
    await db.exec(`insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai)
       select pp.id, ci.id, 'dat_co' from phien_kiem_tra_phong pp cross join checklist_item ci where pp.phien_kiem_tra_id = '${ID.phienA}' and pp.phong_benh_id <> '${ID.phongA1}'`);
    await db.exec(`update ket_qua_kiem_tra set trang_thai = 'khong_dat' where random() < 0.2`);
    await db.exec(`reset role`);
    const o = Number((await db.query<{ n: string }>(`select count(*)::text n from ket_qua_kiem_tra`)).rows[0].n);
    const n = Number((await db.query<{ n: string }>(`select count(*)::text n from audit_log where doi_tuong_loai = 'ket_qua_kiem_tra'`)).rows[0].n);
    console.log(`ô: ${o}, dòng nhật ký: ${n}, byte nhật ký trung bình mỗi ô: ${Math.round(((await kt()) - a0) / o)}`);
  } catch (e) {
    console.log("LỖI:", (e as Error).message);
  }
  process.exit(0);
})();
