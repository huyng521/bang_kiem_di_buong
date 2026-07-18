import { redirect } from "next/navigation";
import { requireUser, trangChuTheoVaiTro } from "@/lib/auth";

export default async function Home() {
  const user = await requireUser();
  redirect(trangChuTheoVaiTro(user.nguoiDung.vai_tro));
}
