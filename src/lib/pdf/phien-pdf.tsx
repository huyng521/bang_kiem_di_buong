/* eslint-disable jsx-a11y/alt-text -- <Image> của @react-pdf/renderer không phải thẻ img HTML */
import "server-only";
import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { dangKyFont } from "./font";
import { MAU, s } from "./kieu";
import { KY_HIEU, khoaKq, type DuLieuPhien } from "@/lib/du-lieu-phien";
import { NHAN_TT_KP, NHAN_UU_TIEN } from "@/lib/khac-phuc";
import { hienNgay, hienNgayGio } from "@/lib/thoi-gian";
import type { TrangThaiKq } from "@/types/database";

const PHAN1: [string, (d: DuLieuPhien) => string | number][] = [
  ["Ngày báo cáo", (d) => hienNgay(d.phien.ngay_bao_cao)],
  ["Họ và tên người báo cáo", (d) => d.nguoiBaoCao],
  ["ĐD được ĐDTK ủy quyền khi vắng mặt", (d) => d.phien.dd_uy_quyen_khi_vang_mat ?? ""],
  ["Tổng số người bệnh hiện có thực tế tại khoa", (d) => d.phien.tong_so_nb_thuc_te ?? ""],
  ["Số người bệnh chăm sóc cấp 1", (d) => d.phien.so_nb_cap_1 ?? ""],
  ["Số người bệnh chăm sóc cấp 2", (d) => d.phien.so_nb_cap_2 ?? ""],
  ["Số người bệnh chăm sóc cấp 3", (d) => d.phien.so_nb_cap_3 ?? ""],
  ["Số giường dịch vụ còn trống", (d) => d.phien.so_giuong_dv_trong ?? ""],
  ["Số giường thường còn trống", (d) => d.phien.so_giuong_thuong_trong ?? ""],
  ["Số người bệnh đang nằm băng ca", (d) => d.phien.so_nb_nam_bang_ca],
  ["Tổng số ĐD/HS cơ hữu của khoa", (d) => d.phien.tong_so_dd_co_huu ?? ""],
  ["Số ĐD/HS đang công tác trong ngày", (d) => d.phien.so_dd_dang_cong_tac_trong_ngay ?? ""],
  ["Số ĐD/HS ra trực", (d) => d.phien.so_dd_ra_truc ?? ""],
  ["Số ĐD/HS nghỉ bù - nghỉ phép", (d) => d.phien.so_dd_nghi_bu_nghi_phep ?? ""],
  ["Số ĐD/HS đang nghỉ theo chế độ", (d) => d.phien.so_dd_nghi_che_do],
];
const NEN: Record<TrangThaiKq, string> = { dat_co: MAU.dat, khong_dat: MAU.khongDat, khong_co_bo_chuan: MAU.boChuan };

export function DauTrang({ d, tieuDe, phuDe }: { d: { cauHinh: DuLieuPhien["cauHinh"]; logo: Buffer | null }; tieuDe: string; phuDe: string }) {
  return (
    <View>
      <View style={s.dau}>
        {d.logo ? <Image src={d.logo} style={s.logo} /> : null}
        <View>
          {d.cauHinh?.ten_benh_vien ? <Text style={s.bv}>{d.cauHinh.ten_benh_vien.toUpperCase()}</Text> : null}
          <Text style={s.donVi}>{d.cauHinh?.ten_don_vi_quan_ly || "Phòng Điều dưỡng"}</Text>
        </View>
      </View>
      <Text style={s.tieuDe}>{tieuDe}</Text>
      <Text style={s.phuDe}>{phuDe}</Text>
    </View>
  );
}

export function ChanTrang({ inLuc }: { inLuc: string }) {
  return (
    <View style={s.chan} fixed>
      <Text>In lúc {inLuc}</Text>
      <Text render={({ pageNumber, totalPages }) => `Trang ${pageNumber}/${totalPages}`} />
    </View>
  );
}

function PhieuPhien({ d, anh }: { d: DuLieuPhien; anh: { data: Buffer; nhan: string }[] }) {
  const inLuc = hienNgayGio(new Date().toISOString());
  const soPhong = d.phong.length;
  const rongPhong = soPhong > 0 ? Math.max(28, Math.min(70, 470 / soPhong)) : 60;
  const nua = Math.ceil(PHAN1.length / 2);
  const tally = d.phong.map((p) => {
    let dat = 0, khong = 0;
    for (const m of d.muc) {
      const t = d.ketQua.get(khoaKq(p.pktpId, m.id))?.trangThai;
      if (t === "dat_co") dat++;
      if (t === "khong_dat") khong++;
    }
    return dat + khong ? `${((dat / (dat + khong)) * 100).toFixed(1)}%` : "—";
  });
  const ghiChu = d.phong.flatMap((p) => d.muc.flatMap((m) => {
    const k = d.ketQua.get(khoaKq(p.pktpId, m.id));
    return k?.ghiChu ? [`${p.soPhong} – Mục ${m.stt}: ${k.ghiChu}`] : [];
  }));

  return (
    <Document title={`Bảng kiểm đi buồng ${d.tenKhoa} ${hienNgay(d.phien.ngay_bao_cao)}`} language="vi">
      <Page size="A4" orientation="landscape" style={s.trang}>
        <DauTrang d={d} tieuDe="BẢNG KIỂM ĐI BUỒNG CỦA ĐIỀU DƯỠNG/HỘ SINH TRƯỞNG KHOA" phuDe={`${d.tenKhoa} — Ngày ${hienNgay(d.phien.ngay_bao_cao)}${d.phienBan.ten ? ` — Bảng kiểm: ${d.phienBan.ten}` : ""}`} />

        <Text style={s.muc}>PHẦN I: TỔNG QUAN HÀNH CHÍNH</Text>
        <View style={[s.bang, { flexDirection: "row" }]}>
          {[PHAN1.slice(0, nua), PHAN1.slice(nua)].map((cot, ci) => (
            <View key={ci} style={{ flex: 1 }}>
              {cot.map(([nhan, lay], i) => (
                <View key={nhan} style={s.hang} wrap={false}>
                  <Text style={[s.o, { width: 18 }, s.giua]}>{ci * nua + i + 1}</Text>
                  <Text style={[s.o, { flex: 1 }]}>{nhan}</Text>
                  <Text style={[s.o, { width: 90, fontWeight: 600 }, s.giua]}>{String(lay(d))}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.muc}>PHẦN II: NỘI DUNG KIỂM TRA ({d.muc.length} mục × {soPhong} phòng)</Text>
        <View style={s.bang}>
          <View style={[s.hang, s.oDau]} fixed>
            <Text style={[s.o, { width: 24 }, s.giua]}>STT</Text>
            <Text style={[s.o, { flex: 1 }]}>Nội dung kiểm tra</Text>
            {d.phong.map((p) => <Text key={p.pktpId} style={[s.o, { width: rongPhong }, s.giua]}>{p.soPhong}</Text>)}
          </View>
          {(["ĐD phụ trách", "Tổng số NB"] as const).map((nhan) => (
            <View key={nhan} style={s.hang} wrap={false}>
              <Text style={[s.o, { width: 24 }]} />
              <Text style={[s.o, { flex: 1, fontStyle: "italic" }]}>{nhan}</Text>
              {d.phong.map((p) => <Text key={p.pktpId} style={[s.o, { width: rongPhong }, s.giua]}>{nhan === "ĐD phụ trách" ? p.tenDd ?? "" : p.tongNb ?? ""}</Text>)}
            </View>
          ))}
          {d.muc.map((m) => (
            <View key={m.id} style={s.hang} wrap={false}>
              <Text style={[s.o, { width: 24 }, s.giua]}>{m.stt}</Text>
              <Text style={[s.o, { flex: 1 }]}>
                {m.noiDung}
                {m.ghiChuHuongDan ? <Text style={{ fontStyle: "italic", color: MAU.phu }}> ({m.ghiChuHuongDan})</Text> : null}
              </Text>
              {d.phong.map((p) => {
                const t = d.ketQua.get(khoaKq(p.pktpId, m.id))?.trangThai ?? null;
                return <Text key={p.pktpId} style={[s.o, { width: rongPhong, fontWeight: 700 }, s.giua, t ? { backgroundColor: NEN[t] } : {}]}>{t ? KY_HIEU[t] : ""}</Text>;
              })}
            </View>
          ))}
          <View style={[s.hang, s.oDau]} wrap={false}>
            <Text style={[s.o, { width: 24 }]} />
            <Text style={[s.o, { flex: 1 }]}>Tỷ lệ đạt (loại trừ Không có/Bỏ chuẩn)</Text>
            {tally.map((x, i) => <Text key={i} style={[s.o, { width: rongPhong }, s.giua]}>{x}</Text>)}
          </View>
        </View>
        <Text style={s.chuThich}>Ký hiệu: Đ = Đạt/Có · KĐ = Không đạt · K = Không có/Bỏ chuẩn · ô trống = chưa chấm.</Text>

        {ghiChu.length > 0 && (
          <View wrap={false}>
            <Text style={s.muc}>Ghi chú theo mục</Text>
            {ghiChu.map((g, i) => <Text key={i}>• {g}</Text>)}
          </View>
        )}

        <View wrap={false}>
          <Text style={s.muc}>Ý kiến/vấn đề của người bệnh</Text>
          <Text>{d.phien.y_kien_van_de_nguoi_benh || "—"}</Text>
          <Text style={s.muc}>Biện pháp khắc phục</Text>
          <Text>{d.phien.bien_phap_khac_phuc || "—"}</Text>
        </View>

        {d.khacPhuc.length > 0 && (
          <View>
            <Text style={s.muc}>Hành động khắc phục liên quan</Text>
            <View style={s.bang}>
              <View style={[s.hang, s.oDau]}>
                {["Mục", "Mô tả / biện pháp", "Người phụ trách", "Hạn", "Ưu tiên", "Trạng thái"].map((h, i) => (
                  <Text key={h} style={[s.o, i === 1 ? { flex: 1 } : { width: i === 0 ? 30 : 80 }]}>{h}</Text>
                ))}
              </View>
              {d.khacPhuc.map((h) => (
                <View key={h.id} style={s.hang} wrap={false}>
                  <Text style={[s.o, { width: 30 }, s.giua]}>{h.stt_muc ?? ""}</Text>
                  <Text style={[s.o, { flex: 1 }]}>{h.mo_ta_van_de}{h.bien_phap ? `\n→ ${h.bien_phap}` : ""}</Text>
                  <Text style={[s.o, { width: 80 }]}>{h.nguoi_phu_trach ?? ""}</Text>
                  <Text style={[s.o, { width: 80 }]}>{hienNgay(h.han_xu_ly)}{h.qua_han ? " (quá hạn)" : ""}</Text>
                  <Text style={[s.o, { width: 80 }]}>{NHAN_UU_TIEN[h.muc_uu_tien]}</Text>
                  <Text style={[s.o, { width: 80 }]}>{NHAN_TT_KP[h.trang_thai]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.kyTen} wrap={false}>
          {[
            ["NGƯỜI BÁO CÁO", d.nguoiBaoCao],
            ["ĐIỀU DƯỠNG TRƯỞNG KHOA", ""],
            [`ĐẠI DIỆN ${(d.cauHinh?.ten_don_vi_quan_ly || "Phòng Điều dưỡng").toUpperCase()}`, ""],
          ].map(([chuc, ten]) => (
            <View key={chuc} style={s.oKy}>
              <Text style={s.kyChuc}>{chuc}</Text>
              <Text style={s.kyGhiChu}>(Ký, ghi rõ họ tên)</Text>
              <Text style={{ marginTop: 40 }}>{ten}</Text>
            </View>
          ))}
        </View>
        <ChanTrang inLuc={inLuc} />
      </Page>

      {anh.length > 0 && (
        <Page size="A4" orientation="landscape" style={s.trang}>
          <Text style={s.tieuDe}>PHỤ LỤC: ẢNH MINH CHỨNG</Text>
          <Text style={s.phuDe}>{d.tenKhoa} — Ngày {hienNgay(d.phien.ngay_bao_cao)}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {anh.map((a, i) => (
              <View key={i} style={{ width: 250 }} wrap={false}>
                <Image src={a.data} style={{ width: 250, height: 180, objectFit: "contain", backgroundColor: "#f2f2f2" }} />
                <Text style={{ fontSize: 7.5, marginTop: 2 }}>{a.nhan}</Text>
              </View>
            ))}
          </View>
          <ChanTrang inLuc={inLuc} />
        </Page>
      )}
    </Document>
  );
}

/** Font không có ký tự mũi tên → nên thay bằng "->" khi in PDF. */
const pdfText = (x: string | null) => (x ?? "").replace(/→/g, "->");

export async function taoPdfPhien(d0: DuLieuPhien, anhTho: Awaited<ReturnType<typeof import("@/lib/du-lieu-phien").taiAnhPhien>> = []): Promise<Buffer> {
  dangKyFont();
  const d: DuLieuPhien = {
    ...d0,
    muc: d0.muc.map((m) => ({ ...m, noiDung: pdfText(m.noiDung), ghiChuHuongDan: m.ghiChuHuongDan ? pdfText(m.ghiChuHuongDan) : null })),
    khacPhuc: d0.khacPhuc.map((h) => ({ ...h, mo_ta_van_de: pdfText(h.mo_ta_van_de), bien_phap: h.bien_phap ? pdfText(h.bien_phap) : null })),
  };
  const theoKq = new Map<string, string>();
  for (const p of d.phong) for (const m of d.muc) {
    const k = d.ketQua.get(khoaKq(p.pktpId, m.id));
    if (k) theoKq.set(k.id, `${p.soPhong} · Mục ${m.stt}`);
  }
  const anh = anhTho.map((a) => ({
    data: a.data,
    nhan: a.loai === "khac_phuc"
      ? `Sau khắc phục · Mục ${d.khacPhuc.find((h) => h.id === a.hanhDongId)?.stt_muc ?? ""}`
      : `Khi kiểm tra · ${theoKq.get(a.ketQuaId ?? "") ?? ""}`,
  }));
  return renderToBuffer(<PhieuPhien d={d} anh={anh} />);
}
