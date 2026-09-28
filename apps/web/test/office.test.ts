import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { sectionsOf, toDocx, toXlsx, type ExportDoc } from "../app/lib/output/office";
import type { LayoutElement } from "../app/lib/print-layout";

/** E7 · p48 Office 내보내기 — 인쇄본과 같은 body · 숫자는 값 · 양식 순서 */
const body = {
  kind: "quotation", docNo: "QR-61313-01", rev: "A", date: "2026-09-28",
  project: { projectNo: "PS-61313-5", name: "Micron FAB AHU", clientName: "Micron" }, code: "EU-55-2123-630SS",
  pcr: { material: 1000, manufacturing: 180, directCost: 1180, overhead: 120, fullCost: 1300, currency: "KRW" },
  items: [{ no: 1, equipment: "EU-55-2123-630SS", qty: 2, unitPrice: 1300, amount: 2600 }], totalQty: 2, total: 2600, vat: "별도",
  terms: { delivery: "", payment: "", validity: "", warranty: "" },
  source: { runId: "r1", catalogFp: "fp", codeRevisionId: null, macroRevision: 2 },
  applied: [
    { no: 1, code: "FAN", part: "Fan", qty: 1, unitPrice: 600, amount: 600, supplier: "KSB", table: "견적", note: "코드 관계값" },
    { no: 2, code: "COIL", part: "Coil", qty: 2, unitPrice: 200, amount: 400, supplier: "", table: "구매", note: "구매 이력 2026-09-01" },
  ],
};
const doc: ExportDoc = { docNo: "QR-61313-01", currentRev: "A", status: "draft", docType: "quotation", body };

describe("E7 Office 내보내기", () => {
  it("기본 순서: 제목 → 머리 → 표 → 근거 · 숫자는 값", () => {
    const s = sectionsOf(doc);
    expect(s.map((x) => (x.kind === "table" ? x.id : x.kind))).toEqual(["title", "fields", "pcr", "quotation", "items", "text"]);
    const q = s.find((x) => x.kind === "table" && x.id === "quotation");
    expect(q && q.kind === "table" && q.total?.[4]).toBe(2600);
    const f = s.find((x) => x.kind === "fields");
    expect(f && f.kind === "fields" && f.rows.find(([k]) => k === "일자")?.[1]).toBeInstanceOf(Date);
  });
  it("인쇄 양식이 있으면 양식의 위→아래 순서(근거는 늘 끝)", () => {
    const lay: LayoutElement[] = [
      { id: "t", kind: "table", x: 5, y: 10, w: 90, h: 50 },
      { id: "s", kind: "signature", x: 5, y: 80, w: 40, h: 10 },
      { id: "h", kind: "title", x: 5, y: 0, w: 90, h: 8 },
    ];
    const s = sectionsOf(doc, lay);
    expect(s.map((x) => (x.kind === "table" ? x.id : x.kind))).toEqual(["fields", "title", "pcr", "quotation", "items", "text", "text"]);
    expect(s.at(-1)?.kind === "text" && (s.at(-1) as { text: string }).text.startsWith("근거")).toBe(true);
  });
  it("xlsx: 문서 번호 · 합계가 숫자 · 품목 시트 금액은 SUM 식", async () => {
    const buf = await toXlsx(doc, sectionsOf(doc));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("문서")!;
    const vals: unknown[] = [];
    ws.eachRow((r) => r.eachCell((c) => vals.push(c.value)));
    expect(vals).toContain("QR-61313-01");
    expect(vals).toContain(2600);
    const it = wb.getWorksheet("품목")!;
    expect(it.rowCount).toBe(4); // 머리 + 2줄 + 합계
    expect(it.getRow(2).getCell(6).value).toBe(600);
    expect(it.getRow(4).getCell(6).value).toMatchObject({ formula: "SUM(F2:F3)", result: 1000 });
  });
  it("docx: 비어 있지 않은 Word 파일(zip)", async () => {
    const buf = await toDocx(doc, sectionsOf(doc));
    expect(buf.length).toBeGreaterThan(2000);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
