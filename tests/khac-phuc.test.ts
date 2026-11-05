import { describe, expect, it } from "vitest";
import { laQuaHan } from "@/lib/khac-phuc";

describe("quá hạn", () => {
  it("chưa xử lý xong và qua hạn → quá hạn", () => expect(laQuaHan({ han_xu_ly: "2026-11-01", trang_thai: "moi" }, "2026-11-05")).toBe(true));
  it("đúng hôm nay là hạn → chưa quá hạn", () => expect(laQuaHan({ han_xu_ly: "2026-11-05", trang_thai: "dang_xu_ly" }, "2026-11-05")).toBe(false));
  it("đã khắc phục thì không còn quá hạn", () => expect(laQuaHan({ han_xu_ly: "2026-11-01", trang_thai: "da_khac_phuc" }, "2026-11-05")).toBe(false));
});
