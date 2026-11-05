// So sánh hai phiên bản bảng kiểm theo mã mục gốc (ổn định xuyên phiên bản).
export interface MucSoSanh { ma_muc_goc: string; stt: number; noi_dung: string; ghi_chu_huong_dan: string | null }

export interface KetQuaSoSanh {
  them: MucSoSanh[];
  bo: MucSoSanh[];
  sua: { ma: string; cu: MucSoSanh; moi: MucSoSanh }[];
  doiThuTu: { ma: string; tu: number; den: number }[];
}

export function soSanhPhienBan(hienHanh: MucSoSanh[], banMoi: MucSoSanh[]): KetQuaSoSanh {
  const cu = new Map(hienHanh.map((m) => [m.ma_muc_goc, m]));
  const moi = new Map(banMoi.map((m) => [m.ma_muc_goc, m]));
  const them = banMoi.filter((m) => !cu.has(m.ma_muc_goc));
  const bo = hienHanh.filter((m) => !moi.has(m.ma_muc_goc));
  const sua: KetQuaSoSanh["sua"] = [];
  const doiThuTu: KetQuaSoSanh["doiThuTu"] = [];
  for (const m of banMoi) {
    const c = cu.get(m.ma_muc_goc);
    if (!c) continue;
    if (c.noi_dung.trim() !== m.noi_dung.trim() || (c.ghi_chu_huong_dan ?? "") !== (m.ghi_chu_huong_dan ?? "")) sua.push({ ma: m.ma_muc_goc, cu: c, moi: m });
    if (c.stt !== m.stt) doiThuTu.push({ ma: m.ma_muc_goc, tu: c.stt, den: m.stt });
  }
  return { them, bo, sua, doiThuTu };
}
