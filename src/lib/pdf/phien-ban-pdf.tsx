import "server-only";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { dangKyFont } from "./font";
import { s } from "./kieu";
import { ChanTrang, DauTrang } from "./phien-pdf";
import { hienNgay, hienNgayGio } from "@/lib/thoi-gian";
import type { CauHinhHeThong, ChecklistItem, ChecklistVersion } from "@/types/database";

export async function taoPdfPhienBan(v: ChecklistVersion, muc: ChecklistItem[], cauHinh: CauHinhHeThong | null, logo: Buffer | null) {
  dangKyFont();
  const t = (x: string) => x.replace(/→/g, "->");
  return renderToBuffer(
    <Document title={`Bảng kiểm ${v.ten_phien_ban}`} language="vi">
      <Page size="A4" style={s.trang}>
        <DauTrang d={{ cauHinh, logo }} tieuDe="BẢNG KIỂM ĐI BUỒNG CỦA ĐIỀU DƯỠNG/HỘ SINH TRƯỞNG KHOA" phuDe={`${v.ten_phien_ban} — hiệu lực từ ${hienNgay(v.ngay_hieu_luc)}`} />
        {v.ghi_chu_van_ban_can_cu ? <Text style={{ marginBottom: 8 }}>Căn cứ: {v.ghi_chu_van_ban_can_cu}</Text> : null}
        <View style={s.bang}>
          <View style={[s.hang, s.oDau]} fixed>
            <Text style={[s.o, { width: 28 }, s.giua]}>STT</Text>
            <Text style={[s.o, { flex: 1 }]}>Nội dung</Text>
            <Text style={[s.o, { width: 48 }, s.giua]}>Mã</Text>
          </View>
          {muc.map((m) => (
            <View key={m.id} style={s.hang} wrap={false}>
              <Text style={[s.o, { width: 28 }, s.giua]}>{m.stt}</Text>
              <Text style={[s.o, { flex: 1 }]}>{t(m.noi_dung)}{m.ghi_chu_huong_dan ? <Text style={{ fontStyle: "italic" }}> ({t(m.ghi_chu_huong_dan)})</Text> : null}</Text>
              <Text style={[s.o, { width: 48 }, s.giua]}>{m.ma_muc_goc}</Text>
            </View>
          ))}
        </View>
        <Text style={s.chuThich}>Mỗi mục chấm 1 trong 3 trạng thái: Đạt/Có — Không đạt — Không có/Bỏ chuẩn.</Text>
        <ChanTrang inLuc={hienNgayGio(new Date().toISOString())} />
      </Page>
    </Document>,
  );
}
