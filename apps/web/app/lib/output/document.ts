/**
 * P4-b — 견적(PCR/Quotation p66) · Tech Data(p15~16) · 구매 요청(p51) 의 **순수 함수**.
 *
 * 규칙 하나: 입력은 **BOM 스냅샷**뿐이다. 여기서는 원가를 다시 계산하지 않고, 카탈로그를
 * 다시 읽지 않는다. 스냅샷에 없는 것은 만들어 내지 않고 거부한다.
 * (DB·세션을 모른다 — 그래서 단위 테스트가 된다.)
 */
import type { LaborBasis } from "./bom";
import { graphSvg, type OutputDataValue, type GraphSnap } from "../output-template";
import { renderLayoutPage, LAYOUT_CSS, SIGNATURE_HTML, type LayoutElement } from "../print-layout";
import { buildPcrDetail, salePrice, type PcrDetail, type PcrRules } from "../pcr";

export interface SnapshotLike {
  id: string;
  code: string;
  slots: unknown;
  macroValue: number | null;
  macroId: string | null;
  macroRevision: number | null;
  macroDsl: string | null;
  catalogFp: string;
  codeRevisionId: string | null;
  lines: unknown;
  cost: unknown;
  /** 0011 스냅샷 치수(W·H·L) — H6 Output 항목이 읽는다 */
  dims?: unknown;
}

export interface ProjectLike {
  projectNo: string;
  name: string;
  clientName: string | null;
}

export type Refusal = { ok: false; status: number; error: string };

/** 스냅샷이 어디서 왔는지 — 모든 문서 발치에 그대로 찍힌다(P6 추적의 재료). */
export interface SourceStamp {
  runId: string;
  catalogFp: string;
  codeRevisionId: string | null;
  macroRevision: number | null;
}
const stampOf = (run: SnapshotLike): SourceStamp => ({
  runId: run.id, catalogFp: run.catalogFp, codeRevisionId: run.codeRevisionId, macroRevision: run.macroRevision,
});

/**
 * 번호의 가운데 — p51 은 Project No. OR-61313-5 에 PR-61313-2 · PO-61313-2 를,
 * p66 은 QR-61216-01 을 쓴다: 프로젝트 번호의 머리글자와 끝 순번을 뗀 가운데 토막이다.
 * 프로젝트에 묶이지 않은 실행은 '0' (번호는 나오되 프로젝트를 지어내지 않는다).
 */
export function noCoreOf(projectNo: string | null | undefined): string {
  if (!projectNo) return "0";
  const parts = projectNo.split("-").filter(Boolean);
  if (parts.length >= 3) return parts.slice(1, -1).join("-");
  if (parts.length === 2) return parts[1]!;
  return parts[0] ?? "0";
}

/* ───────────── 견적 (p66) ───────────── */

export interface CostLike { material: number; labor: number; overhead: number; total: number; currency?: string; laborBasis?: LaborBasis }

function costOf(run: SnapshotLike): CostLike | null {
  const c = run.cost as Partial<CostLike> | null;
  if (!c || typeof c !== "object") return null;
  for (const k of ["material", "labor", "overhead", "total"] as const)
    if (typeof c[k] !== "number" || !Number.isFinite(c[k])) return null;
  return c as CostLike;
}

export interface QuotationOptions {
  qty?: number;
  deliveryTerms?: string;
  paymentTerms?: string;
  validity?: string;
  warranty?: string;
  /** ccmd M · p66 PCR 요율표(파일에서 읽은 것 · 지문 포함). 없으면 PCR 세부 없이 나간다. */
  pcrRules?: { fingerprint: string; file: string; rules: PcrRules };
}

export interface QuotationBody {
  kind: "quotation";
  docNo: string;
  rev: string;
  date: string;
  project: ProjectLike | null;
  code: string;
  /** p66 PCR(Table): Material Cost + Manufacturing Cost = Direct Cost → Full cost */
  pcr: { material: number; manufacturing: number; directCost: number; overhead: number; fullCost: number; currency: string };
  /** p66 Quotation 표: 장비 번호 · 수량 · 단가 · 합계 */
  items: { no: number; equipment: string; qty: number; unitPrice: number; amount: number }[];
  totalQty: number;
  total: number;
  vat: "별도";
  terms: { delivery: string; payment: string; validity: string; warranty: string };
  source: SourceStamp;
  /** ccmd E · p67 — 이 스냅샷 원가의 단가 출처(줄 수). 출처가 박힌 스냅샷(단가 이력 연결 이후)에만 있다. */
  priceBasis?: { history: number; relationship: number; mismatch: number; dates: string[] };
  /** F10 · p66 · p67 — 인건비(Manufacturing Cost)를 어떻게 셌는지. 스냅샷 cost.laborBasis 를 그대로 옮긴다. 옛 스냅샷엔 없다. */
  laborBasis?: LaborBasis;
  /** F10 · p67 [견적 적용 Table] — Code No · Price · Supplier · Price table(견적/구매). 스냅샷 줄 그대로, Σ 금액 = PCR Material Cost. */
  applied?: AppliedRow[];
  /** ccmd M · p66 PCR 세부(Business Type 열) — 만들 때의 요율표로 편 표(판 · 지문). 옛 견적엔 없다. */
  pcrDetail?: PcrDetail;
  /** ccmd M-1 · 견적 단가 = 스냅샷 원가(costUnit) × (1 + pct/100). 요율표가 있을 때만(없으면 단가 = 원가 · 옛 견적). */
  margin?: { pct: number; costUnit: number; unitPrice: number; file: string; fingerprint: string; sample: string };
}

export interface AppliedRow { no: number; code: string; part: string; qty: number; unitPrice: number; amount: number; supplier: string; table: "견적" | "구매"; note: string }

/**
 * p67 견적 적용 Table — 스냅샷 줄의 단가와 출처. 단가 이력(구매 이력 Table)에서 왔으면 "구매",
 * 코드 관계값(견적 Table)이면 "견적". 다시 계산하지 않는다 — 줄에 박힌 unitCost · priceSource 만 읽는다.
 */
function appliedOf(run: SnapshotLike): AppliedRow[] | null {
  type L = { no?: number; childCode?: string; part?: string; qty?: number; unitCost?: number; supplier?: string | null;
    priceSource?: { kind?: string; effectiveFrom?: string; supplier?: string } };
  const raw = Array.isArray(run.lines) ? (run.lines as L[]) : [];
  if (!raw.length || !raw.every((l) => typeof l.childCode === "string" && typeof l.qty === "number" && typeof l.unitCost === "number")) return null;
  return raw.map((l, i) => {
    const ps = l.priceSource;
    const fromHistory = ps?.kind === "history";
    return {
      no: l.no ?? i + 1, code: l.childCode!, part: l.part ?? "", qty: l.qty!, unitPrice: l.unitCost!, amount: l.qty! * l.unitCost!,
      supplier: (fromHistory && ps?.supplier) || l.supplier || "",
      table: fromHistory ? "구매" : "견적",
      note: fromHistory ? `구매 이력 ${ps?.effectiveFrom ?? ""}` : ps?.kind === "currency-mismatch" ? "통화 불일치 — 관계값" : "코드 관계값",
    };
  });
}

/** 스냅샷 줄에 박힌 단가 출처를 센다 — 다시 계산하지 않는다. 출처가 없는 옛 스냅샷이면 null. */
function priceBasisOf(run: SnapshotLike): QuotationBody["priceBasis"] | null {
  const raw = Array.isArray(run.lines) ? (run.lines as { priceSource?: { kind?: string; effectiveFrom?: string } }[]) : [];
  if (!raw.some((l) => l.priceSource)) return null;
  const k = (x: string) => raw.filter((l) => l.priceSource?.kind === x).length;
  const dates = [...new Set(raw.map((l) => l.priceSource?.effectiveFrom).filter((d): d is string => !!d))].sort();
  return { history: k("history"), relationship: k("relationship"), mismatch: k("currency-mismatch"), dates };
}

export function buildQuotationBody(
  run: SnapshotLike, project: ProjectLike | null, opts: QuotationOptions,
  docNo: string, rev: string, date: string,
): { ok: true; body: QuotationBody } | Refusal {
  const cost = costOf(run);
  if (!cost) return { ok: false, status: 422, error: "이 BOM 스냅샷에는 원가가 없습니다 — BOM Run 을 다시 실행하세요." };
  const qty = opts.qty ?? 1;
  if (!Number.isInteger(qty) || qty < 1 || qty > 9999)
    return { ok: false, status: 400, error: "수량은 1~9999 의 정수여야 합니다." };
  // 원가 = 스냅샷에 저장된 cost.total **그대로**(여기서 다시 세지 않는다).
  // ccmd M-1(회장님 결정) — 견적 단가 = 그 원가 × (1 + 요율표 마진율). 요율표가 없으면 마진 0 = 원가 그대로.
  const marginPct = opts.pcrRules?.rules.marginPct ?? 0;
  const unitPrice = salePrice(cost.total, marginPct);
  const amount = unitPrice * qty;
  return {
    ok: true,
    body: {
      kind: "quotation", docNo, rev, date, project, code: run.code,
      pcr: {
        material: cost.material, manufacturing: cost.labor, directCost: cost.material + cost.labor,
        overhead: cost.overhead, fullCost: cost.total, currency: cost.currency ?? "KRW",
      },
      items: [{ no: 1, equipment: run.code, qty, unitPrice, amount }],
      totalQty: qty, total: amount, vat: "별도",
      terms: {
        delivery: opts.deliveryTerms ?? "", payment: opts.paymentTerms ?? "",
        validity: opts.validity ?? "", warranty: opts.warranty ?? "",
      },
      source: stampOf(run),
      ...(priceBasisOf(run) ? { priceBasis: priceBasisOf(run)! } : {}),
      ...(cost.laborBasis ? { laborBasis: cost.laborBasis } : {}),
      ...(appliedOf(run) ? { applied: appliedOf(run)! } : {}),
      ...(opts.pcrRules ? { pcrDetail: buildPcrDetail({ material: cost.material * qty, labor: cost.labor * qty, contract: amount }, opts.pcrRules.rules, opts.pcrRules) } : {}),
      ...(opts.pcrRules ? { margin: { pct: marginPct, costUnit: cost.total, unitPrice, file: opts.pcrRules.file, fingerprint: opts.pcrRules.fingerprint, sample: opts.pcrRules.rules.sample } } : {}),
    },
  };
}

/* ───────────── Tech Data (p15~16) ───────────── */

export interface TechDataBody {
  kind: "techdata";
  docNo: string;
  rev: string;
  date: string;
  project: ProjectLike | null;
  code: string;
  /** p16 Input Data — 이 실행에 들어간 코드 슬롯 값 */
  input: { key: string; value: string }[];
  /** 0022 · p16 Input Data 템플릿 값(온도·습도 …) — 만들 때의 스냅샷. 템플릿이 없으면 없다. */
  inputData?: InputDataValue[];
  /** 그 값을 낸 승인 매크로 — 개정과 원문을 함께 박는다 */
  macro: { id: string; revision: number; dsl: string };
  /** p16 Output Data */
  output: { name: string; value: number };
  /** H6 · 0029 Output Data 템플릿 값 — 만들 때의 스냅샷(출처: 승인 매크로 결과 · 스냅샷 값). 템플릿이 없으면 없다. */
  outputData?: OutputDataValue[];
  /** H6 · 그래프(그래프 전용 data 점 + 표시선 값) — 만들 때의 스냅샷 */
  graphs?: GraphSnap[];
  source: SourceStamp;
}

export interface InputDataValue { key: string; label: string; unit: string; value: number }
export interface InputItemDef { key: string; label: string; unit: string; defaultValue: number | null; minValue: number | null; maxValue: number | null }

/**
 * 0022 · 템플릿 항목에 보낸 값을 맞춘다. 안 보낸 항목은 기본값, 기본값도 없으면 거부.
 * 범위를 벗어나거나 템플릿에 없는 키를 보내면 거부(400) — 문서에 근거 없는 숫자가 들어가지 않게.
 */
export function resolveInputData(defs: InputItemDef[], raw: unknown): { ok: true; values: InputDataValue[] } | Refusal {
  const given = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  if (raw !== undefined && raw !== null && (typeof raw !== "object" || Array.isArray(raw))) return { ok: false, status: 400, error: "inputData 는 { key: 수 } 객체" };
  const unknown = Object.keys(given).filter((k) => !defs.some((d) => d.key === k));
  if (unknown.length) return { ok: false, status: 400, error: `Input Data 템플릿에 없는 항목: ${unknown.join(", ")}` };
  const values: InputDataValue[] = [];
  for (const d of defs) {
    const v = given[d.key];
    const n = v === undefined || v === "" || v === null ? d.defaultValue : Number(v);
    if (n === null) return { ok: false, status: 400, error: `Input Data 값 필요: ${d.label}` };
    if (!Number.isFinite(n)) return { ok: false, status: 400, error: `Input Data 는 수: ${d.label}` };
    if ((d.minValue !== null && n < d.minValue) || (d.maxValue !== null && n > d.maxValue))
      return { ok: false, status: 400, error: `${d.label} ${n}${d.unit} 은 범위 밖 (${d.minValue ?? "−∞"} ~ ${d.maxValue ?? "∞"})` };
    values.push({ key: d.key, label: d.label, unit: d.unit, value: n });
  }
  return { ok: true, values };
}

export function buildTechDataBody(
  run: SnapshotLike, project: ProjectLike | null, docNo: string, rev: string, date: string, inputData: InputDataValue[] = [],
  extra: { outputData?: OutputDataValue[]; graphs?: GraphSnap[] } = {},
): { ok: true; body: TechDataBody } | Refusal {
  if (run.macroValue === null || !Number.isFinite(run.macroValue))
    return { ok: false, status: 422, error: "이 BOM 스냅샷은 승인 매크로 없이 실행됐습니다 — Tech Data 로 낼 결과값이 없습니다." };
  if (!run.macroId || run.macroRevision === null || !run.macroDsl)
    return { ok: false, status: 422, error: "이 BOM 스냅샷에는 매크로 개정 기록이 없습니다(P4-b 이전 실행) — BOM Run 을 다시 실행하세요." };
  const slots = (run.slots && typeof run.slots === "object" ? run.slots : {}) as Record<string, unknown>;
  const input = Object.keys(slots).sort()
    .filter((k) => typeof slots[k] === "string" && slots[k] !== "")
    .map((k) => ({ key: k, value: String(slots[k]) }));
  return {
    ok: true,
    body: {
      kind: "techdata", docNo, rev, date, project, code: run.code, input,
      ...(inputData.length > 0 ? { inputData } : {}),
      macro: { id: run.macroId, revision: run.macroRevision, dsl: run.macroDsl },
      output: { name: "Macro result", value: run.macroValue },
      ...(extra.outputData && extra.outputData.length > 0 ? { outputData: extra.outputData } : {}),
      ...(extra.graphs && extra.graphs.length > 0 ? { graphs: extra.graphs } : {}),
      source: stampOf(run),
    },
  };
}

/* ───────────── 구매 요청 (p51) ───────────── */

export interface PurchaseLine {
  bomLineNo: number; childCode: string; resolvedCode: string;
  part: string; spec: string; qty: number; unit: string; unitPrice: number;
  /** p32·p51 — 스냅샷 줄에 박힌 공급처. 지금 카탈로그를 다시 읽지 않는다(0011 원칙). */
  supplier: string | null;
}

/**
 * 스냅샷 줄 중 **그때 `purchase` 로 등록돼 있던** 줄만 모은다. 줄에 kind 가 없는
 * 스냅샷(P4-b 이전 실행)은 지금 카탈로그로 짐작해 채우지 않고 거부한다.
 */
export function purchaseLinesOf(run: SnapshotLike): { ok: true; lines: PurchaseLine[] } | Refusal {
  const raw = Array.isArray(run.lines) ? (run.lines as Record<string, unknown>[]) : [];
  if (raw.length === 0) return { ok: false, status: 422, error: "이 BOM 스냅샷에는 줄이 없습니다." };
  if (raw.some((l) => typeof l.kind !== "string"))
    return { ok: false, status: 422, error: "이 BOM 스냅샷의 줄에는 품목 종류가 없습니다(P4-b 이전 실행) — BOM Run 을 다시 실행하세요." };
  const lines = raw.filter((l) => l.kind === "purchase").map((l) => ({
    bomLineNo: Number(l.no), childCode: String(l.childCode), resolvedCode: String(l.resolvedCode ?? l.childCode),
    part: String(l.part), spec: String(l.spec ?? ""), qty: Number(l.qty), unit: String(l.unit ?? ""), unitPrice: Number(l.unitCost),
    supplier: typeof l.supplier === "string" && l.supplier ? l.supplier : null,
  }));
  if (lines.length === 0) return { ok: false, status: 422, error: "이 BOM 스냅샷에는 구매 품목이 없습니다." };
  return { ok: true, lines };
}

export interface PrForCsv {
  prNo: string; poNo: string | null; projectNo: string | null; bomRunId: string; code: string; status: string;
  lines: { lineNo: number; resolvedCode: string; part: string; spec: string; qty: number; unit: string; supplier: string | null; requiredDate: Date | string | null; unitPrice: number }[];
}

const PROCESS_LABEL: Record<string, string> = { draft: "작성중", rfq: "견적 요청", ordered: "발주" };

/** 셀 하나. 엑셀이 수식으로 읽을 머리글자(= + - @)는 작은따옴표로 죽인다. */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const dateOf = (d: Date | string | null): string => (d ? (d instanceof Date ? d.toISOString() : d).slice(0, 10) : "");

/** p51 BOM List 열 순서 그대로. 맨 앞 BOM(\uFEFF)은 엑셀이 한글을 깨뜨리지 않게 하려는 것. */
export function prToCsv(pr: PrForCsv): string {
  const head = ["PR No", "PO No", "Project No", "BOM No", "Product Code", "Process", "Item", "Code", "Part", "Spec", "Qty", "Unit", "Supplier", "Required date", "Price", "Amount"];
  const rows = pr.lines.map((l) => [
    pr.prNo, pr.poNo ?? "", pr.projectNo ?? "", pr.bomRunId, pr.code, PROCESS_LABEL[pr.status] ?? pr.status,
    l.lineNo, l.resolvedCode, l.part, l.spec, l.qty, l.unit, l.supplier ?? "", dateOf(l.requiredDate), l.unitPrice, l.qty * l.unitPrice,
  ]);
  return "\uFEFF" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/* ───────────── 인쇄본 (흰 A4) ───────────── */

const esc = (v: unknown): string =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const won = (n: number): string => n.toLocaleString("ko-KR");
const STATUS_LABEL: Record<string, string> = { draft: "작성중", review: "검토", approved: "승인", issued: "발행" };

const PRINT_CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #14202b; font: 12.5px/1.55 "Pretendard", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif; }
.sheet { max-width: 182mm; margin: 0 auto; padding: 10mm 0; }
.top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #14202b; padding-bottom: 6px; }
.top h1 { margin: 0; font-size: 22px; letter-spacing: 6px; }
.meta { font-size: 11px; color: #44525f; text-align: right; }
.mono { font-family: "JetBrains Mono", Consolas, monospace; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #9aa7b3; padding: 5px 8px; text-align: left; vertical-align: top; }
th { background: #eef2f5; font-weight: 600; white-space: nowrap; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
.amount { font-size: 18px; font-weight: 700; color: #0e7c6b; }
h2 { font-size: 13px; margin: 18px 0 0; }
.foot { margin-top: 16px; padding-top: 6px; border-top: 1px solid #9aa7b3; font-size: 10.5px; color: #44525f; word-break: break-all; }
.status { display: inline-block; border: 1px solid #14202b; padding: 1px 8px; font-size: 11px; }
pre { margin: 0; white-space: pre-wrap; word-break: break-all; font: 11.5px/1.5 "JetBrains Mono", Consolas, monospace; }
@media print { .noprint { display: none; } }
`;

function footOf(s: SourceStamp): string {
  return `<div class="foot">근거 — BOM 스냅샷 <span class="mono">${esc(s.runId)}</span> · 카탈로그 지문 <span class="mono">${esc(s.catalogFp)}</span>`
    + ` · 코드 개정 <span class="mono">${esc(s.codeRevisionId ?? "—")}</span> · 매크로 개정 <span class="mono">${s.macroRevision === null ? "—" : `r${s.macroRevision}`}</span>`
    + `<br>이 문서의 숫자는 위 스냅샷에 저장된 값을 그대로 옮긴 것이며, 문서를 만들 때 다시 계산하지 않았습니다.</div>`;
}

function quotationHtml(b: QuotationBody): string {
  const p = b.project;
  return `<h2>PCR · Pre-Calculation Report</h2>
<table data-testid="pcr-table">
<tr><th>Material Cost</th><td class="n">${won(b.pcr.material)}</td><th>Manufacturing Cost</th><td class="n">${won(b.pcr.manufacturing)}</td></tr>
<tr><th>Direct Cost</th><td class="n">${won(b.pcr.directCost)}</td><th>Overhead</th><td class="n">${won(b.pcr.overhead)}</td></tr>
<tr><th>Full cost</th><td class="n" colspan="3" data-testid="pcr-full">${won(b.pcr.fullCost)} ${esc(b.pcr.currency)}</td></tr>
</table>
<h2>Quotation · 견적서</h2>
<table>
<tr><th>공사명</th><td>${esc(p?.name ?? "—")}</td><th>견적번호</th><td class="mono">${esc(b.docNo)} · Rev ${esc(b.rev)}</td></tr>
<tr><th>고객</th><td>${esc(p?.clientName ?? "—")}</td><th>견적일자</th><td>${esc(b.date)}</td></tr>
<tr><th>견적 금액</th><td><span class="amount" data-testid="quote-total">${won(b.total)}</span> ${esc(b.pcr.currency)} <small>[VAT ${esc(b.vat)}]</small></td><th>Project No.</th><td class="mono">${esc(p?.projectNo ?? "—")}</td></tr>
<tr><th>납품조건</th><td>${esc(b.terms.delivery || "—")}</td><th>유효기간</th><td>${esc(b.terms.validity || "—")}</td></tr>
<tr><th>지급조건</th><td>${esc(b.terms.payment || "—")}</td><th>보증기간</th><td>${esc(b.terms.warranty || "—")}</td></tr>
</table>
<table>
<tr><th>No</th><th>장비 번호</th><th class="n">수량</th><th class="n">단가</th><th class="n">합계</th><th>비고</th></tr>
${b.items.map((i) => `<tr><td>${i.no}</td><td class="mono">${esc(i.equipment)}</td><td class="n">${i.qty}</td><td class="n">${won(i.unitPrice)}</td><td class="n">${won(i.amount)}</td><td></td></tr>`).join("")}
<tr><th colspan="2">합계</th><td class="n">${b.totalQty}</td><td></td><td class="n"><b>${won(b.total)}</b></td><td></td></tr>
</table>
${b.margin ? `<p data-testid="quote-margin" style="font-size:11px;color:#555">견적 단가 = 스냅샷 원가 ${won(b.margin.costUnit)} × (1 + 마진율 ${b.margin.pct}%) = ${won(b.margin.unitPrice)} · 마진율 출처 ${esc(b.margin.file)} #${esc(b.margin.fingerprint)}${b.margin.sample ? ' <span data-testid="margin-sample" style="font-weight:700;color:#b45309">샘플 마진율</span>' : ""}</p>` : ""}
${b.priceBasis ? `<p data-testid="price-basis" style="font-size:11px;color:#555">단가 기준: 스냅샷 시점 유효 단가 — 단가 이력 ${b.priceBasis.history}줄${b.priceBasis.dates.length ? `(유효일 ${esc(b.priceBasis.dates.join(", "))})` : ""} · 코드 관계값 ${b.priceBasis.relationship}줄${b.priceBasis.mismatch ? ` · 통화 불일치로 관계값 ${b.priceBasis.mismatch}줄` : ""}</p>` : ""}
${b.laborBasis ? `<p data-testid="labor-basis" style="font-size:11px;color:#555">${laborBasisText(b.laborBasis)}</p>` : ""}
${b.applied ? `<h2>견적 적용 Table</h2>
<table data-testid="applied-table">
<tr><th>No</th><th>Code No.</th><th>품목</th><th class="n">수량</th><th class="n">Price</th><th class="n">금액</th><th>Supplier</th><th>Price table</th><th>비고</th></tr>
${b.applied.map((a) => `<tr><td>${a.no}</td><td class="mono">${esc(a.code)}</td><td>${esc(a.part)}</td><td class="n">${a.qty}</td><td class="n">${won(a.unitPrice)}</td><td class="n">${won(a.amount)}</td><td>${esc(a.supplier || "—")}</td><td>${a.table}</td><td>${esc(a.note)}</td></tr>`).join("")}
<tr><th colspan="5">합계 = PCR Material Cost</th><td class="n"><b>${won(b.applied.reduce((x, a) => x + a.amount, 0))}</b></td><td colspan="3"></td></tr>
</table>` : ""}
${b.pcrDetail ? pcrDetailHtml(b.pcrDetail, b.pcr.currency) : ""}`;
}

/** ccmd M · p66 PCR(Table) — Business Type 열마다. 샘플 요율표면 표지를 단다. */
function pcrDetailHtml(d: PcrDetail, cur: string): string {
  const cells = (v: number[]) => v.map((x) => `<td class="n">${won(x)}</td>`).join("");
  const row = (label: string, v: number[], basis = "", strong = false) =>
    `<tr${strong ? ' style="font-weight:700"' : ""}><td>${label}</td>${cells(v)}<td style="font-size:10px;color:#666">${esc(basis)}</td></tr>`;
  return `<h2>PCR 세부 · Business Type${d.sample ? ' <span data-testid="pcr-sample" style="font-size:11px;font-weight:700;color:#b45309;border:1px solid #b45309;border-radius:3px;padding:0 4px">샘플</span>' : ""}</h2>
<table data-testid="pcr-detail" data-types="${d.businessTypes.length}">
<tr><th>Business Type</th>${d.businessTypes.map((t) => `<th class="n">${esc(t)}</th>`).join("")}<th>근거</th></tr>
${row("<b>Sales price · Contract Amount</b>", Array(d.businessTypes.length).fill(d.contract), "이 견적서 금액(스냅샷 원가 그대로)", true)}
${d.sections.filter((s) => s.group === "direct").map((s) => `<tr><th colspan="${d.businessTypes.length + 2}" style="text-align:left">${esc(s.name)}</th></tr>${s.rows.map((r) => row(`&nbsp;&nbsp;${esc(r.label)}`, r.values, r.basis)).join("")}`).join("")}
${row("Direct costs total", d.directTotal, "Σ 위 구역", true)}
${row("Contribution margin", d.contribution, "견적 금액 − Direct")}
${d.sections.filter((s) => s.group === "sna").map((s) => `<tr><th colspan="${d.businessTypes.length + 2}" style="text-align:left">${esc(s.name)}</th></tr>${s.rows.map((r) => row(`&nbsp;&nbsp;${esc(r.label)}`, r.values, r.basis)).join("")}`).join("")}
${row("Full costs", d.fullCost, "Direct + Sales & Adm.", true)}
<tr style="font-weight:700" data-testid="pcr-ebit"><td>EBIT</td>${cells(d.ebit)}<td style="font-size:10px;color:#666">견적 금액 − Full costs</td></tr>
</table>
<p data-testid="pcr-rules-stamp" style="font-size:11px;color:#555">요율표 ${esc(d.file)} · 판 ${esc(d.version)} · 지문 <span class="mono">${esc(d.fingerprint)}</span> · 마진율 ${d.marginPct ?? 0}% · 통화 ${esc(cur)}${d.sample ? ` — ${esc(d.sample)}` : ""}</p>`;
}

/** 인쇄본의 인건비 기준 한 줄(HTML 이스케이프됨) — 스냅샷에 박힌 laborBasis 를 글로 옮긴다. */
export function laborBasisText(lb: LaborBasis): string {
  if (lb.kind === "ratio") return `인건비 기준: 재료비 × ${Math.round(lb.ratio * 100)}% (제조 정보 표 미등록)`;
  const parts = lb.rows.map((r) => `${esc(r.process)}${r.equipment ? `(${esc(r.equipment)})` : ""} ${r.hours}h × ${won(r.rate)}`);
  return `인건비 기준: 제조 정보 표(${esc(lb.productCode)}) — ${parts.join(" · ")} = ${won(lb.rows.reduce((a, r) => a + r.amount, 0))}`;
}

function techDataHtml(b: TechDataBody): string {
  return `<h2>Input Data</h2>
<table><tr><th>Project</th><td>${esc(b.project ? `${b.project.projectNo} · ${b.project.name}` : "—")}</td><th>Document Code</th><td class="mono">${esc(b.code)}</td></tr></table>
<table data-testid="techdata-input"><tr>${b.input.map((i) => `<th>${esc(i.key)}</th>`).join("")}</tr><tr>${b.input.map((i) => `<td class="mono">${esc(i.value)}</td>`).join("")}</tr></table>
${b.inputData && b.inputData.length > 0 ? `<table data-testid="techdata-inputdata"><tr>${b.inputData.map((i) => `<th>${esc(i.label)}</th>`).join("")}</tr><tr>${b.inputData.map((i) => `<td class="mono" data-key="${esc(i.key)}">${esc(i.value)} ${esc(i.unit)}</td>`).join("")}</tr></table>` : ""}
<h2>Macro · 승인 개정 r${b.macro.revision}</h2>
<table><tr><th>Macro id</th><td class="mono">${esc(b.macro.id)}</td></tr><tr><th>Coding</th><td><pre data-testid="techdata-dsl">${esc(b.macro.dsl)}</pre></td></tr></table>
<h2>Output Data</h2>
<table><tr><th>${esc(b.output.name)}</th><td class="n"><span class="amount" data-testid="techdata-value">${esc(Math.round(b.output.value * 1000) / 1000)}</span></td></tr></table>
${techOutputHtml(b)}`;
}

/** H6 Output 표 — 없으면 빈 글자 */
function techOutputHtml(b: TechDataBody): string {
  return `${b.outputData && b.outputData.length > 0 ? `<table data-testid="techdata-outputdata"><tr>${b.outputData.map((o) => `<th>${esc(o.label)}</th>`).join("")}</tr><tr>${b.outputData.map((o) => `<td class="mono" data-key="${esc(o.key)}">${o.value === null ? `<span style="color:#b45309">${esc(o.note ?? "없음")}</span>` : `${esc(Math.round(o.value * 1000) / 1000)} ${esc(o.unit)}`}</td>`).join("")}</tr></table>` : ""}
`;
}

/** H6 그래프 — 없으면 빈 글자. 기본 인쇄본은 표 뒤에, 양식(H9)에서는 그래프 요소 자리에 */
function techGraphsHtml(b: TechDataBody): string {
  return b.graphs && b.graphs.length > 0 ? `<h2>Graph</h2>${b.graphs.map((g) => `<figure data-testid="techdata-graph" data-name="${esc(g.name)}" style="margin:6px 0"><figcaption style="font-size:12px;font-weight:600">${esc(g.name)}</figcaption>${graphSvg(g)}</figure>`).join("")}` : "";
}

/** p48 Print Set-up — 모양만 바꾸는 CSS. 숫자·내용은 그대로다(스냅샷에서 옮긴 body 를 다시 계산하지 않는다). */
const PAPER_MM: Record<string, [number, number]> = { A4: [210, 297], A3: [297, 420], Letter: [216, 279] };
export interface PrintLook { paper: string; orientation: "portrait" | "landscape"; marginMm: number; font: string; fontSizePx: number; color: "color" | "mono"; header: string; footer: string; watermark: string }
function setupCss(p: PrintLook): string {
  const [w, h] = PAPER_MM[p.paper] ?? PAPER_MM.A4!;
  const width = p.orientation === "landscape" ? h : w;
  return `
@page { size: ${p.paper} ${p.orientation}; margin: ${p.marginMm}mm; }
body { font-family: "${p.font}", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif; font-size: ${p.fontSizePx}px; }
.sheet { max-width: ${width - 2 * p.marginMm}mm; }
${p.color === "mono" ? "html { filter: grayscale(1); }" : ""}
.ph, .pf { font-size: 10.5px; color: #44525f; }
.ph { border-bottom: 1px solid #9aa7b3; padding-bottom: 4px; margin-bottom: 8px; }
.pf { border-top: 1px solid #9aa7b3; padding-top: 4px; margin-top: 10px; text-align: center; }
.wm { position: fixed; left: 50%; top: 45%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 84px; font-weight: 800; color: #14202b; opacity: .07; white-space: nowrap; pointer-events: none; z-index: 0; }
`;
}

/** H9 · 0030 인쇄 양식(버전 · 요소 배치) + 그 스냅샷으로 뜬 도면 SVG(있으면). 양식이 없으면 기존 인쇄본 그대로. */
export interface PrintLayoutUse { version: number; elements: LayoutElement[]; pinned: boolean; drawingSvg?: string | null }

/** E7 · p48 — 인쇄본 상단 "Word · Excel"(같은 body 를 .docx · .xlsx 로). viewer 에게는 버튼이 없다(API 도 403). */
function exportBar(id: string): string {
  const a = (f: string, label: string) => `<a data-testid="export-${f}" href="/api/documents/${encodeURIComponent(id)}/export?format=${f}" download style="display:inline-block;margin-left:6px;padding:3px 10px;border:1px solid #9aa7b3;border-radius:4px;color:#14202b;text-decoration:none;font-size:12px">${label}</a>`;
  return `<p class="noprint" data-testid="export-bar" style="margin:0 0 8px;text-align:right;font-size:12px;color:#44525f">내려받기${a("docx", "Word")}${a("xlsx", "Excel")}</p>`;
}

export function renderDocumentHtml(doc: { docNo: string; currentRev: string; status: string; docType: string; body: unknown }, look?: PrintLook, layout?: PrintLayoutUse, opts?: { exportId?: string }): string {
  const b = doc.body as QuotationBody | TechDataBody;
  const title = b.kind === "quotation" ? "견 적 서" : "TECH DATA";
  const inner = layout ? layoutInner(doc, b, title, layout) : b.kind === "quotation" ? quotationHtml(b) : `${techDataHtml(b)}${techGraphsHtml(b)}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.docNo)} Rev ${esc(doc.currentRev)}</title><style>${PRINT_CSS}${layout ? LAYOUT_CSS : ""}${look ? setupCss(look) : ""}</style></head><body${look ? ` data-print-setup="${esc(`${look.paper}-${look.orientation}-${look.color}`)}"` : ""}>${look?.watermark ? `<div class="wm" data-testid="print-watermark">${esc(look.watermark)}</div>` : ""}<div class="sheet">
${opts?.exportId ? exportBar(opts.exportId) : ""}${look?.header ? `<div class="ph" data-testid="print-header">${esc(look.header)}</div>` : ""}<div class="top"><h1>${title}</h1><div class="meta"><span class="mono">${esc(doc.docNo)}</span> · Rev ${esc(doc.currentRev)} · <span class="status" data-testid="doc-status">${esc(STATUS_LABEL[doc.status] ?? doc.status)}</span><br>${esc(b.date)}</div></div>
${inner}
${footOf(b.source)}
${look?.footer ? `<div class="pf" data-testid="print-footer">${esc(look.footer)}</div>` : ""}<p class="noprint" style="margin-top:14px"><button onclick="window.print()">인쇄 / PDF 저장</button></p>
</div></body></html>`;
}

/** H9 · 양식 쪽 — 요소 종류마다 body(스냅샷)의 한 조각을 넣는다. 숫자는 다시 세지 않는다. */
function layoutInner(doc: { docNo: string; currentRev: string; status: string }, b: QuotationBody | TechDataBody, title: string, layout: PrintLayoutUse): string {
  const p = b.project;
  const fields = `<table data-testid="print-fields"><tr><th>Document</th><td class="mono">${esc(doc.docNo)} · Rev ${esc(doc.currentRev)}</td><th>Date</th><td>${esc(b.date)}</td></tr>`
    + `<tr><th>${b.kind === "quotation" ? "Customer" : "Project"}</th><td>${esc(b.kind === "quotation" ? p?.clientName ?? "—" : p ? `${p.projectNo} · ${p.name}` : "—")}</td><th>Code</th><td class="mono">${esc(b.code)}</td></tr></table>`;
  const parts = {
    title: `<h1>${title}</h1>`,
    fields,
    table: b.kind === "quotation" ? quotationHtml(b) : `${techDataHtml(b)}`,
    graph: b.kind === "techdata" ? techGraphsHtml(b) || undefined : undefined,
    drawing: layout.drawingSvg ? `<div data-testid="print-drawing">${layout.drawingSvg}</div>` : undefined,
    signature: SIGNATURE_HTML,
    logo: `<div class="lg">NOVA Solution</div>`,
  };
  return `<p class="noprint" style="font-size:11px;color:#667" data-testid="print-layout-note">인쇄 양식 v${layout.version}${layout.pinned ? " — 발행 때 박힌 버전(양식을 고쳐도 이 발행본은 그대로)" : " — 발행 전: 최신 양식을 따릅니다"}</p>`
    + renderLayoutPage(layout.version, layout.elements, parts);
}
