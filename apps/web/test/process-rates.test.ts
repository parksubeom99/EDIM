import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProcessRates, processCostOf } from "../app/lib/process-rates";

const SAMPLE = JSON.parse(readFileSync(join(__dirname, "../../../packages/bom-code/cost-rules/process-rates.sample.json"), "utf-8"));

describe("ccmd P · p44-6 공정비용(참고)", () => {
  it("샘플 파일 통과 · 샘플 표지 · 요율이 음수면 거부", () => {
    const p = parseProcessRates(SAMPLE);
    expect(p.ok && p.rates.sample).toContain("샘플");
    expect(parseProcessRates({ ...SAMPLE, ratePerHour: { X: -1 } }).ok).toBe(false);
  });
  it("시간 × 인원 × 수량 × 요율 · 작업장 요율 없으면 default · 같은 입력 = 같은 답", () => {
    const p = parseProcessRates(SAMPLE); if (!p.ok) throw new Error(p.error);
    const steps = [
      { seq: 1, name: "조립", center: "WC-ASM", hours: 3, persons: 2 },
      { seq: 2, name: "도장", center: "WC-PNT", hours: 2, persons: 1 },
      { seq: 3, name: "검사", center: "WC-QC", hours: 1, persons: 1 },
      { seq: 4, name: "포장", center: "WC-ETC", hours: 1, persons: 1 },
    ];
    const r = processCostOf(steps, 2, p.rates);
    expect(r.rows.map((x) => x.amount)).toEqual([384000, 112000, 60000, 60000]);
    expect(r.total).toBe(616000);
    expect(processCostOf(steps, 2, p.rates)).toEqual(r);
    expect(processCostOf(steps, 2, { ...p.rates, default: null }).missing).toEqual(["WC-ETC"]);
  });
});
