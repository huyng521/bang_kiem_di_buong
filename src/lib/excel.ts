import "server-only";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import type { TrangThaiKq } from "@/types/database";

const NHAN_TRANG_THAI: Record<TrangThaiKq, string> = {
  dat_co: "Đạt",
  khong_dat: "Không đạt",
  khong_co_bo_chuan: "Không có/BC",
};

const MAU_NEN: Record<TrangThaiKq, string> = {
  dat_co: "FFC6EFCE",
  khong_dat: "FFFFC7CE",
  khong_co_bo_chuan: "FFE7E6E6",
};

export async function xuatExcelPhien(phienId: string): Promise<Buffer> {
  const supabase = await createClient();

  const { data: phien } = await supabase.from("phien_kiem_tra").select("*").eq("id", phienId).single();
  if (!phien) throw new Error("Không tìm thấy phiên kiểm tra.");

  const [{ data: khoa }, { data: nguoiKiemTra }, { data: dsPhongKiemTra }, { data: mucKiemTra }] =
    await Promise.all([
      supabase.from("khoa").select("ten_khoa").eq("id", phien.khoa_id).maybeSingle(),
      supabase.from("nguoi_dung").select("ho_ten").eq("id", phien.nguoi_kiem_tra_id).maybeSingle(),
      supabase
        .from("phien_kiem_tra_phong")
        .select("id, phong_benh_id, ten_dd_phu_trach, tong_so_nguoi_benh")
        .eq("phien_kiem_tra_id", phienId),
      supabase
        .from("checklist_item")
        .select("id, stt, noi_dung")
        .eq("checklist_version_id", phien.checklist_version_id)
        .eq("active", true)
        .order("stt"),
    ]);

  const idsPhongBenh = (dsPhongKiemTra ?? []).map((p) => p.phong_benh_id);
  const { data: dsPhongBenh } = idsPhongBenh.length
    ? await supabase.from("phong_benh").select("id, so_phong").in("id", idsPhongBenh)
    : { data: [] as { id: string; so_phong: string }[] };
  const soPhongTheoId = new Map((dsPhongBenh ?? []).map((p) => [p.id, p.so_phong]));

  const dsPhongPhien = (dsPhongKiemTra ?? [])
    .map((p) => ({ ...p, so_phong: soPhongTheoId.get(p.phong_benh_id) ?? "" }))
    .sort((a, b) => a.so_phong.localeCompare(b.so_phong));

  const idsPhienPhong = dsPhongPhien.map((p) => p.id);
  const { data: dsKetQua } = idsPhienPhong.length
    ? await supabase
        .from("ket_qua_kiem_tra")
        .select("phien_kiem_tra_phong_id, checklist_item_id, trang_thai, ghi_chu")
        .in("phien_kiem_tra_phong_id", idsPhienPhong)
    : { data: [] as { phien_kiem_tra_phong_id: string; checklist_item_id: string; trang_thai: TrangThaiKq | null; ghi_chu: string | null }[] };

  const ketQuaTheoKhoa = new Map<string, { trang_thai: TrangThaiKq | null; ghi_chu: string | null }>();
  for (const kq of dsKetQua ?? []) {
    ketQuaTheoKhoa.set(`${kq.phien_kiem_tra_phong_id}:${kq.checklist_item_id}`, kq);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bảng kiểm đi buồng";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Bảng kiểm đi buồng", {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  const tieuDeStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 14 },
  };
  const nhanStyle: Partial<ExcelJS.Style> = { font: { bold: true } };

  let hang = 1;
  sheet.getCell(hang, 1).value = "BẢNG KIỂM ĐI BUỒNG";
  sheet.getCell(hang, 1).style = tieuDeStyle;
  hang += 2;

  const phanI: [string, string | number][] = [
    ["Khoa", khoa?.ten_khoa ?? ""],
    ["Ngày báo cáo", new Date(phien.ngay_bao_cao).toLocaleDateString("vi-VN")],
    ["Họ và tên người báo cáo", nguoiKiemTra?.ho_ten ?? ""],
    ["ĐD được ĐDTK ủy quyền khi vắng mặt", phien.dd_uy_quyen_khi_vang_mat ?? ""],
    ["Tổng số người bệnh hiện có thực tế tại khoa", phien.tong_so_nb_thuc_te ?? ""],
    ["Số người bệnh phân cấp chăm sóc cấp 1", phien.so_nb_cap_1 ?? ""],
    ["Số người bệnh phân cấp chăm sóc cấp 2", phien.so_nb_cap_2 ?? ""],
    ["Số người bệnh phân cấp chăm sóc cấp 3", phien.so_nb_cap_3 ?? ""],
    ["Số giường dịch vụ còn trống", phien.so_giuong_dv_trong ?? ""],
    ["Số giường thường còn trống", phien.so_giuong_thuong_trong ?? ""],
    ["Số người bệnh đang nằm băng ca", phien.so_nb_nam_bang_ca],
    ["Tổng số ĐD/HS cơ hữu của khoa", phien.tong_so_dd_co_huu ?? ""],
    ["Số ĐD/HS đang công tác trong ngày", phien.so_dd_dang_cong_tac_trong_ngay ?? ""],
    ["Số ĐD/HS ra trực", phien.so_dd_ra_truc ?? ""],
    ["Số ĐD/HS nghỉ bù - nghỉ phép", phien.so_dd_nghi_bu_nghi_phep ?? ""],
    ["Số ĐD/HS đang nghỉ theo chế độ", phien.so_dd_nghi_che_do],
  ];

  for (const [nhan, giaTri] of phanI) {
    sheet.getCell(hang, 1).value = nhan;
    sheet.getCell(hang, 1).style = nhanStyle;
    sheet.getCell(hang, 2).value = giaTri;
    hang++;
  }
  hang += 1;

  // Bảng ma trận: cột = phòng, hàng = 35 mục
  const hangTieuDeMaTran = hang;
  sheet.getCell(hangTieuDeMaTran, 1).value = "STT";
  sheet.getCell(hangTieuDeMaTran, 1).style = nhanStyle;
  sheet.getCell(hangTieuDeMaTran, 2).value = "Nội dung kiểm tra";
  sheet.getCell(hangTieuDeMaTran, 2).style = nhanStyle;
  dsPhongPhien.forEach((p, idx) => {
    const cell = sheet.getCell(hangTieuDeMaTran, 3 + idx);
    cell.value = p.so_phong;
    cell.style = nhanStyle;
  });
  hang++;

  const hangTdd = hang;
  sheet.getCell(hangTdd, 2).value = "ĐD phụ trách / Tổng số NB";
  sheet.getCell(hangTdd, 2).style = { font: { italic: true } };
  dsPhongPhien.forEach((p, idx) => {
    sheet.getCell(hangTdd, 3 + idx).value = `${p.ten_dd_phu_trach ?? "—"} / ${p.tong_so_nguoi_benh ?? "—"}`;
  });
  hang++;

  const ghiChuList: string[] = [];

  for (const muc of mucKiemTra ?? []) {
    sheet.getCell(hang, 1).value = muc.stt;
    sheet.getCell(hang, 2).value = muc.noi_dung;
    sheet.getCell(hang, 2).alignment = { wrapText: true, vertical: "top" };

    dsPhongPhien.forEach((p, idx) => {
      const kq = ketQuaTheoKhoa.get(`${p.id}:${muc.id}`);
      const cell = sheet.getCell(hang, 3 + idx);
      if (kq?.trang_thai) {
        cell.value = NHAN_TRANG_THAI[kq.trang_thai];
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAU_NEN[kq.trang_thai] } };
      } else {
        cell.value = "";
      }
      cell.alignment = { horizontal: "center", vertical: "top" };
      if (kq?.ghi_chu) {
        ghiChuList.push(`${p.so_phong} - Mục ${muc.stt}: ${kq.ghi_chu}`);
      }
    });
    hang++;
  }

  hang += 1;
  if (ghiChuList.length > 0) {
    sheet.getCell(hang, 1).value = "Ghi chú theo mục";
    sheet.getCell(hang, 1).style = nhanStyle;
    hang++;
    for (const gc of ghiChuList) {
      sheet.getCell(hang, 1).value = gc;
      hang++;
    }
    hang += 1;
  }

  sheet.getCell(hang, 1).value = "Ý kiến/vấn đề của người bệnh";
  sheet.getCell(hang, 1).style = nhanStyle;
  sheet.getCell(hang, 2).value = phien.y_kien_van_de_nguoi_benh ?? "";
  hang++;
  sheet.getCell(hang, 1).value = "Biện pháp khắc phục";
  sheet.getCell(hang, 1).style = nhanStyle;
  sheet.getCell(hang, 2).value = phien.bien_phap_khac_phuc ?? "";

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 48;
  dsPhongPhien.forEach((_, idx) => {
    sheet.getColumn(3 + idx).width = 16;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
