import { describe, it, expect } from "vitest";
import type { ProductCode } from "@edim/bom-code";
import { supplierProposals, fanProposals, marginProposals, SAMPLE_HOURS_PER_YEAR } from "../app/lib/consulting";
import { consultingHtml } from "../app/lib/consulting-print";

const P = (id: string, supplier: string | null, price: number, effectiveFrom: string, item = "") =>
  ({ id, code: "SCS 1", item, price, currency: "KRW", supplier, effectiveFrom, createdAt: `${effectiveFrom}T00:00:00Z` });

describe("KB-1 트랙 1 · 공급처", () => {
  const line = { no: 1, childCode: "SCS 1", qty: 2, unitCost: 2700000, priceSource: { kind: "history", priceId: "cur" } };
  it("같은 코드 · 같은 품목에서 공급처별 최신 유효 행이 더 싸면 (차액 × 수량) · 근거 = 그 행 id", () => {
    const out = supplierProposals("run1", [line], [P("cur", null, 2700000, "2026-02-01"), P("b-old", "B", 2100000, "2025-01-01"), P("b", "B", 2300000, "2026-01-15"), P("c", "C", 2600000, "2026-01-01")], "2026-09-29");
    expect(out).toHaveLength(1);
    expect(out[0]!.saving).toEqual({ amount: 800000, unit: "KRW" });
    expect(out[0]!.evidence.map((e) => e.id)).toEqual(["run1#1", "b", "cur"]);
  });
  it("미래 유효 · 다른 통화 · 다른 품목 · 더 비싼 행은 제안하지 않는다", () => {
    const out = supplierProposals("run1", [line], [P("cur", null, 2700000, "2026-02-01"), P("f", "F", 1000, "2027-01-01"), P("x", "X", 1000, "2026-01-01", "other"), { ...P("u", "U", 1000, "2026-01-01"), currency: "USD" }, P("d", "D", 2800000, "2026-01-01")], "2026-09-29");
    expect(out).toEqual([]);
  });
});

describe("KB-1 트랙 1 · 팬 효율", () => {
  const sp = { input: { q_cmh: 12000, p_pa: 600 }, result: { model: "A", rpm: 1000, eta: 0.6, shaftKw: 3.0 } };
  const seg = (model: string, e: number) => ({ model, rpm: 1000, q1: 11000, p1: 700, e1: e, q2: 13000, p2: 500, e2: e });
  it("같은 운전점에서 효율이 더 높은 후보 → 연간 kWh 절감(가정 운전시간 샘플)", () => {
    const r = fanProposals("run1", sp, [seg("A", 0.6), seg("B", 0.7)]);
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals[0]!.title).toContain("B");
    expect(r.proposals[0]!.saving!.unit).toBe("kWh/yr");
    expect(r.proposals[0]!.saving!.amount).toBeGreaterThan(0);
    expect(r.proposals[0]!.detail).toContain(`${SAMPLE_HOURS_PER_YEAR.toLocaleString("ko-KR")} h/년(샘플)`);
  });
  it("스냅샷 선정이 이미 최고면 제안 없음 · Special 없는 스냅샷은 대상 아님", () => {
    expect(fanProposals("run1", { ...sp, result: { ...sp.result, eta: 0.9 } }, [seg("A", 0.6)]).proposals).toEqual([]);
    expect(fanProposals("run1", null, null).note).toContain("대상 아님");
  });
});

describe("KB-1 트랙 1 · 설계 여유", () => {
  const product = {
    code: "SPF", name: "", kind: "product", category: "", unit: "set", specTemplate: "", materialTemplate: "",
    tables: { rul: { no: 6, role: "rule", by: "B", default: "", cols: [{ key: "A", name: "target" }, { key: "B", name: "op" }, { key: "C", name: "value" }, { key: "D", name: "name" }],
      rows: [
        { item: "R1", cells: { A: "detail.Fan.A", B: "max", C: 1300, D: "팬 A" } },
        { item: "R2", cells: { A: "W", B: "max", C: 5000, D: "폭" } },
        { item: "R3", cells: { A: "H", B: "min", C: 2400, D: "높이 하한" } },
      ] } },
  } as unknown as ProductCode;
  it("여유 < 5% 만(위반 · 넉넉함은 제외) · 근거 = 규칙 표의 행", () => {
    const out = marginProposals("run1", product, { W: 2472, H: 2472, L: 900, sections: [], detail: [{ target: "Fan", label: "A", value: 1250, source: "" }] });
    expect(out.map((p) => p.evidence[0]!.id)).toEqual(["SPF#rul.R1", "SPF#rul.R3"]);
    expect(out[0]!.title).toContain("3.8%");
  });
});

describe("KB 인쇄본", () => {
  it("발치에 스냅샷 id · 분석 날짜 · 샘플 표지 · 숨김 지표 문구", () => {
    const html = consultingHtml(
      { runId: "r-1", code: "SPF", parentCode: "SPF", createdAt: "2026-09-29T00:00:00Z", analyzedOn: "2026-09-29", hoursPerYear: 4000, proposals: [], fanNote: "x", totals: { krw: 0, kwh: 0 }, sample: "" },
      [{ metric: "fan_eta", label: "팬 효율 η", unit: "η", n: 2, p25: null, p50: null, p75: null, mine: 0.7, percentile: null, suppressed: true }],
    );
    expect(html).toContain("스냅샷 <span class=\"mono\">r-1</span> · 분석 날짜 2026-09-29");
    expect(html).toContain("샘플 단가 · 샘플 운전시간");
    expect(html).toContain("표본이 3곳 미만이라 보여 드리지 않습니다");
  });
});
