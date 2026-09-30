import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import ExcelJS from "exceljs";
import type { QuotationBody, TechDataBody, SourceStamp } from "./document";
import type { LayoutElement } from "../print-layout";

/**
 * E7 · p48 "File 내보내기(Office)" — 인쇄본과 **같은 body(스냅샷)** 를 .docx · .xlsx 로 옮긴다.
 * 여기서 다시 계산하는 숫자는 없다. 합계·단가·수량은 body 에 박힌 값 그대로이고,
 * 엑셀에는 **표시 문자열이 아니라 값**으로 넣는다(합계를 엑셀이 다시 낼 수 있게) — 서식은 통화·날짜만.
 * 인쇄 양식(H9)을 쓰는 문서는 양식 요소의 위→아래(같은 줄은 왼→오른) 순서로 절을 놓는다.
 */

type Num = "won" | "int" | "num";
export type Cell = string | number | Date;
export type Section =
  | { kind: "title"; text: string }
  | { kind: "fields"; rows: [string, Cell][] }
  | { kind: "table"; id: string; name: string; head: string[]; fmt: (Num | null)[]; rows: Cell[][]; total?: Cell[] }
  | { kind: "text"; text: string };

export interface ExportDoc { docNo: string; currentRev: string; status: string; docType: string; body: unknown }

const STATUS: Record<string, string> = { draft: "작성중", review: "검토", approved: "승인", issued: "발행" };
const dateOf = (s: string): Cell => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : s);

function sourceText(s: SourceStamp): string {
  return `근거 — BOM 스냅샷 ${s.runId} · 카탈로그 지문 ${s.catalogFp} · 코드 개정 ${s.codeRevisionId ?? "—"} · 매크로 개정 ${s.macroRevision === null ? "—" : `r${s.macroRevision}`}. `
    + "이 문서의 숫자는 위 스냅샷에 저장된 값을 그대로 옮긴 것이며, 내보낼 때 다시 계산하지 않았습니다.";
}

/** 문서 한 장을 절(section) 목록으로. 인쇄본의 표와 같은 내용·같은 순서. */
function partsOf(doc: ExportDoc): { title: Section; fields: Section; tables: Section[]; graphs: Section[]; source: Section } {
  const b = doc.body as QuotationBody | TechDataBody;
  const p = b.project;
  const head: [string, Cell][] = [
    ["문서 번호", doc.docNo], ["개정", doc.currentRev], ["상태", STATUS[doc.status] ?? doc.status], ["일자", dateOf(b.date)],
  ];
  if (b.kind === "quotation") {
    const cur = b.pcr.currency;
    const fields: [string, Cell][] = [...head,
      ["공사명", p?.name ?? "—"], ["고객", p?.clientName ?? "—"], ["Project No.", p?.projectNo ?? "—"], ["Product Code", b.code],
      ["통화", cur], ["VAT", b.vat], ["납품조건", b.terms.delivery || "—"], ["지급조건", b.terms.payment || "—"], ["유효기간", b.terms.validity || "—"], ["보증기간", b.terms.warranty || "—"]];
    const tables: Section[] = [
      { kind: "table", id: "pcr", name: "PCR · Pre-Calculation Report", head: ["항목", `금액 (${cur})`], fmt: [null, "won"],
        rows: [["Material Cost", b.pcr.material], ["Manufacturing Cost", b.pcr.manufacturing], ["Direct Cost", b.pcr.directCost], ["Overhead", b.pcr.overhead], ["Full cost", b.pcr.fullCost]] },
      { kind: "table", id: "quotation", name: "Quotation · 견적서", head: ["No", "장비 번호", "수량", `단가 (${cur})`, `합계 (${cur})`], fmt: ["int", null, "int", "won", "won"],
        rows: b.items.map((i) => [i.no, i.equipment, i.qty, i.unitPrice, i.amount]), total: ["합계", "", b.totalQty, "", b.total] },
    ];
    if (b.applied) tables.push({ kind: "table", id: "items", name: "견적 적용 Table", head: ["No", "Code No.", "품목", "수량", `Price (${cur})`, `금액 (${cur})`, "Supplier", "Price table", "비고"],
      fmt: ["int", null, null, "num", "won", "won", null, null, null],
      rows: b.applied.map((a) => [a.no, a.code, a.part, a.qty, a.unitPrice, a.amount, a.supplier || "—", a.table, a.note]),
      total: ["합계 = PCR Material Cost", "", "", "", "", b.applied.reduce((x, a) => x + a.amount, 0), "", "", ""] });
    // ccmd M · p66 PCR 세부 — 인쇄본과 같은 줄 · 같은 순서(Business Type 열)
    const d = b.pcrDetail;
    if (d) {
      const line = (l: string, v: number[]): Cell[] => [l, ...v];
      const rows: Cell[][] = [line("Sales price · Contract Amount", d.businessTypes.map(() => d.contract))];
      for (const s of d.sections.filter((x) => x.group === "direct")) rows.push(...s.rows.map((r) => line(`${s.name} · ${r.label}`, r.values)));
      rows.push(line("Direct costs total", d.directTotal), line("Contribution margin", d.contribution));
      for (const s of d.sections.filter((x) => x.group === "sna")) rows.push(...s.rows.map((r) => line(`${s.name} · ${r.label}`, r.values)));
      rows.push(line("Full costs", d.fullCost));
      tables.push({ kind: "table", id: "pcrdetail", name: `PCR 세부 · Business Type${d.sample ? " (샘플 요율)" : ""} · ${d.file} ${d.fingerprint}`,
        head: ["항목", ...d.businessTypes], fmt: [null, ...d.businessTypes.map(() => "won" as const)], rows, total: line("EBIT", d.ebit) });
    }
    return { title: { kind: "title", text: "견 적 서" }, fields: { kind: "fields", rows: fields }, tables, graphs: [], source: { kind: "text", text: sourceText(b.source) } };
  }
  const fields: [string, Cell][] = [...head, ["Project", p ? `${p.projectNo} · ${p.name}` : "—"], ["Document Code", b.code]];
  const tables: Section[] = [
    { kind: "table", id: "input", name: "Input Data", head: b.input.map((i) => i.key), fmt: b.input.map(() => null), rows: [b.input.map((i) => i.value)] },
  ];
  if (b.inputData?.length) tables.push({ kind: "table", id: "inputdata", name: "Input Data (템플릿)", head: b.inputData.map((i) => `${i.label}${i.unit ? ` (${i.unit})` : ""}`), fmt: b.inputData.map(() => "num"), rows: [b.inputData.map((i) => i.value)] });
  tables.push({ kind: "table", id: "macro", name: `Macro · 승인 개정 r${b.macro.revision}`, head: ["Macro id", "Coding"], fmt: [null, null], rows: [[b.macro.id, b.macro.dsl]] });
  tables.push({ kind: "table", id: "output", name: "Output Data", head: ["항목", "값"], fmt: [null, "num"], rows: [[b.output.name, b.output.value]] });
  if (b.outputData?.length) tables.push({ kind: "table", id: "outputdata", name: "Output Data (템플릿)", head: ["항목", "값", "단위", "비고"], fmt: [null, "num", null, null],
    rows: b.outputData.map((o) => [o.label, o.value === null ? "" : o.value, o.unit, o.value === null ? o.note ?? "없음" : ""]) });
  const graphs: Section[] = (b.graphs ?? []).map((g, i) => ({ kind: "table", id: `graph${i + 1}`, name: `Graph · ${g.name}`, head: [g.xLabel || "x", g.yLabel || "y"], fmt: [null, "num"],
    rows: g.points.map((pt) => [pt.x, pt.y] as Cell[]) }));
  return { title: { kind: "title", text: "TECH DATA" }, fields: { kind: "fields", rows: fields }, tables, graphs, source: { kind: "text", text: sourceText(b.source) } };
}

/** 인쇄 양식이 있으면 그 순서, 없으면 인쇄본 기본 순서(제목 → 머리 → 표 → 그래프 → 근거). */
export function sectionsOf(doc: ExportDoc, layout?: LayoutElement[] | null): Section[] {
  const s = partsOf(doc);
  if (!layout || layout.length === 0) return [s.title, s.fields, ...s.tables, ...s.graphs, s.source];
  const out: Section[] = [];
  const used = new Set<string>();
  const order = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const e of order) {
    if (e.kind === "title" && !used.has("title")) { out.push(s.title); used.add("title"); }
    else if (e.kind === "fields" && !used.has("fields")) { out.push(s.fields); used.add("fields"); }
    else if (e.kind === "table" && !used.has("table")) { out.push(...s.tables); used.add("table"); }
    else if (e.kind === "graph" && !used.has("graph")) { out.push(...s.graphs); used.add("graph"); }
    else if (e.kind === "drawing") out.push({ kind: "text", text: "[도면] 인쇄본(HTML)에 같은 BOM 스냅샷의 도면이 들어갑니다 — 도면 파일은 DXF 내려받기로." });
    else if (e.kind === "signature") out.push({ kind: "text", text: "작성 ________    검토 ________    승인 ________" });
    else if (e.kind === "logo") out.push({ kind: "text", text: "NOVA Solution" });
    else if (e.kind === "text" && e.text) out.push({ kind: "text", text: e.text });
  }
  // 양식에 없는 핵심 조각도 빠뜨리지 않는다(문서 번호 · 표 · 근거는 늘 들어간다)
  if (!used.has("fields")) out.unshift(s.fields);
  if (!used.has("title")) out.unshift(s.title);
  if (!used.has("table")) out.push(...s.tables);
  if (!used.has("graph")) out.push(...s.graphs);
  out.push(s.source);
  return out;
}

/* ───────────── Word ───────────── */

const won = (n: number) => n.toLocaleString("ko-KR");
const show = (v: Cell, f: Num | null): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "number" ? (f === "won" || f === "int" ? won(v) : String(Math.round(v * 1000) / 1000)) : v;
const thin = { style: BorderStyle.SINGLE, size: 4, color: "9AA7B3" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const cellOf = (text: string, opts: { bold?: boolean; right?: boolean; shade?: boolean } = {}) =>
  new TableCell({ borders, ...(opts.shade ? { shading: { fill: "EEF2F5" } } : {}),
    children: [new Paragraph({ alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text, bold: opts.bold, font: "Malgun Gothic", size: 19 })] })] });

export async function toDocx(doc: ExportDoc, sections: Section[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  for (const s of sections) {
    if (s.kind === "title") children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: s.text, font: "Malgun Gothic" })] }));
    else if (s.kind === "text") children.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: s.text, font: "Malgun Gothic", size: 17, color: "44525F" })] }));
    else if (s.kind === "fields") children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
      rows: s.rows.map(([k, v]) => new TableRow({ children: [cellOf(k, { bold: true, shade: true }), cellOf(show(v, null))] })) }));
    else {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun({ text: s.name, font: "Malgun Gothic" })] }));
      const rows = [new TableRow({ tableHeader: true, children: s.head.map((h) => cellOf(h, { bold: true, shade: true })) }),
        ...s.rows.map((r) => new TableRow({ children: r.map((v, i) => cellOf(show(v, s.fmt[i] ?? null), { right: typeof v === "number" })) }))];
      if (s.total) rows.push(new TableRow({ children: s.total.map((v, i) => cellOf(show(v, s.fmt[i] ?? null), { bold: true, right: typeof v === "number", shade: true })) }));
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
    }
  }
  const d = new Document({ creator: "EDIM", title: `${doc.docNo} Rev ${doc.currentRev}`, sections: [{ children }] });
  return Packer.toBuffer(d);
}

/* ───────────── Excel ───────────── */

const FMT: Record<Num, string> = { won: "#,##0", int: "0", num: "0.###" };

/** 시트 둘: "문서"(인쇄본 순서 그대로) · "품목"(품목 표만 — 합계를 SUM 으로 다시 낼 수 있는 모양). 숫자는 값, 서식은 통화·날짜만. */
export async function toXlsx(doc: ExportDoc, sections: Section[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EDIM";
  const ws = wb.addWorksheet("문서");
  ws.columns = Array.from({ length: 9 }, (_, i) => ({ width: i === 0 ? 22 : 16 }));
  const put = (vals: Cell[], fmt: (Num | null)[] = [], bold = false) => {
    const row = ws.addRow(vals);
    vals.forEach((v, i) => {
      const c = row.getCell(i + 1);
      if (v instanceof Date) c.numFmt = "yyyy-mm-dd";
      else if (typeof v === "number" && fmt[i]) c.numFmt = FMT[fmt[i]!];
      if (bold) c.font = { bold: true };
    });
    return row;
  };
  for (const s of sections) {
    if (s.kind === "title") { put([s.text], [], true).getCell(1).font = { bold: true, size: 16 }; ws.addRow([]); }
    else if (s.kind === "text") { ws.addRow([]); put([s.text]); }
    else if (s.kind === "fields") for (const [k, v] of s.rows) put([k, v], [null, null]);
    else { ws.addRow([]); put([s.name], [], true); put(s.head, [], true); for (const r of s.rows) put(r, s.fmt); if (s.total) put(s.total, s.fmt, true); }
  }
  const items = sections.find((s): s is Extract<Section, { kind: "table" }> => s.kind === "table" && (s.id === "items" || s.id === "quotation") && (s.id === "items" || !sections.some((x) => x.kind === "table" && x.id === "items")));
  if (items) {
    const it = wb.addWorksheet("품목");
    it.columns = items.head.map((h) => ({ header: h, width: Math.max(10, h.length + 4) }));
    it.getRow(1).font = { bold: true };
    for (const r of items.rows) {
      const row = it.addRow(r);
      r.forEach((v, i) => { if (typeof v === "number" && items.fmt[i]) row.getCell(i + 1).numFmt = FMT[items.fmt[i]!]; });
    }
    // 합계 줄 — 값이 아니라 SUM 식(결과값도 함께 넣어, 식을 계산하지 않는 뷰어에서도 같은 숫자)
    const amountCol = items.fmt.lastIndexOf("won") + 1;
    if (amountCol > 0 && items.total) {
      const n = items.rows.length;
      const L = String.fromCharCode(64 + amountCol);
      const tot = it.addRow([]);
      tot.getCell(1).value = "합계";
      tot.getCell(amountCol).value = { formula: `SUM(${L}2:${L}${n + 1})`, result: items.total[amountCol - 1] as number };
      tot.getCell(amountCol).numFmt = FMT.won;
      tot.font = { bold: true };
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
