// Dựng một Postgres nhúng (PGlite) chạy đúng các file trong supabase/migrations,
// giả lập phần Supabase cung cấp sẵn (schema auth, auth.uid(), role authenticated),
// để kiểm thử RLS và các hàm SQL mà không cần project Supabase thật.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(__dirname, "../../supabase/migrations");

export async function taoDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create role authenticated nologin;
    create role anon nologin;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  // Supabase mặc định cấp quyền bảng cho role authenticated; RLS mới là lớp chặn thật.
  await db.exec(`
    grant all on all tables in schema public to authenticated;
    grant execute on all functions in schema public to authenticated;
  `);
  return db;
}

/** Chạy fn với tư cách một người dùng đã đăng nhập (authUserId), RLS được áp dụng. */
export async function voiTuCach<T>(db: PGlite, authUserId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [authUserId ?? ""]);
  await db.exec(`set role ${authUserId ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role`);
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Chạy fn trong một giao dịch rồi hoàn tác, để mỗi bài kiểm thử độc lập. */
export async function roiHoanTac(db: PGlite, fn: () => Promise<void>): Promise<void> {
  await db.exec("begin");
  try {
    await fn();
  } finally {
    await db.exec("rollback");
  }
}

// ---- Dữ liệu mẫu: 2 khoa, 4 người dùng, 1 phiên nháp ở khoa A, 1 phiên hoàn thành ở khoa B ----
export const ID = {
  khoaA: "00000000-0000-0000-0000-00000000000a",
  khoaB: "00000000-0000-0000-0000-00000000000b",
  phongA1: "00000000-0000-0000-0000-0000000000a1",
  phongB1: "00000000-0000-0000-0000-0000000000b1",
  authAdmin: "10000000-0000-0000-0000-000000000001",
  authTkA: "10000000-0000-0000-0000-00000000000a",
  authTkB: "10000000-0000-0000-0000-00000000000b",
  authBgd: "10000000-0000-0000-0000-000000000009",
  ndAdmin: "20000000-0000-0000-0000-000000000001",
  ndTkA: "20000000-0000-0000-0000-00000000000a",
  ndTkB: "20000000-0000-0000-0000-00000000000b",
  ndBgd: "20000000-0000-0000-0000-000000000009",
  phienA: "30000000-0000-0000-0000-00000000000a",
  phienB: "30000000-0000-0000-0000-00000000000b",
  pktpA: "40000000-0000-0000-0000-00000000000a",
  pktpB: "40000000-0000-0000-0000-00000000000b",
};

export async function napDuLieuMau(db: PGlite) {
  const i = ID;
  await db.exec(`
    insert into auth.users (id) values ('${i.authAdmin}'), ('${i.authTkA}'), ('${i.authTkB}'), ('${i.authBgd}');
    insert into khoa (id, ten_khoa) values ('${i.khoaA}', 'Khoa A'), ('${i.khoaB}', 'Khoa B');
    insert into phong_benh (id, khoa_id, so_phong) values ('${i.phongA1}', '${i.khoaA}', 'Phòng 1'), ('${i.phongB1}', '${i.khoaB}', 'Phòng 1');
    insert into nguoi_dung (id, auth_user_id, ho_ten, vai_tro, khoa_id) values
      ('${i.ndAdmin}', '${i.authAdmin}', 'Admin', 'admin', null),
      ('${i.ndTkA}', '${i.authTkA}', 'Trưởng khoa A', 'truong_khoa', '${i.khoaA}'),
      ('${i.ndTkB}', '${i.authTkB}', 'Trưởng khoa B', 'truong_khoa', '${i.khoaB}'),
      ('${i.ndBgd}', '${i.authBgd}', 'Ban Giám đốc', 'ban_giam_doc', null);
    insert into phien_kiem_tra (id, khoa_id, nguoi_kiem_tra_id, checklist_version_id, ngay_bao_cao, trang_thai)
      select '${i.phienA}', '${i.khoaA}', '${i.ndTkA}', id, '2026-11-02', 'draft' from checklist_version limit 1;
    insert into phien_kiem_tra (id, khoa_id, nguoi_kiem_tra_id, checklist_version_id, ngay_bao_cao, trang_thai)
      select '${i.phienB}', '${i.khoaB}', '${i.ndTkB}', id, '2026-11-02', 'hoan_thanh' from checklist_version limit 1;
    insert into phien_kiem_tra_phong (id, phien_kiem_tra_id, phong_benh_id) values
      ('${i.pktpA}', '${i.phienA}', '${i.phongA1}'), ('${i.pktpB}', '${i.phienB}', '${i.phongB1}');
  `);
}

/** Id của mục kiểm tra theo số thứ tự (1..n) trong phiên bản bảng kiểm mặc định. */
export async function mucTheoStt(db: PGlite, stt: number): Promise<string> {
  const r = await db.query<{ id: string }>(`select id from checklist_item where stt = $1`, [stt]);
  return r.rows[0].id;
}
