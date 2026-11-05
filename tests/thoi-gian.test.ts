import { describe, expect, it } from "vitest";
import { congNgay, gioPhutVN, ngayVN, thuTrongTuanVN } from "@/lib/thoi-gian";

describe("giờ Việt Nam", () => {
  it("6h sáng giờ VN (23h UTC hôm trước) vẫn là ngày hôm nay ở VN", () => {
    expect(ngayVN(new Date("2026-11-04T23:00:00Z"))).toBe("2026-11-05");
  });
  it("cộng ngày qua tháng", () => expect(congNgay("2026-01-31", 1)).toBe("2026-02-01"));
  it("thứ và giờ theo VN", () => {
    expect(thuTrongTuanVN(new Date("2026-11-08T18:00:00Z"))).toBe(1); // 01:00 thứ 2 ở VN
    expect(gioPhutVN(new Date("2026-11-05T08:00:00Z"))).toBe("15:00");
  });
});
