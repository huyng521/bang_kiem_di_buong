import "server-only";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { dangKyFont } from "./font";
import { s } from "./kieu";
import { ChanTrang, DauTrang } from "./phien-pdf";
import type { BaoCaoThang } from "@/lib/bao-cao-thang";
import { hienNgay, hienNgayGio } from "@/lib/thoi-gian";

const pt = (x: number | null) => (x === null ? "—" : `${x.toFixed(1)}%`);

function Bang({ cot, dong }: { cot: [string, number | "flex"][]; dong: (string | number)[][] }) {
  return (
    <View style={s.bang}>
      <View style={[s.hang, s.oDau]} fixed>
        {cot.map(([h, w]) => <Text key={h} style={[s.o, w === "flex" ? { flex: 1 } : { width: w }]}>{h}</Text>)}
      </View>
      {dong.map((d, i) => (
        <View key={i} style={s.hang} wrap={false}>
          {d.map((x, j) => <Text key={j} style={[s.o, cot[j][1] === "flex" ? { flex: 1 } : { width: cot[j][1] as number, textAlign: "right" }]}>{String(x)}</Text>)}
        </View>
      ))}
    </View>
  );
}

export async function taoPdfBaoCaoThang(b: BaoCaoThang): Promise<Buffer> {
  dangKyFont();
  const [y, m] = b.thang.split("-");
  const mucTieu = b.cauHinh?.muc_tieu_ty_le_dat ?? 90;
  return renderToBuffer(
    <Document title={`Báo cáo đi buồng tháng ${m}/${y}`} language="vi">
      <Page size="A4" style={s.trang}>
        <DauTrang d={b} tieuDe={`BÁO CÁO TỔNG HỢP ĐI BUỒNG THÁNG ${m}/${y}`} phuDe={`${b.tenKhoa} — từ ${hienNgay(b.tu)} đến ${hienNgay(b.den)}`} />
        <Text style={s.muc}>1. Tỷ lệ đạt chung: {pt(b.tyLeChung)} (mục tiêu {mucTieu}%)</Text>
        <Text style={s.chuThich}>Tỷ lệ đạt = số ô Đạt ÷ (Đạt + Không đạt); không tính ô Không có/Bỏ chuẩn và ô chưa chấm; chỉ tính phiên đã hoàn thành.</Text>
        {b.theoKhoa.length > 0 && (
          <Bang cot={[["Khoa", "flex"], ["Số phiên", 60], ["Ô áp dụng", 70], ["Đạt", 50], ["Tỷ lệ đạt", 60]]}
            dong={b.theoKhoa.map((r) => [r.ten_khoa, r.so_phien, r.tong_muc_ap_dung, r.so_dat, pt(r.ty_le_dat)])} />
        )}
        <Text style={s.muc}>2. Các mục không đạt nhiều nhất</Text>
        {b.topKhongDat.length ? (
          <Bang cot={[["Mục", 30], ["Nội dung", "flex"], ["Không đạt", 60], ["Tỷ lệ đạt", 60]]}
            dong={b.topKhongDat.map((r) => [r.stt, r.noi_dung, r.so_khong_dat, pt(r.ty_le_dat)])} />
        ) : <Text>Không có mục nào không đạt.</Text>}
        <Text style={s.muc}>3. Tình hình hành động khắc phục (tạo trong tháng)</Text>
        {b.khacPhuc.length ? (
          <Bang cot={[["Khoa", "flex"], ["Tổng", 45], ["Đang mở", 55], ["Quá hạn", 55], ["Đã xác nhận", 65], ["TB ngày khắc phục", 80]]}
            dong={b.khacPhuc.map((r) => [r.ten_khoa, r.so_tong, r.so_mo, r.so_qua_han, r.so_da_xac_nhan, r.tb_ngay_khac_phuc ?? "—"])} />
        ) : <Text>Chưa có hành động khắc phục.</Text>}
        <Text style={s.muc} break>4. Tỷ lệ đạt từng mục</Text>
        <Bang cot={[["Mục", 30], ["Nội dung", "flex"], ["Đạt", 40], ["Không đạt", 55], ["Bỏ chuẩn", 50], ["Tỷ lệ", 50]]}
          dong={b.theoMuc.map((r) => [r.stt, r.noi_dung.replace(/→/g, "->"), r.so_dat, r.so_khong_dat, r.so_bo_chuan, pt(r.ty_le_dat)])} />
        <ChanTrang inLuc={hienNgayGio(new Date().toISOString())} />
      </Page>
    </Document>,
  );
}
