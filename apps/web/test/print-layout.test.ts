import { describe, it, expect } from "vitest";
import demo from "@edim/bom-code/catalog/ahu-demo.json";
import { runBomCode, toBomLine, type Catalog } from "@edim/bom-code";
import { buildCost } from "../app/lib/output/bom";
import { validateElements, defaultLayout, renderLayoutPage } from "../app/lib/print-layout";
import { buildQuotationBody, renderDocumentHtml, type SnapshotLike } from "../app/lib/output/document";

/** H9 · p48 인쇄 양식 편집기 — 요소 모양 검사 · 쪽 그리기 · 인쇄본이 배치를 따른다 */
describe("H9 요소 모양", () => {
  it("쪽 밖 · 모르는 종류 · 너무 많음은 거부 · id 겹치면 고쳐 준다 · 소수 한 자리", () => {
    expect(validateElements([{ kind: "table", x: 60, y: 10, w: 50, h: 10 }])).toEqual({ ok: false, error: "1번째 요소(표): 쪽 밖으로 나갑니다" });
    expect(validateElements([{ kind: "chart", x: 0, y: 0, w: 10, h: 10 }]).ok).toBe(false);
    expect(validateElements([]).ok).toBe(false);
    expect(validateElements(Array.from({ length: 31 }, () => ({ kind: "text", x: 0, y: 0, w: 10, h: 10 }))).ok).toBe(false);
    const v = validateElements([{ id: "a", kind: "title", x: 1.234, y: 2, w: 10, h: 5 }, { id: "a", kind: "logo", x: 50, y: 2, w: 10, h: 5, text: " NOVA " }]);
    expect(v.ok && v.elements.map((e) => [e.id, e.x, e.text])).toEqual([["a", 1.2, undefined], ["a_", 50, "NOVA"]]);
  });
  it("기본 양식 배치는 스스로 검사를 통과한다(두 문서 종류)", () => {
    for (const t of ["quotation", "techdata"] as const) expect(validateElements(defaultLayout(t)).ok).toBe(true);
  });
  it("쪽 — 요소마다 위치·크기 % · 없는 내용은 '이 문서에 없음' · 글자는 이스케이프", () => {
    const html = renderLayoutPage(3, [{ id: "t", kind: "title", x: 5, y: 3, w: 60, h: 7, text: "<b>R</b>" }, { id: "g", kind: "graph", x: 5, y: 20, w: 40, h: 30 }], {});
    expect(html).toContain('data-layout-version="3"');
    expect(html).toContain('style="left:5%;top:3%;width:60%;height:7%"');
    expect(html).toContain("&lt;b&gt;R&lt;/b&gt;");
    expect(html).toContain("그래프 — 이 문서에 없음");
  });
});

describe("H9 인쇄본이 양식을 따른다", () => {
  const r = runBomCode(demo as unknown as Catalog, { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" }, 455.4);
  if (!r.ok) throw new Error(r.error.message);
  const run: SnapshotLike = { id: "11111111-1111-4111-8111-111111111111", code: "EU-55", slots: {}, macroValue: 455.4, macroId: null, macroRevision: null, macroDsl: null, catalogFp: "fp", codeRevisionId: null, lines: r.lines, cost: buildCost(r.lines.map(toBomLine)) };
  const q = buildQuotationBody(run, null, {}, "QR-0-01", "A", "2026-09-28");
  if (!q.ok) throw new Error("unexpected");
  const doc = { docNo: "QR-0-01", currentRev: "A", status: "issued", docType: "quotation", body: q.body };
  it("양식이 없으면 기존 인쇄본 그대로(양식 쪽 없음)", () => {
    expect(renderDocumentHtml(doc)).not.toContain('data-testid="print-layout"');
  });
  it("양식이 있으면 그 배치로 · 숫자는 body 그대로 · 도면 SVG 가 도면 칸에 · 박힌 버전이면 그렇다고", () => {
    const html = renderDocumentHtml(doc, undefined, { version: 2, pinned: true, drawingSvg: "<svg data-x=\"1\"></svg>", elements: defaultLayout("quotation") });
    expect(html).toContain('data-layout-version="2"');
    expect(html).toContain('data-el="table"');
    expect(html).toContain(q.body.total.toLocaleString("ko-KR"));
    expect(html).toContain('data-testid="print-drawing"');
    expect(html).toContain("발행 때 박힌 버전");
  });
});
