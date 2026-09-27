/**
 * @edim/bom-code — GAP1 "code-based BOM" engine (pure, no I/O, no LLM).
 *
 * Blueprint: EDIM.pdf p30–34 (BOM Code Set-Up). A BOM is not a hand-written
 * list: it is what falls out of three registrations —
 *   p31 Sub Code            the selectable values of each slot item (A..F)
 *   p33 Product Code        a code + its "Table 참조" tech tables, keyed by a slot
 *   p34 Code Relationship   parent → child rows (Child Group): qty · remarks ·
 *                           condition; "Part List Running Test" = pick slots → Run
 *
 * Numbers are never computed by formulas here. Every derived number is a
 * LOOKUP into a registered table by a slot value (the p32/p33 "Edit Table"
 * pattern). The only arithmetic is `ROUND(value × factor)` for a material
 * scale, so that a company's price/size tables can replace the sample rows
 * without touching code.
 */
export const BOM_CODE_PACKAGE = "@edim/bom-code" as const;

export type SlotKey = "A" | "B" | "C" | "D" | "E" | "F";
export type SlotValues = Partial<Record<SlotKey, string>>;
export type Cell = number | string;

/** p31 — one selectable value of one slot item. */
export interface SubCode {
  group: string;
  itemKey: SlotKey;
  itemName: string;
  seq: number;
  value: string;
  description: string;
}

/**
 * p32/p33 "Table 참조 / Edit Table" — the blueprint's own shape (unified 2026-09-19):
 *   numbered table (Table 1, Table 12 …) · lettered columns A, B, C … · Item rows.
 * ONE registered table serves both readers:
 *   BOM    `{cap.fanKw}` / `{cap.A}`  → row whose Item = the chosen value of slot `by`
 *   Macro  `Table1(A,4:4)`            → table no 1, column A, row NUMBERS 4..4 (1-based, in order)
 */
export interface TableColumn {
  /** column letter as the Macro addresses it: A, B, C … */
  key: string;
  /** short name used in BOM templates/refs, e.g. fanKw */
  name: string;
  /** 회사 말 이름 — shown in the editor and in the back-translation */
  label?: string;
}
export interface TableRow {
  /** the Item: a value of slot `by` ("" = the none choice) */
  item: string;
  cells: Record<string, Cell>; // by column key
}
export interface TechTable {
  /** the N of `TableN(...)` — unique within a product code */
  no: number;
  /**
   * p16/p51 "Table Type" — 같은 표 구조를 쓰되 **읽는 쪽**이 다르다.
   *   "tech" (기본) : BOM·Macro 가 `{표.열}` / `TableN(...)` 으로 읽는다
   *   "dim"         : 도면(P4-a)이 읽는 Key Dimension 표. 제품 코드당 1개.
   * 종류를 표에 붙이는 것이라 새 화면·새 테이블이 없다.
   */
  /**
   * tech = 기술 표(사양·원가 참조) · dim = Key Dimension(도면) ·
   * buy  = 구매 속성(p32 Material code & General purchase items — Supplier·V·Hz·IP·Insulation…) ·
   * rule = 설계 검증 규칙(p36·p60 Design Verification Tool · 코퍼스 "Design Tool Binding").
   *   buy 표는 슬롯으로 행을 고르지 않는 경우가 많아, 행이 하나면 그 행을 쓴다.
   */
  role?: "tech" | "dim" | "buy" | "rule";
  by: SlotKey;
  /** Item used when the slot is EMPTY (a chosen value without a row is an error) */
  default: string;
  cols: TableColumn[];
  rows: TableRow[];
}

export type Cond = { slot: SlotKey; eq: string } | { macro: true };

/**
 * Arrangement 방향 (청사진 p36 Fan Direction · 코퍼스 EDIM_ARRANGEMENT_…MODEL.md "Component Position Rule").
 * 좌/우 계열 × 0·90·180·270°. 미등록이면 방향 지정 없음(도면에 표기하지 않는다).
 */
export const DIRECTIONS = ["L0", "L90", "L180", "L270", "R0", "R90", "R180", "R270"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const isDirection = (v: unknown): v is Direction =>
  typeof v === "string" && (DIRECTIONS as readonly string[]).includes(v);

/**
 * Component 배치 규칙 (코퍼스 "Component Position Rule" · 청사진 p36).
 * 구획 안에서 부품이 어디에 놓이는지를 3×3 칸으로 적는다 — 앞·중·뒤 × 상·중·하.
 * mm 좌표가 아니라 **칸**인 이유: 지금 도면은 선과 글자 수준이고, 회사 실 CAD 규칙(기준점·기준면)이
 * 아직 안 들어왔다. 칸은 실 규칙이 들어와도 살아남는 최소 단위다.
 */
export const AT = ["front", "center", "rear"] as const;
export const LEVEL = ["top", "mid", "bottom"] as const;
export type At = (typeof AT)[number];
export type Level = (typeof LEVEL)[number];
export const isAt = (v: unknown): v is At => typeof v === "string" && (AT as readonly string[]).includes(v);
export const isLevel = (v: unknown): v is Level => typeof v === "string" && (LEVEL as readonly string[]).includes(v);

export interface ComponentPos {
  /** 배치 대상 부품 코드 — 그 구획의 BOM 자식이어야 한다(등록은 API 가 막는다) */
  code: string;
  at: At;
  level: Level;
}

export interface SectionDef {
  name: string;
  when?: Cond;
  /** Arrangement: 구획 길이(mm). 없으면 도면이 dim 표의 L 로 폴백한다. */
  len?: number;
  /** Arrangement 2차: 그 구획 Component 의 방향(p36). 없으면 미지정. */
  dir?: Direction;
  /** Arrangement 2차: 구획 안 부품 배치(p36 Component). 없으면 배치 규칙 없음 — 도면은 그리지 않는다. */
  components?: ComponentPos[];
}

/** Arrangement: 한 구획의 이름 + 길이(mm) + 방향. len 이 없으면 fallbackL 을 쓴다. */
export interface SectionDim {
  name: string;
  len: number;
  dir?: Direction;
  components?: ComponentPos[];
}

/** p33 — a registered code (product / part / purchased item). */
export interface ProductCode {
  code: string;
  name: string;
  kind: "product" | "part" | "purchase";
  category: string;
  unit: string;
  /** `{table.col}` placeholders · `{macro}` = rounded approved-macro value */
  specTemplate: string;
  materialTemplate: string;
  tables: Record<string, TechTable>;
  /** only on kind=product: section order of the unit */
  sections?: SectionDef[];
}

export type QtyBind = { lit: number } | { ref: string };
export type CostBind = ({ lit: number } | { ref: string }) & { scale?: string };

/** p34 — one Child Group row. */
export interface CodeRelationship {
  parent: string;
  child: string;
  seq: number;
  section: string;
  qty: QtyBind;
  unitCost: CostBind;
  when?: Cond;
  remarks?: string;
}

export interface Catalog {
  subCodes: SubCode[];
  productCodes: ProductCode[];
  relationships: CodeRelationship[];
}

export interface BomLine {
  no: number;
  section: string;
  part: string;
  spec: string;
  qty: number;
  unit: string;
  material: string;
  unitCost: number;
}

export interface BomCodeLine extends BomLine {
  childCode: string;
  /**
   * p34 "Part List Running Test": child code + the sequence numbers of the parent's
   * chosen Sub Items for the slots this child actually reads (KDP 1-21 → KDP 1-21-13-15).
   * Confirmed reading (owner, 2026-09-19). An empty slot contributes 0.
   */
  resolvedCode: string;
  relSeq: number;
  remarks: string | null;
  /**
   * P4-b — 등록된 품목 종류(p33). 스냅샷 줄에 함께 남긴다. 구매 요청은 "지금의
   * 카탈로그"가 아니라 **그 BOM 을 돌린 시점**에 사 오는 품목이었던 줄만 모은다.
   */
  kind: ProductCode["kind"];
  /**
   * p32·p51 — 구매 품목의 공급처. **BOM Run 시점에 스냅샷 줄에 박는다**(0011 치수와 같은 원칙):
   * 구매 요청은 "지금 등록된 공급처"가 아니라 그 BOM 을 돌린 시점의 공급처를 산다.
   * 등록 안 된 코드는 null.
   */
  supplier: string | null;
}

export type BomCodeError =
  | { code: "UNKNOWN_PRODUCT"; message: string }
  | { code: "UNKNOWN_CHILD"; message: string }
  | { code: "UNKNOWN_REF"; message: string };

export type BomCodeResult =
  | { ok: true; parent: string; mainCode: string; sections: string[]; lines: BomCodeLine[] }
  | { ok: false; error: BomCodeError };

function holds(c: Cond | undefined, slots: SlotValues, macroValue: number | null): boolean {
  if (!c) return true;
  if ("macro" in c) return macroValue !== null;
  return (slots[c.slot] ?? "") === c.eq;
}

export function sectionsFor(product: ProductCode, slots: SlotValues, macroValue: number | null = null): string[] {
  return (product.sections ?? []).filter((s) => holds(s.when, slots, macroValue)).map((s) => s.name);
}

/**
 * p32 구매 속성 — 그 코드에 등록된 role="buy" 표에서 열 **이름**으로 값을 읽는다.
 * 행 선택: 슬롯 값에 맞는 행 → 없으면 default 행 → 없으면 첫 행(구매 품목은 대개 한 행이다).
 * 값이 없으면 빈 객체다. 여기서 만들어 내지 않는다(등록 안 한 것은 없는 것).
 */
export function buyAttrsOf(code: ProductCode, slots: SlotValues = {}): Record<string, string> {
  const t = Object.values(code.tables ?? {}).find((x) => x.role === "buy");
  if (!t || t.rows.length === 0) return {};
  const row = buyRowOf(t, slots);
  const out: Record<string, string> = {};
  for (const c of t.cols) {
    const v = row.cells[c.key];
    if (v !== undefined && v !== null && String(v) !== "") out[c.name] = String(v);
  }
  return out;
}

function buyRowOf(t: TechTable, slots: SlotValues): TableRow {
  const want = (slots[t.by] ?? "") || t.default;
  return t.rows.find((r) => r.item === want) ?? t.rows[0]!;
}

/**
 * 이 슬롯에서 그 코드의 구매 속성표(buy)가 고르는 행의 Item — 단가 이력(p67 price_history.item)을 찾는 키.
 * buyAttrsOf 와 같은 규칙(한 곳). buy 표가 없으면 null(단가 이력은 item "" 행만 본다).
 */
export function buyItemOf(code: ProductCode, slots: SlotValues = {}): string | null {
  const t = Object.values(code.tables ?? {}).find((x) => x.role === "buy");
  if (!t || t.rows.length === 0) return null;
  return buyRowOf(t, slots).item;
}

/**
 * 설계 검증 규칙 (p36·p60 "Design Verification" · 코퍼스 Arrangement Design Tool Binding).
 * role="rule" 표의 한 행 = 규칙 하나. 열 이름으로 읽는다 — target · op · value (· name 은 선택).
 *   target: L(전장=구획 길이 합) · W · H · SECTIONS(구획 수) · COMPONENTS(배치된 부품 수)
 *   op: max(이하) · min(이상)
 * 규칙이 없으면 검사도 없다 — 없는 규칙을 지어내지 않는다.
 */
export interface DesignRule { name: string; target: string; op: "max" | "min"; value: number }
export interface RuleViolation { name: string; target: string; op: "max" | "min"; limit: number; actual: number }

const RULE_TARGETS = ["L", "W", "H", "SECTIONS", "COMPONENTS"] as const;

export function designRulesOf(product: ProductCode): DesignRule[] {
  const t = Object.values(product.tables ?? {}).find((x) => x.role === "rule");
  if (!t) return [];
  const colOf = (nm: string) => t.cols.find((c) => c.name.toLowerCase() === nm)?.key;
  const kT = colOf("target"), kO = colOf("op"), kV = colOf("value"), kN = colOf("name");
  if (!kT || !kO || !kV) return [];
  const out: DesignRule[] = [];
  for (const r of t.rows) {
    const target = String(r.cells[kT] ?? "").toUpperCase();
    const op = String(r.cells[kO] ?? "").toLowerCase();
    const value = Number(r.cells[kV]);
    if (!(RULE_TARGETS as readonly string[]).includes(target)) continue;
    if (op !== "max" && op !== "min") continue;
    if (!Number.isFinite(value)) continue;
    out.push({ name: String(r.cells[kN ?? ""] ?? r.item ?? target), target, op, value });
  }
  return out;
}

/** 규칙을 지금 치수·구획에 대 본다. 통과면 빈 배열. */
export function checkDesign(
  rules: DesignRule[],
  dims: { W: number; H: number; L: number },
  secDims: SectionDim[],
): RuleViolation[] {
  const totalL = secDims.length > 0 ? secDims.reduce((a, s) => a + s.len, 0) : dims.L;
  const actualOf = (target: string): number =>
    target === "L" ? totalL
    : target === "W" ? dims.W
    : target === "H" ? dims.H
    : target === "SECTIONS" ? secDims.length
    : secDims.reduce((a, s) => a + (s.components?.length ?? 0), 0);
  const out: RuleViolation[] = [];
  for (const r of rules) {
    const actual = actualOf(r.target);
    const bad = r.op === "max" ? actual > r.value : actual < r.value;
    if (bad) out.push({ name: r.name, target: r.target, op: r.op, limit: r.value, actual });
  }
  return out;
}

/** 활성 구획의 이름 + 길이. len 미등록 구획은 fallbackL(도면 치수표의 L)을 쓴다. */
export function sectionDimsFor(
  product: ProductCode,
  slots: SlotValues,
  fallbackL: number,
  macroValue: number | null = null,
): SectionDim[] {
  return (product.sections ?? [])
    .filter((s) => holds(s.when, slots, macroValue))
    .map((s) => ({
      name: s.name,
      len: typeof s.len === "number" && s.len > 0 ? s.len : fallbackL,
      ...(isDirection(s.dir) ? { dir: s.dir } : {}),
      ...(s.components && s.components.length > 0 ? { components: s.components } : {}),
    }));
}

class RefError extends Error {}

/** Records which slots a line reads, so the child's resolved code can carry them. */
type Used = Set<SlotKey>;

function lookup(ref: string, child: ProductCode, parent: ProductCode, slots: SlotValues, used?: Used): Cell {
  const dot = ref.indexOf(".");
  const tName = dot < 0 ? ref : ref.slice(0, dot);
  const colRef = dot < 0 ? "" : ref.slice(dot + 1);
  const table = child.tables[tName] ?? parent.tables[tName];
  if (!table) throw new RefError(`table '${tName}' is not registered on ${child.code} or ${parent.code}`);
  used?.add(table.by);
  const key = slots[table.by] ?? "";
  // `default` covers an EMPTY slot only. A chosen value with no row is a gap in
  // the registration and must surface — never borrow another size's numbers.
  const want = key === "" ? table.default : key;
  const row = table.rows.find((r) => r.item === want);
  if (!row) throw new RefError(`table '${tName}' (Table${table.no}) has no row for ${table.by}='${key}' — register it in Set-Up ▸ Product Code ▸ Table`);
  const col = table.cols.find((c) => c.name === colRef || c.key === colRef);
  const cell = col ? row.cells[col.key] : undefined;
  if (cell === undefined) throw new RefError(`'${ref}' has no value for ${table.by}='${key}'`);
  return cell;
}

function num(ref: string, child: ProductCode, parent: ProductCode, slots: SlotValues, used?: Used): number {
  const v = lookup(ref, child, parent, slots, used);
  if (typeof v !== "number") throw new RefError(`'${ref}' is not a number`);
  return v;
}

function fill(tpl: string, child: ProductCode, parent: ProductCode, slots: SlotValues, macroValue: number | null, used?: Used): string {
  return tpl.replace(/\{([^}]+)\}/g, (_m, ref: string) =>
    ref === "macro" ? String(Math.round(macroValue ?? 0)) : String(lookup(ref, child, parent, slots, used)),
  );
}

const SLOT_ORDER: readonly SlotKey[] = ["A", "B", "C", "D", "E", "F"];

/** seq of the chosen Sub Item of a slot (p31 registration order); 0 when the slot is empty/unregistered. */
function seqOf(catalog: Catalog, key: SlotKey, slots: SlotValues): number {
  const v = slots[key] ?? "";
  if (v === "") return 0;
  return catalog.subCodes.find((s) => s.itemKey === key && s.value === v)?.seq ?? 0;
}

/**
 * Part List Run (p34). Deterministic: same catalog + same slots (+ same
 * approved-macro value) → same lines, in the same order.
 */
export function runBomCode(catalog: Catalog, slots: SlotValues, macroValue: number | null = null): BomCodeResult {
  const mv = typeof macroValue === "number" && Number.isFinite(macroValue) ? macroValue : null;
  const byCode = new Map(catalog.productCodes.map((p) => [p.code, p]));
  const parentCode = slots.A ?? "";
  const parent = byCode.get(parentCode);
  if (!parent || parent.kind !== "product")
    return { ok: false, error: { code: "UNKNOWN_PRODUCT", message: `product code '${parentCode}' is not registered` } };

  const sections = sectionsFor(parent, slots, mv);
  const allSections = (parent.sections ?? []).map((s) => s.name);
  const order = (s: string) => {
    const i = allSections.indexOf(s);
    return i < 0 ? -1 : i; // unlisted sections (e.g. Casing) come first
  };

  const rows = catalog.relationships
    .filter((r) => r.parent === parent.code && holds(r.when, slots, mv))
    .sort((a, b) => order(a.section) - order(b.section) || a.seq - b.seq);

  const lines: BomCodeLine[] = [];
  try {
    for (const r of rows) {
      const child = byCode.get(r.child);
      if (!child) return { ok: false, error: { code: "UNKNOWN_CHILD", message: `child code '${r.child}' is not registered` } };
      const used: Used = new Set();
      if (r.when && "slot" in r.when) used.add(r.when.slot);
      const qty = "lit" in r.qty ? r.qty.lit : num(r.qty.ref, child, parent, slots, used);
      const base = "lit" in r.unitCost ? r.unitCost.lit : num(r.unitCost.ref, child, parent, slots, used);
      const unitCost = Math.round(r.unitCost.scale ? base * num(r.unitCost.scale, child, parent, slots, used) : base);
      const spec = fill(child.specTemplate, child, parent, slots, mv, used);
      const material = fill(child.materialTemplate, child, parent, slots, mv, used);
      const seqs = SLOT_ORDER.filter((k) => used.has(k)).map((k) => seqOf(catalog, k, slots));
      lines.push({
        no: lines.length + 1,
        section: r.section,
        part: child.name,
        spec,
        qty,
        unit: child.unit,
        material,
        unitCost,
        childCode: child.code,
        resolvedCode: seqs.length ? `${child.code}-${seqs.join("-")}` : child.code,
        relSeq: r.seq,
        remarks: r.remarks ?? null,
        kind: child.kind,
        // p32 → p51: 구매 품목이면 등록된 공급처를 이 줄에 박는다(스냅샷이 근거)
        supplier: child.kind === "purchase" ? (buyAttrsOf(child, slots).Supplier ?? null) : null,
      });
    }
  } catch (e) {
    if (e instanceof RefError) return { ok: false, error: { code: "UNKNOWN_REF", message: e.message } };
    throw e;
  }
  // Main code of the run = product code + seq of every registered slot choice after A (A IS the code).
  const mainSeqs = (["B", "C", "D", "E"] as SlotKey[]).map((k) => seqOf(catalog, k, slots));
  return { ok: true, parent: parent.code, mainCode: `${parent.code}-${mainSeqs.join("-")}`, sections, lines };
}

/** Strip the code-trace fields → the plain BOM line the panels already render. */
export function toBomLine(l: BomCodeLine): BomLine {
  const { no, section, part, spec, qty, unit, material, unitCost } = l;
  return { no, section, part, spec, qty, unit, material, unitCost };
}

/** Stable fingerprint of a catalog, stored on every run snapshot. */
export function catalogFingerprint(catalog: Catalog): string {
  const canon = JSON.stringify({
    s: [...catalog.subCodes].sort((a, b) => (a.group + a.itemKey + a.seq).localeCompare(b.group + b.itemKey + b.seq)),
    p: [...catalog.productCodes].sort((a, b) => a.code.localeCompare(b.code)),
    r: [...catalog.relationships].sort((a, b) => (a.parent + a.seq).localeCompare(b.parent + b.seq) || a.seq - b.seq),
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * The Macro's view of the SAME registered tables: `TableN(col, r0:r1)` reads table
 * no N, column letter `col`, row NUMBERS r0..r1 (1-based, registration order).
 * Returns the `${no}!${col}` → { rowNumber → value } map the DSL provider expects;
 * non-numeric cells are left out (a Macro is arithmetic). Also returns the labels
 * for the back-translation glossary.
 */
export function macroTablesOf(product: ProductCode): { tables: Record<string, Record<number, number>>; labels: Record<string, string> } {
  const tables: Record<string, Record<number, number>> = {};
  const labels: Record<string, string> = {};
  for (const t of Object.values(product.tables)) {
    for (const c of t.cols) {
      const column: Record<number, number> = {};
      t.rows.forEach((r, i) => { const v = r.cells[c.key]; if (typeof v === "number") column[i + 1] = v; });
      if (Object.keys(column).length === t.rows.length && t.rows.length > 0) {
        tables[`${t.no}!${c.key}`] = column;
        labels[`${t.no}!${c.key}`] = c.label ?? c.name;
      }
    }
  }
  return { tables, labels };
}

/* ── P4-a · Key Dimension (p38~40) ─────────────────────────────────────────── */

/**
 * 도면이 읽는 치수 열 이름. 표의 **열 이름**(name)으로 찾는다 — 열 글자(A,B,C)는
 * 회사가 자유롭게 붙이므로 위치에 의존하지 않는다.
 *   W = 단면 폭 · H = 단면 높이 · L = 섹션 1개 길이 (mm)
 */
export const DIM_NAMES = ["W", "H", "L"] as const;
export type DimName = (typeof DIM_NAMES)[number];
export type Dims = Record<DimName, number>;

/** 제품 코드의 Key Dimension 표(종류 dim). 없으면 null. */
export function dimTableOf(p: ProductCode): TechTable | null {
  for (const t of Object.values(p.tables)) if (t.role === "dim") return t;
  return null;
}

export type DimsResult =
  | { ok: true; dims: Dims; item: string; tableName: string }
  | { ok: false; code: "NO_DIM_TABLE" | "NO_DIM_ROW" | "MISSING_DIM_COL" | "NOT_NUMERIC"; message: string };

/**
 * 등록된 치수를 뽑는다. **계산하지 않는다** — 표에 없으면 추측 대신 거부한다
 * (P1 에서 세운 규칙: 등록되지 않은 것은 0 이 아니라 오류).
 */
export function dimsFor(p: ProductCode, slots: SlotValues): DimsResult {
  const entry = Object.entries(p.tables).find(([, t]) => t.role === "dim");
  if (!entry)
    return { ok: false, code: "NO_DIM_TABLE", message: `제품 코드 ${p.code} 에 치수 표(Dim)가 등록되지 않았습니다` };
  const [tableName, t] = entry;
  const chosen = slots[t.by];
  const item = chosen && chosen !== "" ? chosen : t.default;
  const row = t.rows.find((r) => r.item === item);
  if (!row)
    return { ok: false, code: "NO_DIM_ROW", message: `치수 표 ${tableName} 에 ${t.by}=${item} 행이 없습니다` };
  const byName = new Map(t.cols.map((c) => [c.name, c.key]));
  const dims = {} as Dims;
  for (const n of DIM_NAMES) {
    const key = byName.get(n);
    if (!key)
      return { ok: false, code: "MISSING_DIM_COL", message: `치수 표 ${tableName} 에 열 ${n} 이 없습니다 (필요: ${DIM_NAMES.join(", ")})` };
    const cell = row.cells[key];
    const v = typeof cell === "number" ? cell : Number(cell);
    if (!Number.isFinite(v) || v <= 0)
      return { ok: false, code: "NOT_NUMERIC", message: `치수 ${n}(${item} 행)이 숫자가 아닙니다: ${String(cell)}` };
    dims[n] = v;
  }
  return { ok: true, dims, item, tableName };
}

export * from "./spec";
