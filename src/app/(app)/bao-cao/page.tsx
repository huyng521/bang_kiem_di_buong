import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { congNgay, hienNgay, homNayVN } from "@/lib/thoi-gian";
import { BieuDoCapChamSoc, BieuDoCotTyLe, BieuDoXuHuong } from "@/components/bieu-do/bieu-do";
import { KhungBieuDo } from "@/components/bieu-do/khung";
import { BangNhiet } from "@/components/bang-nhiet";

type SP = { tu?: string; den?: string; don_vi?: string; khoa?: string; phong?: string; so_sanh?: string | string[] };
const so = (x: unknown) => (x === null || x === undefined ? null : Number(x));
const nhanKy = (ky: string, donVi: string) => {
  const [y, m, d] = ky.split("-");
  return donVi === "tuan" ? `${d}/${m}` : donVi === "quy" ? `Q${Math.floor((Number(m) - 1) / 3) + 1}/${y}` : `${m}/${y}`;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("admin", "ban_giam_doc", "truong_khoa");
  const sp = await searchParams;
  const laTk = user.nguoiDung.vai_tro === "truong_khoa";
  const homNay = homNayVN();
  const tu = sp.tu || congNgay(homNay, -180);
  const den = sp.den || homNay;
  const donVi = ["tuan", "thang", "quy"].includes(sp.don_vi ?? "") ? sp.don_vi! : "thang";
  const khoaChon = laTk ? user.nguoiDung.khoa_id! : sp.khoa || "";
  const soSanh = ([] as string[]).concat(sp.so_sanh ?? []).filter(Boolean);
  const supabase = await createClient();

  const [{ data: cfg }, { data: dsKhoa }] = await Promise.all([
    supabase.from("cau_hinh_he_thong").select("muc_tieu_ty_le_dat").eq("id", 1).maybeSingle(),
    supabase.from("khoa").select("id, ten_khoa").eq("active", true).order("ten_khoa"),
  ]);
  const mucTieu = Number(cfg?.muc_tieu_ty_le_dat ?? 90);
  const tenKhoa = new Map((dsKhoa ?? []).map((k) => [k.id, k.ten_khoa]));
  const { data: dsPhong } = khoaChon ? await supabase.from("phong_benh").select("id, so_phong").eq("khoa_id", khoaChon).order("so_phong") : { data: [] };
  const phong = khoaChon && sp.phong ? sp.phong : null;
  const khoaXuHuong = khoaChon ? [khoaChon] : soSanh.length ? soSanh : null;

  const [xuHuong, theoMuc, phan1, kp, theoPhong, xepHang, nhiet, tuanThu, chuaDi] = await Promise.all([
    supabase.rpc("db_xu_huong", { p_tu: tu, p_den: den, p_don_vi: donVi, p_khoa: khoaXuHuong, p_phong: phong }),
    supabase.rpc("db_theo_muc", { p_tu: tu, p_den: den, p_khoa: khoaChon || null, p_phong: phong }),
    supabase.rpc("db_phan_1", { p_tu: tu, p_den: den, p_don_vi: donVi, p_khoa: khoaChon || null }),
    supabase.rpc("thong_ke_khac_phuc", { p_tu: tu, p_den: den }),
    khoaChon ? supabase.rpc("db_theo_phong", { p_tu: tu, p_den: den, p_khoa: khoaChon }) : Promise.resolve({ data: [] }),
    !laTk ? supabase.rpc("bao_cao_ty_le_dat", { p_tu_ngay: tu, p_den_ngay: den }) : Promise.resolve({ data: [] }),
    !laTk && !khoaChon ? supabase.rpc("db_nhiet_khoa_muc", { p_tu: tu, p_den: den }) : Promise.resolve({ data: [] }),
    supabase.rpc("db_tuan_thu", { p_tu: tu, p_den: den }),
    supabase.rpc("db_chua_di_buong_hom_nay", {}),
  ]);

  // Xu hướng: gộp các khoa thành cột "Toàn viện" khi không chọn khoa nào để so sánh.
  const ky = [...new Set((xuHuong.data ?? []).map((r) => r.ky))].sort();
  const toanVien = !khoaXuHuong;
  const chuoi = toanVien ? ["Toàn viện"] : [...new Set((xuHuong.data ?? []).map((r) => tenKhoa.get(r.khoa_id) ?? "?"))];
  const dongXuHuong = ky.map((k) => {
    const rows = (xuHuong.data ?? []).filter((r) => r.ky === k);
    const d: Record<string, string | number | null> = { ky: nhanKy(k, donVi) };
    if (toanVien) {
      const dat = rows.reduce((s, r) => s + Number(r.so_dat), 0), ap = rows.reduce((s, r) => s + Number(r.so_ap_dung), 0);
      d["Toàn viện"] = ap ? Math.round((1000 * dat) / ap) / 10 : null; // cùng công thức đạt/(đạt+không đạt)
    } else for (const r of rows) d[tenKhoa.get(r.khoa_id) ?? "?"] = so(r.ty_le_dat);
    return d;
  });
  const tongDat = (xuHuong.data ?? []).reduce((s, r) => s + Number(r.so_dat), 0);
  const tongAp = (xuHuong.data ?? []).reduce((s, r) => s + Number(r.so_ap_dung), 0);
  const tyLeKy = tongAp ? Math.round((1000 * tongDat) / tongAp) / 10 : null;
  const top = [...(theoMuc.data ?? [])].filter((r) => Number(r.so_khong_dat) > 0).sort((a, b) => Number(b.so_khong_dat) - Number(a.so_khong_dat)).slice(0, 10);
  const kpLoc = (kp.data ?? []).filter((r) => !khoaChon || r.khoa_id === khoaChon);
  const kpTong = kpLoc.reduce((s, r) => ({ mo: s.mo + Number(r.so_mo), qh: s.qh + Number(r.so_qua_han), xn: s.xn + Number(r.so_da_xac_nhan) }), { mo: 0, qh: 0, xn: 0 });
  const tbNgay = kpLoc.filter((r) => r.tb_ngay_khac_phuc !== null);
  const kpTb = tbNgay.length ? (tbNgay.reduce((s, r) => s + Number(r.tb_ngay_khac_phuc), 0) / tbNgay.length).toFixed(1) : "—";
  const o = "rounded-lg border border-slate-300 px-2 py-2 text-sm";

  // Bảng nhiệt
  const mucNhiet = [...(theoMuc.data ?? [])].sort((a, b) => a.stt - b.stt).map((m) => ({ ma: m.ma_muc_goc, stt: m.stt, noiDung: m.noi_dung }));
  const gtNhiet = new Map((nhiet.data ?? []).map((r) => [`${r.khoa_id}|${r.ma_muc_goc}`, so(r.ty_le_dat)]));
  const khoaNhiet = [...new Set((nhiet.data ?? []).map((r) => r.khoa_id))].map((id) => ({ id, ten: tenKhoa.get(id) ?? "?" })).sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{laTk ? `Dashboard ${tenKhoa.get(khoaChon) ?? ""}` : "Dashboard toàn viện"}</h1>
        <p className="text-xs text-slate-500">Tỷ lệ đạt = Đạt ÷ (Đạt + Không đạt); không tính ô Không có/Bỏ chuẩn và ô chưa chấm; chỉ phiên đã hoàn thành. Mục tiêu: {mucTieu}%.</p>
      </div>

      <form method="get" className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4">
        <label className="text-xs">Từ ngày<input type="date" name="tu" defaultValue={tu} className={`${o} w-full`} /></label>
        <label className="text-xs">Đến ngày<input type="date" name="den" defaultValue={den} className={`${o} w-full`} /></label>
        <label className="text-xs">Theo<select name="don_vi" defaultValue={donVi} className={`${o} w-full`}><option value="tuan">Tuần</option><option value="thang">Tháng</option><option value="quy">Quý</option></select></label>
        {!laTk && (
          <label className="text-xs">Khoa<select name="khoa" defaultValue={khoaChon} className={`${o} w-full`}><option value="">Toàn viện</option>{(dsKhoa ?? []).map((k) => <option key={k.id} value={k.id}>{k.ten_khoa}</option>)}</select></label>
        )}
        {khoaChon && (
          <label className="text-xs">Phòng<select name="phong" defaultValue={sp.phong ?? ""} className={`${o} w-full`}><option value="">Tất cả phòng</option>{(dsPhong ?? []).map((p) => <option key={p.id} value={p.id}>{p.so_phong}</option>)}</select></label>
        )}
        {!laTk && !khoaChon && (
          <details className="col-span-2 text-xs sm:col-span-4">
            <summary className="cursor-pointer text-blue-700">So sánh xu hướng nhiều khoa ({soSanh.length} đã chọn)</summary>
            <div className="mt-2 flex flex-wrap gap-3">{(dsKhoa ?? []).map((k) => <label key={k.id} className="flex items-center gap-1"><input type="checkbox" name="so_sanh" value={k.id} defaultChecked={soSanh.includes(k.id)} />{k.ten_khoa}</label>)}</div>
          </details>
        )}
        <button className="col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white sm:col-span-4">Xem</button>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Tỷ lệ đạt trong kỳ", tyLeKy === null ? "—" : `${tyLeKy}%`, tyLeKy === null ? "" : tyLeKy >= mucTieu ? "✓ đạt mục tiêu" : "✗ dưới mục tiêu"],
          ["Khắc phục đang mở", String(kpTong.mo), ""],
          ["Khắc phục quá hạn", String(kpTong.qh), kpTong.qh ? "cần xử lý" : ""],
          ["TB ngày khắc phục", kpTb, `${kpTong.xn} đã xác nhận`],
        ].map(([nhan, gt, phu]) => (
          <div key={nhan} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">{nhan}</p>
            <p className="text-xl font-bold tabular-nums">{gt}</p>
            {phu && <p className="text-xs text-slate-500">{phu}</p>}
          </div>
        ))}
      </div>

      {!laTk && (chuaDi.data ?? []).length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">Chưa hoàn thành đi buồng hôm nay ({hienNgay(homNay)}{(chuaDi.data ?? [])[0]?.la_ngay_phai ? "" : " — không phải ngày bắt buộc"}): {(chuaDi.data ?? []).length} khoa</p>
          <p className="mt-1 text-amber-900">{(chuaDi.data ?? []).map((k) => `${k.ten_khoa}${k.dang_lam_do ? " (đang làm dở)" : ""}`).join(" · ")}</p>
        </section>
      )}

      <BieuDoXuHuong tieuDe={`Xu hướng tỷ lệ đạt theo ${donVi === "tuan" ? "tuần" : donVi === "quy" ? "quý" : "tháng"}`} ten="xu-huong-ty-le-dat" dong={dongXuHuong} chuoi={chuoi} mucTieu={mucTieu}
        moTa={toanVien ? "Toàn viện (chọn “So sánh nhiều khoa” để xem từng khoa)" : undefined} />

      {!laTk && !khoaChon && (
        <BieuDoCotTyLe tieuDe="Xếp hạng các khoa" ten="xep-hang-khoa" mucTieu={mucTieu}
          dong={[...(xepHang.data ?? [])].map((r) => ({ nhan: r.ten_khoa, ty_le: so(r.ty_le_dat), so_phien: Number(r.so_phien) })).sort((a, b) => (b.ty_le ?? -1) - (a.ty_le ?? -1))} />
      )}

      {khoaChon && (
        <BieuDoCotTyLe tieuDe="Tỷ lệ đạt theo phòng" ten="ty-le-theo-phong" mucTieu={mucTieu}
          dong={(theoPhong.data ?? []).map((r) => ({ nhan: r.so_phong, ty_le: so(r.ty_le_dat) }))} />
      )}

      <KhungBieuDo tieuDe="10 mục “Không đạt” nhiều nhất" ten="top-khong-dat" coAnh={false}
        duLieu={top.map((r) => ({ muc: r.stt, ma: r.ma_muc_goc, noi_dung: r.noi_dung, khong_dat: Number(r.so_khong_dat), ty_le_dat: so(r.ty_le_dat) }))}>
        <ol className="space-y-1 text-sm">
          {top.map((r) => (
            <li key={r.ma_muc_goc} className="flex gap-2">
              <span className="w-10 shrink-0 font-semibold tabular-nums text-red-700">{r.so_khong_dat}×</span>
              <span className="min-w-0"><b>Mục {r.stt}.</b> {r.noi_dung} <span className="text-slate-500">({so(r.ty_le_dat)}% đạt)</span></span>
            </li>
          ))}
        </ol>
      </KhungBieuDo>

      {!laTk && !khoaChon && (
        <KhungBieuDo tieuDe="Bảng nhiệt khoa × mục" moTa="Số trong ô = tỷ lệ đạt (%). ✓ đạt mục tiêu · ▲ hơi thấp · ✗ thấp. Rê chuột/chạm để xem nội dung mục." ten="bang-nhiet" coAnh={false}
          duLieu={(nhiet.data ?? []).map((r) => ({ khoa: tenKhoa.get(r.khoa_id) ?? "", ma_muc: r.ma_muc_goc, ty_le_dat: so(r.ty_le_dat) }))}>
          <BangNhiet khoa={khoaNhiet} muc={mucNhiet} gt={gtNhiet} mucTieu={mucTieu} />
        </KhungBieuDo>
      )}

      <KhungBieuDo tieuDe="Mức độ tuân thủ đi buồng" moTa="Số ngày có phiên hoàn thành ÷ số ngày phải đi buồng (theo Cài đặt, tính tới hôm nay)." ten="tuan-thu-di-buong" coAnh={false}
        duLieu={(tuanThu.data ?? []).map((r) => ({ khoa: r.ten_khoa, ngay_phai: r.so_ngay_phai, ngay_co_phien: r.so_ngay_co_phien, ty_le: so(r.ty_le) }))}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Khoa</th><th className="text-right">Có phiên / phải đi</th><th className="text-right">Tuân thủ</th></tr></thead>
            <tbody>{(tuanThu.data ?? []).map((r) => (
              <tr key={r.khoa_id} className="border-t border-slate-100">
                <td className="py-1">{r.ten_khoa}</td>
                <td className="text-right tabular-nums">{r.so_ngay_co_phien}/{r.so_ngay_phai}</td>
                <td className={`text-right font-semibold tabular-nums ${so(r.ty_le) !== null && so(r.ty_le)! < 100 ? "text-amber-700" : "text-green-700"}`}>{r.ty_le === null ? "—" : `${so(r.ty_le)}%`}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </KhungBieuDo>

      <BieuDoCapChamSoc dong={(phan1.data ?? []).map((r) => ({ ky: nhanKy(r.ky, donVi), cap_1_tb: so(r.cap_1_tb), cap_2_tb: so(r.cap_2_tb), cap_3_tb: so(r.cap_3_tb) }))} />

      <KhungBieuDo tieuDe="Tổng hợp Phần I theo thời gian (trung bình mỗi buổi)" ten="tong-hop-phan-1" coAnh={false}
        moTa="Tỷ số NB/ĐD = tổng số người bệnh thực tế ÷ số ĐD/HS đang công tác trong ngày (không tính ra trực). Công suất giường chỉ tính khi khoa đã khai báo số giường kế hoạch."
        duLieu={(phan1.data ?? []).map((r) => ({ ky: nhanKy(r.ky, donVi), so_phien: Number(r.so_phien), nb: so(r.nb_tb), giuong_dv_trong: so(r.giuong_dv_trong_tb), giuong_thuong_trong: so(r.giuong_thuong_trong_tb), bang_ca: so(r.bang_ca_tb), dd_cong_tac: so(r.dd_cong_tac_tb), dd_ra_truc: so(r.dd_ra_truc_tb), dd_nghi: so(r.dd_nghi_tb), ty_so_nb_dd: so(r.ty_so_nb_dd), cong_suat_giuong: so(r.cong_suat_giuong) }))}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-left uppercase text-slate-500"><tr>{["Kỳ", "Phiên", "NB", "Giường DV trống", "Giường thường trống", "Băng ca", "ĐD công tác", "Ra trực", "Nghỉ", "NB/ĐD", "Công suất"].map((h) => <th key={h} className="px-1 py-1">{h}</th>)}</tr></thead>
            <tbody>{(phan1.data ?? []).map((r) => (
              <tr key={r.ky} className="border-t border-slate-100">
                <td className="px-1 py-1">{nhanKy(r.ky, donVi)}</td><td className="px-1">{r.so_phien}</td><td className="px-1">{so(r.nb_tb)}</td>
                <td className="px-1">{so(r.giuong_dv_trong_tb)}</td><td className="px-1">{so(r.giuong_thuong_trong_tb)}</td><td className="px-1">{so(r.bang_ca_tb)}</td>
                <td className="px-1">{so(r.dd_cong_tac_tb)}</td><td className="px-1">{so(r.dd_ra_truc_tb)}</td><td className="px-1">{so(r.dd_nghi_tb)}</td>
                <td className="px-1 font-semibold">{so(r.ty_so_nb_dd) ?? "—"}</td><td className="px-1">{r.cong_suat_giuong === null ? "—" : `${so(r.cong_suat_giuong)}%`}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </KhungBieuDo>

      <form action="/bao-cao/thang" method="get" target="_blank" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="w-full text-sm font-semibold text-slate-700">Báo cáo tổng hợp theo tháng</p>
        <input type="month" name="thang" defaultValue={den.slice(0, 7)} className={o} aria-label="Tháng" />
        {!laTk && (
          <select name="khoa" defaultValue={khoaChon} className={o} aria-label="Khoa"><option value="">Toàn viện</option>{(dsKhoa ?? []).map((k) => <option key={k.id} value={k.id}>{k.ten_khoa}</option>)}</select>
        )}
        <button name="dinh_dang" value="pdf" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">PDF</button>
        <button name="dinh_dang" value="xlsx" className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Excel</button>
      </form>
      <p className="text-center text-xs text-slate-500"><Link href="/khac-phuc" className="text-blue-600">Xem chi tiết việc khắc phục →</Link></p>
    </div>
  );
}
