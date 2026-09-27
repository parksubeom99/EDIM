import { describe, it, expect } from "vitest";
import demo from "@edim/bom-code/catalog/ahu-demo.json";
import { runBomCode, toBomLine, type Catalog } from "@edim/bom-code";
import { buildCost } from "../app/lib/output/bom";
import { buildQuotationBody, renderDocumentHtml, laborBasisText, type SnapshotLike } from "../app/lib/output/document";

/** F10 · p66 Manufacturing Cost Table · p67 제조 정보 → 인건비. 숫자는 실제 엔진 줄에서 나온다. */
const catalog = demo as unknown as Catalog;
const S55 = { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" };
const r = runBomCode(catalog, S55, 455.4);
if (!r.ok) throw new Error(r.error.message);
const lines = r.lines.map(toBomLine);
const ROWS = [
  { process: "조립", equipment: null, hours: 12, rate: 45_000 },
  { process: "도장", equipment: "도장 부스", hours: 6, rate: 38_000 },
];

function snap(cost: ReturnType<typeof buildCost>, raw: unknown[] = r.ok ? r.lines : []): SnapshotLike {
  return {
    id: "11111111-1111-4111-8111-111111111111", code: "EU-55-2123-630SS", slots: S55, macroValue: 455.4,
    macroId: null, macroRevision: null, macroDsl: null, catalogFp: "fp", codeRevisionId: null, lines: raw, cost,
  };
}

describe("F10 인건비 — 제조 정보 표가 있으면 Σ 시간 × 임율, 없으면 재료비 × 18%", () => {
  it("표가 없거나 비면 기존 그대로(18%) · 근거 ratio", () => {
    for (const c of [buildCost(lines), buildCost(lines, { productCode: "EU", rows: [] })]) {
      expect(c.labor).toBe(Math.round(c.material * 0.18));
      expect(c.overhead).toBe(Math.round((c.material + c.labor) * 0.12));
      expect(c.laborBasis).toEqual({ kind: "ratio", ratio: 0.18 });
    }
  });
  it("표가 있으면 인건비 = Σ round(시간 × 임율) · 경비는 (재료 + 인건) × 12% · 근거에 행별 금액", () => {
    const c = buildCost(lines, { productCode: "EU", rows: ROWS });
    expect(c.labor).toBe(768_000);
    expect(c.overhead).toBe(Math.round((c.material + 768_000) * 0.12));
    expect(c.total).toBe(c.material + c.labor + c.overhead);
    expect(c.laborBasis).toEqual({ kind: "mfg-table", productCode: "EU", rows: [
      { process: "조립", equipment: null, hours: 12, rate: 45_000, amount: 540_000 },
      { process: "도장", equipment: "도장 부스", hours: 6, rate: 38_000, amount: 228_000 },
    ] });
  });
  it("소수 시간은 행마다 원 단위로 반올림한다", () => {
    const c = buildCost(lines, { productCode: "EU", rows: [{ process: "검사", equipment: null, hours: 1.25, rate: 33_333 }] });
    expect(c.labor).toBe(Math.round(1.25 * 33_333));
  });
});

describe("F10 견적 적용 — 견적서는 스냅샷 값을 옮길 뿐이다", () => {
  it("견적 합계 = 스냅샷 원가 · PCR Manufacturing = 스냅샷 인건비 · 인건비 기준이 본문에 실린다", () => {
    const cost = buildCost(lines, { productCode: "EU", rows: ROWS });
    const q = buildQuotationBody(snap(cost), null, {}, "QR-0-01", "A", "2026-09-27");
    if (!q.ok) throw new Error("unexpected");
    expect(q.body.total).toBe(cost.total);
    expect(q.body.pcr.manufacturing).toBe(768_000);
    expect(q.body.laborBasis).toEqual(cost.laborBasis);
  });
  it("견적 적용 Table 금액 합 = PCR Material Cost · 이력 단가 줄은 '구매', 관계값은 '견적'", () => {
    if (!r.ok) throw new Error("unexpected");
    const raw = r.lines.map((l, i) => i === 0
      ? { ...l, unitCost: 25_000, priceSource: { kind: "history", priceId: "p1", effectiveFrom: "2026-09-01", supplier: "대한철강" } }
      : { ...l, priceSource: { kind: "relationship" } });
    const cost = buildCost(raw.map(toBomLine));
    const q = buildQuotationBody(snap(cost, raw), null, {}, "QR-0-01", "A", "2026-09-27");
    if (!q.ok) throw new Error("unexpected");
    const a = q.body.applied!;
    expect(a.length).toBe(raw.length);
    expect(a.reduce((x, y) => x + y.amount, 0)).toBe(q.body.pcr.material);
    expect(a[0]).toMatchObject({ code: raw[0]!.childCode, unitPrice: 25_000, supplier: "대한철강", table: "구매", note: "구매 이력 2026-09-01" });
    expect(a.slice(1).every((x) => x.table === "견적")).toBe(true);
  });
  it("인쇄본: 인건비 기준 줄(이스케이프) · 견적 적용 Table", () => {
    const cost = buildCost(lines, { productCode: "EU", rows: [{ process: "<b>조립</b>", equipment: null, hours: 2, rate: 10_000 }] });
    const q = buildQuotationBody(snap(cost), null, {}, "QR-0-01", "A", "2026-09-27");
    if (!q.ok) throw new Error("unexpected");
    const html = renderDocumentHtml({ docNo: "QR-0-01", currentRev: "A", status: "draft", docType: "quotation", body: q.body });
    expect(html).toContain('data-testid="labor-basis"');
    expect(html).toContain("제조 정보 표(EU)");
    expect(html).toContain("&lt;b&gt;조립&lt;/b&gt;");
    expect(html).not.toContain("<b>조립</b>");
    expect(html).toContain('data-testid="applied-table"');
    expect(laborBasisText({ kind: "ratio", ratio: 0.18 })).toContain("재료비 × 18%");
  });
  it("옛 스냅샷(laborBasis 없음)은 인건비 기준 줄을 지어내지 않는다", () => {
    const { laborBasis: _drop, ...old } = buildCost(lines);
    const q = buildQuotationBody(snap(old as ReturnType<typeof buildCost>), null, {}, "QR-0-01", "A", "2026-09-27");
    if (!q.ok) throw new Error("unexpected");
    expect(q.body.laborBasis).toBeUndefined();
  });
});
