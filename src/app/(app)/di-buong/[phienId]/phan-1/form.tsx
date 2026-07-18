"use client";

import { useActionState } from "react";
import type { PhienKiemTra } from "@/types/database";
import { luuPhan1, type LuuPhan1State } from "./actions";

function SoNguyenField({
  name,
  label,
  ghiChu,
  defaultValue,
}: {
  name: string;
  label: string;
  ghiChu?: string;
  defaultValue: number | null;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label} <span className="text-red-500">*</span>
      </label>
      {ghiChu && <p className="mb-1 text-xs text-slate-500">{ghiChu}</p>}
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        required
        defaultValue={defaultValue ?? undefined}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}

const initialState: LuuPhan1State = {};

export function Phan1Form({
  phienId,
  phien,
  hoTenNguoiBaoCao,
}: {
  phienId: string;
  phien: PhienKiemTra;
  hoTenNguoiBaoCao: string;
}) {
  const luuPhan1WithId = luuPhan1.bind(null, phienId);
  const [state, formAction, pending] = useActionState(luuPhan1WithId, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label htmlFor="ngay_bao_cao" className="mb-1 block text-sm font-medium text-slate-700">
          1. Ngày báo cáo <span className="text-red-500">*</span>
        </label>
        <input
          id="ngay_bao_cao"
          name="ngay_bao_cao"
          type="date"
          required
          defaultValue={phien.ngay_bao_cao}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          2. Họ và tên người báo cáo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          disabled
          value={hoTenNguoiBaoCao}
          className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">Tự động lấy từ tài khoản đăng nhập.</p>
      </div>

      <div>
        <label htmlFor="dd_uy_quyen_khi_vang_mat" className="mb-1 block text-sm font-medium text-slate-700">
          3. ĐD được ĐDTK ủy quyền khi vắng mặt
        </label>
        <input
          id="dd_uy_quyen_khi_vang_mat"
          name="dd_uy_quyen_khi_vang_mat"
          type="text"
          defaultValue={phien.dd_uy_quyen_khi_vang_mat ?? ""}
          placeholder="Chỉ điền khi người báo cáo là người được ủy quyền"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <SoNguyenField
        name="tong_so_nb_thuc_te"
        label="4. Tổng số người bệnh hiện có thực tế tại khoa"
        defaultValue={phien.tong_so_nb_thuc_te}
      />
      <SoNguyenField
        name="so_nb_cap_1"
        label="5. Số người bệnh phân cấp chăm sóc cấp 1"
        defaultValue={phien.so_nb_cap_1}
      />
      <SoNguyenField
        name="so_nb_cap_2"
        label="6. Số người bệnh phân cấp chăm sóc cấp 2"
        defaultValue={phien.so_nb_cap_2}
      />
      <SoNguyenField
        name="so_nb_cap_3"
        label="7. Số người bệnh phân cấp chăm sóc cấp 3"
        defaultValue={phien.so_nb_cap_3}
      />
      <SoNguyenField
        name="so_giuong_dv_trong"
        label="8. Số giường dịch vụ còn trống"
        defaultValue={phien.so_giuong_dv_trong}
      />
      <SoNguyenField
        name="so_giuong_thuong_trong"
        label="9. Số giường thường còn trống"
        defaultValue={phien.so_giuong_thuong_trong}
      />
      <SoNguyenField
        name="so_nb_nam_bang_ca"
        label="10. Số người bệnh đang nằm băng ca"
        ghiChu="Nếu có, cho phép nhập 0"
        defaultValue={phien.so_nb_nam_bang_ca}
      />
      <SoNguyenField
        name="tong_so_dd_co_huu"
        label="11. Tổng số ĐD/HS cơ hữu của khoa"
        defaultValue={phien.tong_so_dd_co_huu}
      />
      <SoNguyenField
        name="so_dd_dang_cong_tac_trong_ngay"
        label="12. Số ĐD/HS đang công tác trong ngày"
        ghiChu="Tính tất cả các ca làm việc trong ngày, KHÔNG tính ĐD/HS ra trực"
        defaultValue={phien.so_dd_dang_cong_tac_trong_ngay}
      />
      <SoNguyenField
        name="so_dd_ra_truc"
        label="13. Số ĐD/HS ra trực"
        defaultValue={phien.so_dd_ra_truc}
      />
      <SoNguyenField
        name="so_dd_nghi_bu_nghi_phep"
        label="14. Số ĐD/HS nghỉ bù - nghỉ phép"
        defaultValue={phien.so_dd_nghi_bu_nghi_phep}
      />
      <SoNguyenField
        name="so_dd_nghi_che_do"
        label="15. Số ĐD/HS đang nghỉ theo chế độ"
        ghiChu="Nếu có, cho phép nhập 0"
        defaultValue={phien.so_dd_nghi_che_do}
      />

      {state.loi && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.loi}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-4 text-base font-bold text-white active:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Lưu và tiếp tục sang danh sách phòng →"}
      </button>
    </form>
  );
}
