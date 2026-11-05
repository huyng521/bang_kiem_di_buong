import { StyleSheet } from "@react-pdf/renderer";

export const MAU = { vien: "#8a9a9c", nen: "#e6f0f0", dat: "#d9f0e0", khongDat: "#fadcd8", boChuan: "#e8e8e8", chu: "#14282b", phu: "#5a6f72" };

export const s = StyleSheet.create({
  trang: { fontFamily: "BeVietnamPro", fontSize: 8.5, color: MAU.chu, paddingTop: 28, paddingBottom: 36, paddingHorizontal: 28 },
  dau: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
  logo: { width: 42, height: 42, objectFit: "contain" },
  bv: { fontSize: 10, fontWeight: 700 },
  donVi: { fontSize: 9, color: MAU.phu },
  tieuDe: { fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 4 },
  phuDe: { fontSize: 9.5, textAlign: "center", marginBottom: 10, color: MAU.phu },
  muc: { fontSize: 10, fontWeight: 700, marginTop: 10, marginBottom: 4 },
  bang: { borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: MAU.vien },
  hang: { flexDirection: "row" },
  o: { borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: MAU.vien, padding: 3 },
  oDau: { backgroundColor: MAU.nen, fontWeight: 700 },
  giua: { textAlign: "center" },
  chan: { position: "absolute", bottom: 14, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MAU.phu },
  chuThich: { fontSize: 7.5, color: MAU.phu, marginTop: 3 },
  kyTen: { flexDirection: "row", marginTop: 18 },
  oKy: { flex: 1, alignItems: "center" },
  kyChuc: { fontWeight: 700 },
  kyGhiChu: { fontStyle: "italic", fontSize: 7.5, color: MAU.phu },
});
