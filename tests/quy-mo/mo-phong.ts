// Mô phỏng dữ liệu quy mô toàn viện để đo dung lượng và tốc độ báo cáo.
// Chạy: npx tsx tests/quy-mo/mo-phong.ts [số khoa] [số phòng/khoa] [số ngày]
import { taoDb, ID } from "../db/harness";

const [K, P, N] = process.argv.slice(2).map(Number);
const soKhoa = K || 30, soPhong = P || 10, soNgay = N || 90;

(async () => {
  const db = await taoDb();
  const t0 = Date.now();
  await db.exec(`
    insert into auth.users (id) values ('${ID.authAdmin}');
    insert into nguoi_dung (id, auth_user_id, ho_ten, vai_tro) values ('${ID.ndAdmin}', '${ID.authAdmin}', 'Admin', 'admin');
    alter table phien_kiem_tra disable trigger user; alter table phien_kiem_tra_phong disable trigger user; alter table ket_qua_kiem_tra disable trigger user;
    insert into khoa (ten_khoa) select 'Khoa ' || g from generate_series(1, ${soKhoa}) g;
    insert into phong_benh (khoa_id, so_phong) select k.id, 'Phòng ' || g from khoa k, generate_series(1, ${soPhong}) g;
    insert into phien_kiem_tra (khoa_id, nguoi_kiem_tra_id, checklist_version_id, ngay_bao_cao, trang_thai, thoi_gian_hoan_thanh,
      tong_so_nb_thuc_te, so_nb_cap_1, so_nb_cap_2, so_nb_cap_3, so_giuong_dv_trong, so_giuong_thuong_trong, tong_so_dd_co_huu,
      so_dd_dang_cong_tac_trong_ngay, so_dd_ra_truc, so_dd_nghi_bu_nghi_phep)
      select k.id, '${ID.ndAdmin}', (select id from checklist_version limit 1), current_date - d, 'hoan_thanh', now(), 40, 6, 20, 14, 2, 3, 18, 11, 2, 1
      from khoa k, generate_series(1, ${soNgay}) d;
    insert into phien_kiem_tra_phong (phien_kiem_tra_id, phong_benh_id, ten_dd_phu_trach, tong_so_nguoi_benh)
      select p.id, pb.id, 'Nguyễn Thị A', 4 from phien_kiem_tra p join phong_benh pb on pb.khoa_id = p.khoa_id;
    insert into ket_qua_kiem_tra (phien_kiem_tra_phong_id, checklist_item_id, trang_thai, cap_nhat_luc)
      select pp.id, ci.id, (array['dat_co','dat_co','dat_co','dat_co','dat_co','dat_co','dat_co','dat_co','khong_dat','khong_co_bo_chuan'])[1 + floor(random() * 10)::int]::trang_thai_kq, now()
      from phien_kiem_tra_phong pp cross join checklist_item ci;
    analyze;
  `);
  const sinh = Date.now() - t0;
  const dem = (await db.query<{ n: number }>(`select count(*)::int n from ket_qua_kiem_tra`)).rows[0].n;
  const kt = (await db.query<{ bang: string; mb: string }>(`
    select relname bang, round(pg_total_relation_size(c.oid) / 1048576.0, 1)::text mb from pg_class c
    where relname in ('ket_qua_kiem_tra', 'phien_kiem_tra_phong', 'phien_kiem_tra', 'audit_log') and relkind = 'r'`)).rows;
  const tong = (await db.query<{ mb: string }>(`select round(sum(pg_total_relation_size(c.oid)) / 1048576.0, 1)::text mb from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and relkind = 'r'`)).rows[0].mb;
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [ID.authAdmin]);
  await db.exec(`set role authenticated`);
  const do_ = async (ten: string, sql: string) => { const t = Date.now(); await db.query(sql); console.log(`  ${ten}: ${Date.now() - t} ms`); };
  console.log(`Sinh ${dem.toLocaleString("vi-VN")} dòng kết quả (${soKhoa} khoa × ${soPhong} phòng × 35 mục × ${soNgay} ngày) trong ${(sinh / 1000).toFixed(0)} giây`);
  console.log("Dung lượng:", kt.map((r) => `${r.bang} ${r.mb} MB`).join(" · "), `· toàn bộ public ${tong} MB`);
  console.log("Thời gian truy vấn dashboard (admin, toàn bộ khoảng ngày):");
  await do_("Xếp hạng khoa", `select * from bao_cao_ty_le_dat(current_date - ${soNgay}, current_date)`);
  await do_("Xu hướng theo tháng", `select * from db_xu_huong(current_date - ${soNgay}, current_date, 'thang')`);
  await do_("Bảng nhiệt khoa × mục", `select * from db_nhiet_khoa_muc(current_date - ${soNgay}, current_date)`);
  await do_("Top không đạt", `select * from db_theo_muc(current_date - ${soNgay}, current_date)`);
  await do_("Tỷ lệ theo phòng 1 khoa", `select * from db_theo_phong(current_date - ${soNgay}, current_date, (select id from khoa limit 1))`);
  await do_("Tuân thủ đi buồng", `select * from db_tuan_thu(current_date - ${soNgay}, current_date)`);
  await do_("Phần I theo tháng", `select * from db_phan_1(current_date - ${soNgay}, current_date)`);
  await do_("Xu hướng 1 tháng gần nhất", `select * from db_xu_huong(current_date - 30, current_date, 'tuan')`);
  process.exit(0);
})();
