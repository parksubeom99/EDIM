import { describe, it, expect } from "vitest";
import demo from "@edim/bom-code/catalog/ahu-demo.json";
import { runBomCode, toBomLine, type Catalog } from "@edim/bom-code";
import { buildCost } from "../app/lib/output/bom";
import {
  buildQuotationBody, buildTechDataBody, purchaseLinesOf, prToCsv, renderDocumentHtml, noCoreOf,
  type SnapshotLike,
} from "../app/lib/output/document";

/** 실제 엔진이 낸 줄·원가로 스냅샷을 만든다 — 테스트용 숫자를 손으로 적지 않는다. */
const catalog = demo as unknown as Catalog;
function snapshot(slots: Record<string, string>, macro: number | null): SnapshotLike {
  const r = runBomCode(catalog, slots, macro);
  if (!r.ok) throw new Error(r.error.message);
  return {
    id: "11111111-1111-4111-8111-111111111111", code: "EU-55-2123-630SS", slots, macroValue: macro,
    macroId: macro === null ? null : "22222222-2222-4222-8222-222222222222",
    macroRevision: macro === null ? null : 2, macroDsl: macro === null ? null : "=IF(CAP>50, Table1(A,2:2)*82.8, 0)",
    catalogFp: "fp", codeRevisionId: null,
    lines: r.lines, cost: buildCost(r.lines.map(toBomLine)),
  };
}
const S55 = { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" };
const PRJ = { projectNo: "PS-61313-5", name: "Micron #7", clientName: "Micron" };

describe("P4-b 견적 — 합계는 스냅샷의 원가 그대로다", () => {
  it("수량 1 이면 견적 합계 = 스냅샷 cost.total (다시 세지 않는다)", () => {
    for (const s of [S55, { ...S55, B: "10", D: "A1" }, { ...S55, A: "ER", D: "" }]) {
      const run = snapshot(s, 455.4);
      const q = buildQuotationBody(run, PRJ, {}, "QR-61313-01", "A", "2026-09-20");
      expect(q.ok).toBe(true);
      if (!q.ok) continue;
      expect(q.body.total).toBe((run.cost as { total: number }).total);
      expect(q.body.pcr.fullCost).toBe(q.body.total);
      expect(q.body.pcr.directCost + q.body.pcr.overhead).toBe(q.body.pcr.fullCost);
    }
  });
  it("수량을 주면 합계 = 단가 × 수량이고 단가는 그대로다", () => {
    const run = snapshot(S55, 455.4);
    const q = buildQuotationBody(run, PRJ, { qty: 3 }, "QR-61313-01", "A", "2026-09-20");
    expect(q.ok && q.body.items[0]!.unitPrice).toBe((run.cost as { total: number }).total);
    expect(q.ok && q.body.total).toBe((run.cost as { total: number }).total * 3);
  });
  it("원가가 없는 스냅샷·이상한 수량은 거부한다", () => {
    const run = snapshot(S55, 455.4);
    expect(buildQuotationBody({ ...run, cost: {} }, PRJ, {}, "n", "A", "d").ok).toBe(false);
    expect(buildQuotationBody(run, PRJ, { qty: 0 }, "n", "A", "d").ok).toBe(false);
    expect(buildQuotationBody(run, PRJ, { qty: 1.5 }, "n", "A", "d").ok).toBe(false);
  });
});

describe("P4-b Tech Data — 값과 함께 그 값을 낸 매크로 개정·입력을 박는다", () => {
  it("결과값·매크로 개정·원문·입력 슬롯이 본문에 들어간다", () => {
    const t = buildTechDataBody(snapshot(S55, 455.4), PRJ, "TD-61313-01", "A", "2026-09-20");
    expect(t.ok).toBe(true);
    if (!t.ok) return;
    expect(t.body.output.value).toBe(455.4);
    expect(t.body.macro.revision).toBe(2);
    expect(t.body.macro.dsl).toContain("Table1");
    expect(t.body.input.map((i) => i.key)).toEqual(["A", "B", "C", "D", "E", "F"]);
  });
  it("매크로 없이 돈 스냅샷, 개정 기록이 없는 옛 스냅샷은 거부한다", () => {
    expect(buildTechDataBody(snapshot(S55, null), PRJ, "n", "A", "d").ok).toBe(false);
    expect(buildTechDataBody({ ...snapshot(S55, 455.4), macroRevision: null }, PRJ, "n", "A", "d").ok).toBe(false);
  });
});

describe("P4-b 구매 요청 — 스냅샷의 구매 품목만", () => {
  it("구매 줄 수 = 스냅샷에서 kind=purchase 인 줄 수, 값은 줄에서 그대로", () => {
    for (const s of [S55, { ...S55, D: "A1" }, { ...S55, A: "EC", D: "H2" }]) {
      const run = snapshot(s, 455.4);
      const all = run.lines as { kind: string; no: number; qty: number; unitCost: number }[];
      const r = purchaseLinesOf(run);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const want = all.filter((l) => l.kind === "purchase");
      expect(r.lines.length).toBe(want.length);
      expect(r.lines.map((l) => [l.bomLineNo, l.qty, l.unitPrice])).toEqual(want.map((l) => [l.no, l.qty, l.unitCost]));
    }
  });
  it("줄에 kind 가 없는 옛 스냅샷은 짐작하지 않고 거부한다", () => {
    const run = snapshot(S55, 455.4);
    const legacy = (run.lines as Record<string, unknown>[]).map(({ kind: _k, ...rest }) => rest);
    const r = purchaseLinesOf({ ...run, lines: legacy });
    expect(r.ok).toBe(false);
  });
});

describe("P4-b CSV · 인쇄본 — 경계에서 안전하다", () => {
  const pr = {
    prNo: "PR-61313-1", poNo: null, projectNo: "PS-61313-5", bomRunId: "run", code: "EU-55", status: "rfq",
    lines: [
      { lineNo: 1, resolvedCode: "PFP 1-13", part: 'Pre "filter", MERV', spec: "=HYPERLINK(1)", qty: 17, unit: "ea", supplier: null, requiredDate: new Date("2026-10-01T00:00:00Z"), unitPrice: 18000 },
      { lineNo: 2, resolvedCode: "PVF 1", part: "Inverter", spec: "11kW VFD", qty: 1, unit: "ea", supplier: null, requiredDate: null, unitPrice: 541000 },
    ],
  };
  it("머리 1줄 + 줄 수만큼, BOM 으로 시작하고, 금액 = 수량×단가", () => {
    const csv = prToCsv(pr);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const rows = csv.trim().split("\r\n");
    expect(rows.length).toBe(1 + pr.lines.length);
    expect(rows[0]).toContain("PR No,PO No,Project No,BOM No");
    expect(rows[1]!.endsWith(",18000,306000")).toBe(true);
    expect(rows[1]).toContain("견적 요청");
    expect(rows[1]).toContain("2026-10-01");
  });
  it("따옴표·쉼표는 감싸고, 수식으로 읽힐 칸은 죽인다", () => {
    const csv = prToCsv(pr);
    expect(csv).toContain('"Pre ""filter"", MERV"');
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).not.toMatch(/,=HYPERLINK/);
  });
  it("인쇄본은 본문 값을 HTML 로 이스케이프한다", () => {
    const run = snapshot(S55, 455.4);
    const q = buildQuotationBody(run, { ...PRJ, name: "<script>alert(1)</script>" }, {}, "QR-61313-01", "A", "2026-09-20");
    if (!q.ok) throw new Error("unexpected");
    const html = renderDocumentHtml({ docNo: "QR-61313-01", currentRev: "A", status: "draft", docType: "quotation", body: q.body });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain((run.cost as { total: number }).total.toLocaleString("ko-KR"));
  });
});

describe("번호의 가운데 토막 (p51 PR-61313-2 · p66 QR-61216-01)", () => {
  it("프로젝트 번호의 머리글자와 끝 순번을 뗀다", () => {
    expect(noCoreOf("PS-61313-5")).toBe("61313");
    expect(noCoreOf("OR-61313-5")).toBe("61313");
    expect(noCoreOf("PRJ-7")).toBe("7");
    expect(noCoreOf(null)).toBe("0");
  });
});
