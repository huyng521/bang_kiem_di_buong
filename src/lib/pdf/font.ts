import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Font Unicode đủ dấu tiếng Việt, nhúng vào file PDF.
let daDangKy = false;
export function dangKyFont() {
  if (daDangKy) return;
  const thuMuc = path.join(process.cwd(), "src/assets/fonts");
  Font.register({
    family: "BeVietnamPro",
    fonts: [
      { src: path.join(thuMuc, "BeVietnamPro_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(thuMuc, "BeVietnamPro_400Regular_Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(thuMuc, "BeVietnamPro_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(thuMuc, "BeVietnamPro_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((tu) => [tu]); // không ngắt từ tiếng Việt
  daDangKy = true;
}
