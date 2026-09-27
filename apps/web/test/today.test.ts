import { describe, it, expect } from "vitest";
import { businessToday, businessDateOf } from "../app/lib/today";

// 2026-09-27 00:21 KST = 2026-09-26 15:21 UTC — UTC 날짜로 자르면 어제가 된다(e2e S45d 결함)
const AT = new Date("2026-09-26T15:21:00Z");

describe("business date is the company's calendar day, not the UTC day", () => {
  it("KST just after midnight is already the next day", () => {
    expect(AT.toISOString().slice(0, 10)).toBe("2026-09-26");
    expect(businessToday(AT, "Asia/Seoul")).toBe("2026-09-27");
  });
  it("other time zones follow their own calendar day", () => {
    expect(businessToday(AT, "UTC")).toBe("2026-09-26");
    expect(businessToday(new Date("2026-09-27T02:00:00Z"), "America/Los_Angeles")).toBe("2026-09-26");
  });
  it("a stored timestamp (tenant created_at) shows the company's calendar day, not the UTC day", () => {
    expect(businessDateOf("2026-09-26T15:21:00.000Z")).toBe("2026-09-27");
    expect(businessDateOf(new Date("2026-09-26T14:59:00Z"))).toBe("2026-09-26");
  });
});
