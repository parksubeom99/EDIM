import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePcrRules, buildPcrDetail, salePrice } from "../app/lib/pcr";
import { buildQuotationBody, renderDocumentHtml, snapshotProfit, type SnapshotLike } from "../app/lib/output/document";

const SAMPLE = JSON.parse(readFileSync(join(__dirname, "../../../packages/bom-code/cost-rules/pcr-rules.sample.json"), "utf-8"));

describe("ccmd M · p66 PCR 요율표", () => {
  it("저장소 샘플 파일이 통과한다 — Business Type 3열 · 샘플 표지 문구", () => {
    const p = parsePcrRules(SAMPLE);
    expect(p.ok).toBe(true);
    if (p.ok) { expect(p.rules.businessTypes).toHaveLength(3); expect(p.rules.sample).toContain("샘플"); }
  });
  it("pct 개수가 Business Type 수와 다르면 거부 · bom/mfg 줄이 두 번이면 거부", () => {
    const bad = structuredClone(SAMPLE); bad.sections[0].rows[1].pct = [1, 2];
    expect(parsePcrRules(bad)).toMatchObject({ ok: false });
    const twice = structuredClone(SAMPLE); twice.sections[2].rows.push({ label: "Ex-Work 2", kind: "bom" });
    expect(parsePcrRules(twice)).toMatchObject({ ok: false });
    const snaBom = structuredClone(SAMPLE); snaBom.sections[3].rows.push({ label: "x", kind: "mfg" });
    expect(parsePcrRules(snaBom)).toMatchObject({ ok: false });
  });
  it("표를 편다 — Ex-Work = 재료비 · Manufacturing = 인건비 · rate = base × % · EBIT = 견적 − Full", () => {
    const p = parsePcrRules(SAMPLE); if (!p.ok) throw new Error(p.error);
    const d = buildPcrDetail({ material: 10_000_000, labor: 1_800_000, contract: 13_216_000 }, p.rules, { fingerprint: "abc", file: "pcr-rules.sample.json" });
    const proc = d.sections[0]!;
    expect(proc.rows[0]!.values).toEqual([10_000_000, 10_000_000, 10_000_000]);
    expect(proc.rows[1]!.values).toEqual([0, 350_000, 0]);           // Air/Sea freight 3.5 % (수출만)
    expect(d.sections[1]!.rows[0]!.values).toEqual([1_800_000, 1_800_000, 1_800_000]);
    expect(d.fullCost.map((f, i) => f + d.ebit[i]!)).toEqual([13_216_000, 13_216_000, 13_216_000]);
    expect(d.contribution.map((c, i) => c + d.directTotal[i]!)).toEqual([13_216_000, 13_216_000, 13_216_000]);
  });
});

describe("ccmd M · p66 견적 body · 인쇄본", () => {
  const run: SnapshotLike = { id: "r1", code: "EU-55", slots: {}, macroValue: null, macroId: null, macroRevision: null, macroDsl: null, catalogFp: "fp", codeRevisionId: null, lines: [],
    cost: { material: 1_000_000, labor: 180_000, overhead: 141_600, total: 1_321_600, currency: "KRW" } };
  it("ccmd M-1 — 요율표가 있으면 견적 단가 = 스냅샷 원가 × (1 + 마진율 10%) · 원가 칸(PCR Full cost)은 그대로 · PCR 세부 Contract = 견적 금액 · EBIT 전부 양수", () => {
    const p = parsePcrRules(SAMPLE); if (!p.ok) throw new Error(p.error);
    expect(p.rules.marginPct).toBe(10);
    const r = buildQuotationBody(run, null, { qty: 2, pcrRules: { fingerprint: "f12", file: "pcr-rules.sample.json", rules: p.rules } }, "QR-0-01", "A", "2026-09-30");
    if (!r.ok) throw new Error(r.error);
    expect(r.body.pcr.fullCost).toBe(1_321_600);                 // 원가는 스냅샷 그대로
    expect(r.body.items[0]!.unitPrice).toBe(1_453_760);           // 1,321,600 × 1.10
    expect(r.body.total).toBe(2_907_520);
    expect(r.body.margin).toMatchObject({ pct: 10, costUnit: 1_321_600, unitPrice: 1_453_760 });
    expect(r.body.pcrDetail?.contract).toBe(2_907_520);
    expect(r.body.pcrDetail?.ebit.every((e) => e > 0)).toBe(true);
    expect(r.body.pcrDetail?.sections[0]!.rows[0]!.values[0]).toBe(2_000_000);
    const html = renderDocumentHtml({ docNo: "QR-0-01", currentRev: "A", status: "draft", docType: "quotation", body: r.body } as never);
    expect(html).toContain('data-testid="pcr-detail"');
    expect(html).toContain('data-testid="pcr-sample"');
    expect(html).toContain("f12");
    expect(html).toContain('data-testid="quote-margin"');
    expect(html).toContain('data-testid="margin-sample"');
  });
  it("ccmd M-2 · 타이 — 세로 합(구역 소계 + EBIT) = 견적 · EBIT ≤ 견적 − 표의 원가 기준(재료비 + 인건비) · 스냅샷 Overhead 는 표 밖 · 원가 기준 한 줄이 인쇄본에", () => {
    const p = parsePcrRules(SAMPLE); if (!p.ok) throw new Error(p.error);
    const r = buildQuotationBody(run, null, { qty: 2, pcrRules: { fingerprint: "f12", file: "pcr-rules.sample.json", rules: p.rules } }, "QR-0-01", "A", "2026-09-30");
    if (!r.ok) throw new Error(r.error);
    const d = r.body.pcrDetail!;
    expect(d.costBase).toBe(2_360_000);                           // (1,000,000 + 180,000) × 2
    expect(d.snapshotOverhead).toBe(283_200);                     // 141,600 × 2 — 표에 안 들어간다
    d.ebit.forEach((e, i) => {
      expect(d.sections.reduce((a, s) => a + s.subtotal[i]!, 0) + e).toBe(d.contract);
      expect(e).toBeLessThanOrEqual(d.contract - d.costBase!);
    });
    const html = renderDocumentHtml({ docNo: "QR-0-01", currentRev: "A", status: "draft", docType: "quotation", body: r.body } as never);
    expect(html).toContain('data-testid="pcr-cost-basis"');
    expect(html).toContain("2,360,000");
    expect(html).toContain("283,200");
    expect(html).toContain("마진율 10%)");
    expect(html).not.toContain("스냅샷 원가 그대로");
  });
  it("ccmd N · 참고 줄 — 스냅샷 원가 기준 이익 = 견적 합계 − 스냅샷 원가 × 수량(하드코딩 없음) · 인쇄본에 EBIT 와 나란히", () => {
    const p = parsePcrRules(SAMPLE); if (!p.ok) throw new Error(p.error);
    const r = buildQuotationBody(run, null, { qty: 2, pcrRules: { fingerprint: "f12", file: "pcr-rules.sample.json", rules: p.rules } }, "QR-0-01", "A", "2026-09-30");
    if (!r.ok) throw new Error(r.error);
    expect(snapshotProfit(r.body)).toBe(2_907_520 - 1_321_600 * 2);
    const html = renderDocumentHtml({ docNo: "QR-0-01", currentRev: "A", status: "draft", docType: "quotation", body: r.body } as never);
    expect(html).toContain('data-testid="pcr-snapshot-profit" data-value="264320"');
    expect(html).toContain("264,320");
  });
  it("요율표가 없으면 PCR 세부 · 마진 없이(옛 견적과 같은 모양 · 단가 = 원가)", () => {
    const r = buildQuotationBody(run, null, {}, "QR-0-01", "A", "2026-09-30");
    if (!r.ok) throw new Error(r.error);
    expect(r.body.pcrDetail).toBeUndefined();
    expect(r.body.margin).toBeUndefined();
    expect(r.body.total).toBe(1_321_600);
  });
  it("marginPct — 없으면 0(회사 옛 요율표도 통과) · 0~100 밖이면 거부 · salePrice 반올림", () => {
    const noM = structuredClone(SAMPLE); delete noM.marginPct;
    const q = parsePcrRules(noM); expect(q.ok && q.rules.marginPct).toBe(0);
    const bad = structuredClone(SAMPLE); bad.marginPct = -1; expect(parsePcrRules(bad).ok).toBe(false);
    expect(salePrice(15_487_170, 10)).toBe(17_035_887);
    expect(salePrice(15_487_170, 0)).toBe(15_487_170);
  });
});
