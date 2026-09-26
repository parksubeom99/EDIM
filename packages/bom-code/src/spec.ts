/**
 * ⑥ 사양 입력표 (청사진 p46 [Spec List in-put table] · "각각의 사양 입력").
 *
 * 회사가 제품 코드마다 "사양 항목"을 정의한다(이름 · 단위 · 어느 슬롯을 정하나 · 어디서 값을 읽나).
 * 사용자가 사양 값을 넣으면, **이미 등록된** Sub Code 값과 제품 표(Table 참조)에서 조건에 맞는 슬롯 값을 고른다.
 * 새 값을 만들지 않는다 — 추천은 등록된 값 중 하나이고, 저장은 기존 Code Builder 개정 저장 경로가 한다.
 *
 * 값 읽는 곳(source):
 *   item   : 슬롯 값 자체를 수로 읽는다(× scale). 예) 용량 B "25" × 1000 = 25,000 CMH
 *   table  : 제품 표의 한 열. 표의 행(Item)은 그 슬롯 값이어야 한다(표.by = 슬롯). 예) cap.M 가습량 kg/h
 *   choice : 슬롯 값을 그대로 고른다(재질 SS/AL 처럼 수가 아닌 것)
 * 연산(op): ge = 입력 이상 중 가장 작은 값 · le = 입력 이하 중 가장 큰 값 · eq = 같은 값.
 */
import type { Catalog, SlotKey, SlotValues, SubCode } from "./index";

export type SpecOp = "ge" | "le" | "eq";
export type SpecSource =
  | { kind: "item"; scale?: number; op: SpecOp }
  | { kind: "table"; table: string; col: string; op: SpecOp }
  | { kind: "choice" };

export interface SpecItemDef {
  key: string;
  label: string;
  unit: string;
  slot: SlotKey;
  source: SpecSource;
}

export interface SpecLine {
  key: string;
  label: string;
  slot: SlotKey;
  input: string;
  picked: string | null;
  /** 사람이 읽는 근거 한 줄 — 무엇을 비교해서 골랐나 */
  basis: string;
}

export interface SpecResult {
  slots: SlotValues;
  lines: SpecLine[];
  /** 조건을 모두 만족하는 등록값이 없는 슬롯 */
  unmet: SlotKey[];
}

const SLOT_RE = /^[A-F]$/;
const OPS: readonly SpecOp[] = ["ge", "le", "eq"];

/** 정의 한 개를 검사한다. 잘못이면 이유 문자열, 맞으면 null. (API 400 과 화면이 같은 규칙) */
export function specDefError(def: SpecItemDef, catalog: Catalog, productCode: string): string | null {
  if (!/^[a-z][a-z0-9_]{0,30}$/.test(def.key)) return "key 는 영문 소문자로 시작 · 소문자·숫자·_ 31자까지";
  if (!def.label.trim()) return "label 필수";
  if (!SLOT_RE.test(def.slot)) return "slot 은 A~F";
  const s = def.source as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return "source 필수";
  if (s.kind === "choice") return null;
  if (s.kind !== "item" && s.kind !== "table") return "source.kind 는 item · table · choice";
  if (!OPS.includes(s.op as SpecOp)) return "source.op 는 ge · le · eq";
  if (s.kind === "item") {
    if (s.scale !== undefined && !(typeof s.scale === "number" && Number.isFinite(s.scale) && s.scale > 0)) return "source.scale 은 양수";
    return null;
  }
  const product = catalog.productCodes.find((p) => p.code === productCode);
  const table = product?.tables[String(s.table ?? "")];
  if (!table) return `제품 ${productCode} 에 표 ${String(s.table)} 없음`;
  if (table.by !== def.slot) return `표 ${String(s.table)} 의 행은 슬롯 ${table.by} 값이다 — 사양의 슬롯(${def.slot})과 같아야 한다`;
  if (!table.cols.some((c) => c.key === s.col || c.name === s.col)) return `표 ${String(s.table)} 에 열 ${String(s.col)} 없음`;
  return null;
}

/** 제품 코드의 슬롯 후보 = 그 제품(A 값)이 속한 Sub Code 그룹의 등록값(순번 순). */
export function slotCandidates(catalog: Catalog, productCode: string, slot: SlotKey): SubCode[] {
  const head = catalog.subCodes.find((s) => s.itemKey === "A" && s.value === productCode);
  const group = head?.group;
  return catalog.subCodes
    .filter((s) => s.itemKey === slot && (group === undefined || s.group === group))
    .sort((a, b) => a.seq - b.seq);
}

function metric(catalog: Catalog, productCode: string, src: SpecSource, value: string): number | null {
  if (src.kind === "item") {
    const n = Number(value);
    return Number.isFinite(n) && value.trim() !== "" ? n * (src.scale ?? 1) : null;
  }
  if (src.kind === "table") {
    const table = catalog.productCodes.find((p) => p.code === productCode)?.tables[src.table];
    const col = table?.cols.find((c) => c.key === src.col || c.name === src.col);
    const cell = table?.rows.find((r) => r.item === value)?.cells[col?.key ?? ""];
    const n = typeof cell === "number" ? cell : Number(cell);
    return cell === undefined || cell === "" || !Number.isFinite(n) ? null : n;
  }
  return null;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * 사양 값 → 슬롯 추천. 같은 슬롯을 여러 사양이 가리키면 **모두** 만족하는 값 중에서 고른다
 * (첫 수치 사양이 ge 면 가장 작은 것, le 면 가장 큰 것 — 과잉 사양을 피한다).
 * 입력이 빈 사양은 건너뛴다. 현재 슬롯 값은 바꾸지 않은 슬롯에 그대로 남는다(호출하는 쪽이 합친다).
 */
export function recommendSlots(catalog: Catalog, productCode: string, defs: SpecItemDef[], inputs: Record<string, string>): SpecResult {
  const bySlot = new Map<SlotKey, SpecItemDef[]>();
  for (const d of defs) {
    const v = (inputs[d.key] ?? "").trim();
    if (v === "") continue;
    bySlot.set(d.slot, [...(bySlot.get(d.slot) ?? []), d]);
  }
  const slots: SlotValues = {};
  const lines: SpecLine[] = [];
  const unmet: SlotKey[] = [];
  for (const [slot, ds] of bySlot) {
    let cands = slotCandidates(catalog, productCode, slot).map((s) => s.value);
    for (const d of ds) {
      const v = inputs[d.key]!.trim();
      const src = d.source;
      if (src.kind === "choice") { cands = cands.filter((c) => c === v); continue; }
      const want = Number(v);
      cands = cands.filter((c) => {
        const m = metric(catalog, productCode, src, c);
        if (m === null || !Number.isFinite(want)) return false;
        return src.op === "ge" ? m >= want : src.op === "le" ? m <= want : m === want;
      });
    }
    const lead = ds.find((d) => d.source.kind !== "choice");
    if (lead && lead.source.kind !== "choice" && cands.length > 1) {
      const src = lead.source;
      cands = [...cands].sort((a, b) => (metric(catalog, productCode, src, a) ?? 0) - (metric(catalog, productCode, src, b) ?? 0));
      if (src.op === "le") cands.reverse();
    }
    const picked = cands[0] ?? null;
    if (picked === null) unmet.push(slot); else slots[slot] = picked;
    for (const d of ds) {
      const v = inputs[d.key]!.trim();
      const src = d.source;
      const m = picked !== null && src.kind !== "choice" ? metric(catalog, productCode, src, picked) : null;
      const opTxt = src.kind === "choice" ? "=" : src.op === "ge" ? "≥" : src.op === "le" ? "≤" : "=";
      const basis = picked === null
        ? `${d.label} ${v}${d.unit ? " " + d.unit : ""} — 조건을 만족하는 등록값 없음`
        : src.kind === "choice"
          ? `${slot} = ${picked}`
          : `${slot} = ${picked} → ${fmt(m ?? 0)}${d.unit ? " " + d.unit : ""} ${opTxt} ${fmt(Number(v))}`;
      lines.push({ key: d.key, label: d.label, slot, input: v, picked, basis });
    }
  }
  return { slots, lines, unmet };
}
