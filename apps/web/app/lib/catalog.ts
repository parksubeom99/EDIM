import type { Role } from "@edim/core-ontology";
import { withTenant, loadCatalogRows, type CatalogRows } from "@edim/db";
import { slotDefsFromSubCodes, type SlotDef } from "./rccs";
import { macroTablesOf, isDirection, isAt, isLevel, isInstall, dimsFor, sectionDimsFor, designFacts } from "@edim/bom-code";
import type { Catalog, Cond, CostBind, QtyBind, SectionDef, ComponentPos, SlotKey, TechTable, Cell } from "@edim/bom-code";

/**
 * P1 — BOM Code Set-Up boundary (server). DB rows ⇄ the pure engine's Catalog.
 * JSON columns are validated HERE (shape only); meaning is checked by running
 * the engine (an unknown table ref is an UNKNOWN_REF error, never a silent 0).
 *
 * Who may register codes: owner · engineer (회사 관리자·기술). Platform-level
 * approval of catalog changes is P3 (3-tier roles) — not built here.
 */
export const CATALOG_EDIT_ROLES: readonly Role[] = ["owner", "engineer"];
export const canEditCatalog = (role: Role): boolean => CATALOG_EDIT_ROLES.includes(role);

const SLOT_KEYS: readonly SlotKey[] = ["A", "B", "C", "D", "E", "F"];
const isSlot = (v: unknown): v is SlotKey => typeof v === "string" && (SLOT_KEYS as readonly string[]).includes(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseCond(v: unknown): Cond | undefined | "invalid" {
  if (v === null || v === undefined) return undefined;
  if (!isObj(v)) return "invalid";
  if (v.macro === true) return { macro: true };
  if (isSlot(v.slot) && typeof v.eq === "string") return { slot: v.slot, eq: v.eq };
  return "invalid";
}

export function parseQty(v: unknown): QtyBind | "invalid" {
  if (!isObj(v)) return "invalid";
  if (typeof v.lit === "number" && Number.isFinite(v.lit) && v.lit >= 0) return { lit: v.lit };
  if (typeof v.ref === "string" && /^[\w]+\.[\w]+$/.test(v.ref)) return { ref: v.ref };
  return "invalid";
}

export function parseCost(v: unknown): CostBind | "invalid" {
  const q = parseQty(v);
  if (q === "invalid" || !isObj(v)) return "invalid";
  if (v.scale === undefined || v.scale === null || v.scale === "") return q;
  if (typeof v.scale === "string" && /^[\w]+\.[\w]+$/.test(v.scale)) return { ...q, scale: v.scale };
  return "invalid";
}

export function parseTables(v: unknown): Record<string, TechTable> | "invalid" {
  if (v === null || v === undefined) return {};
  if (!isObj(v)) return "invalid";
  const out: Record<string, TechTable> = {};
  const nos = new Set<number>();
  let dimSeen = false;
  let specialSeen = false;
  let detailSeen = false;
  for (const [name, t] of Object.entries(v)) {
    if (!/^\w+$/.test(name) || !isObj(t) || !isSlot(t.by) || typeof t.default !== "string") return "invalid";
    if (typeof t.no !== "number" || !Number.isInteger(t.no) || t.no < 1 || nos.has(t.no)) return "invalid"; // TableN must be unique
    nos.add(t.no);
    // p16/p51 Table Type — 기본은 tech. dim(Key Dimension)은 제품 코드당 하나만.
    let role: "tech" | "dim" | "buy" | "rule" | "special" | "detail" | undefined;
    if (t.role !== undefined && t.role !== null) {
      // buy = p32 구매 속성 · rule = p36 설계 검증 · special = Special 호출 선언(ccmd K · KA — 제품 코드당 하나)
      // detail = Detail Dimension(ccmd K · KC-1 — 제품 코드당 하나)
      if (t.role !== "tech" && t.role !== "dim" && t.role !== "buy" && t.role !== "rule" && t.role !== "special" && t.role !== "detail") return "invalid";
      role = t.role;
      if (role === "dim") { if (dimSeen) return "invalid"; dimSeen = true; }
      if (role === "special") { if (specialSeen) return "invalid"; specialSeen = true; }
      if (role === "detail") { if (detailSeen) return "invalid"; detailSeen = true; }
    }
    // ccmd K · KA — 행을 Special 결과 필드로 고르는 표(예: motorKw). 이름 형식만 본다.
    if (t.bySpecial !== undefined && t.bySpecial !== null && !(typeof t.bySpecial === "string" && /^\w+$/.test(t.bySpecial))) return "invalid";
    const bySpecial = typeof t.bySpecial === "string" ? t.bySpecial : undefined;
    if (!Array.isArray(t.cols) || !Array.isArray(t.rows) || t.cols.length === 0) return "invalid";
    const cols: TechTable["cols"] = [];
    const keys = new Set<string>();
    for (const c of t.cols) {
      if (!isObj(c) || typeof c.key !== "string" || !/^[A-Z]{1,2}$/.test(c.key) || keys.has(c.key)) return "invalid"; // lettered columns
      if (typeof c.name !== "string" || !/^\w+$/.test(c.name)) return "invalid";
      keys.add(c.key);
      cols.push({ key: c.key, name: c.name, ...(typeof c.label === "string" && c.label ? { label: c.label.slice(0, 40) } : {}) });
    }
    const rows: TechTable["rows"] = [];
    const items = new Set<string>();
    for (const r of t.rows) {
      if (!isObj(r) || typeof r.item !== "string" || items.has(r.item) || !isObj(r.cells)) return "invalid";
      items.add(r.item);
      const cells: Record<string, Cell> = {};
      for (const [k, cell] of Object.entries(r.cells)) {
        if (!keys.has(k) || !(typeof cell === "string" || (typeof cell === "number" && Number.isFinite(cell)))) return "invalid";
        cells[k] = cell;
      }
      rows.push({ item: r.item, cells });
    }
    out[name] = { no: t.no, by: t.by, default: t.default, cols, rows, ...(role ? { role } : {}), ...(bySpecial ? { bySpecial } : {}) };
  }
  return out;
}

export function parseSections(v: unknown): SectionDef[] | undefined | "invalid" {
  if (v === null || v === undefined) return undefined;
  // 옛 행 방어: 구획 없는 코드가 `{}` 로 저장된 적이 있다(DbNull 센티널 사고 · 2026-09-23 수리).
  // 그 행까지 "형식 오류"로 버리면 코드가 카탈로그에서 사라진다 → 구획 없음으로 읽는다.
  if (isObj(v) && Object.keys(v).length === 0) return undefined;
  if (!Array.isArray(v)) return "invalid";
  const out: SectionDef[] = [];
  for (const s of v) {
    if (!isObj(s) || typeof s.name !== "string" || !s.name) return "invalid";
    const c = parseCond(s.when);
    if (c === "invalid") return "invalid";
    // Arrangement: 구획 길이(len, mm). 있으면 보존, 없으면 도면이 dim.L 로 폴백한다.
    if (s.len !== undefined && s.len !== null && !(typeof s.len === "number" && Number.isFinite(s.len) && s.len > 0)) return "invalid";
    const len = typeof s.len === "number" ? s.len : undefined;
    // Arrangement 2차: 방향(p36 L0~R270). 값이 목록 밖이면 그 코드 전체를 무효로 본다(조용한 무시 금지).
    if (s.dir !== undefined && s.dir !== null && !isDirection(s.dir)) return "invalid";
    const dir = isDirection(s.dir) ? s.dir : undefined;
    // ccmd M · p36 Installation Code — 목록 밖이면 그 코드 전체를 무효로(방향과 같은 원칙)
    if (s.install !== undefined && s.install !== null && !isInstall(s.install)) return "invalid";
    const install = isInstall(s.install) ? s.install : undefined;
    // Component 배치(p36) — 형식이 틀리면 조용히 버리지 않고 그 코드를 무효로 본다.
    let comps: ComponentPos[] | undefined;
    if (s.components !== undefined && s.components !== null) {
      if (!Array.isArray(s.components)) return "invalid";
      const acc: ComponentPos[] = [];
      for (const raw of s.components) {
        if (!isObj(raw)) return "invalid";
        if (typeof raw.code !== "string" || !raw.code.trim()) return "invalid";
        if (!isAt(raw.at) || !isLevel(raw.level)) return "invalid";
        acc.push({ code: raw.code, at: raw.at, level: raw.level });
      }
      comps = acc;
    }
    out.push({ name: s.name, ...(c ? { when: c } : {}), ...(len !== undefined ? { len } : {}), ...(dir ? { dir } : {}), ...(comps && comps.length > 0 ? { components: comps } : {}), ...(install ? { install } : {}) });
  }
  return out;
}

/** Rows that fail shape validation are dropped from the run and reported. */
export function rowsToCatalog(rows: CatalogRows): { catalog: Catalog; rejected: string[] } {
  const rejected: string[] = [];
  const catalog: Catalog = { subCodes: [], productCodes: [], relationships: [] };
  for (const s of rows.subCodes) {
    if (!isSlot(s.itemKey)) { rejected.push(`sub_code ${s.id}`); continue; }
    catalog.subCodes.push({ group: s.groupName, itemKey: s.itemKey, itemName: s.itemName, seq: s.seq, value: s.value, description: s.description });
  }
  for (const p of rows.productCodes) {
    const tables = parseTables(p.tables);
    const sections = parseSections(p.sections);
    if (tables === "invalid" || sections === "invalid" || !["product", "part", "purchase"].includes(p.kind)) { rejected.push(`product_code ${p.code}`); continue; }
    catalog.productCodes.push({
      code: p.code, name: p.name, kind: p.kind as "product" | "part" | "purchase", category: p.category, unit: p.unit,
      specTemplate: p.specTemplate, materialTemplate: p.materialTemplate, tables, ...(sections ? { sections } : {}),
    });
  }
  for (const r of rows.relationships) {
    const qty = parseQty(r.qty);
    const unitCost = parseCost(r.unitCost);
    const when = parseCond(r.whenCond);
    if (qty === "invalid" || unitCost === "invalid" || when === "invalid") { rejected.push(`code_relationship ${r.parentCode}#${r.seq}`); continue; }
    catalog.relationships.push({ parent: r.parentCode, child: r.childCode, seq: r.seq, section: r.section, qty, unitCost, ...(when ? { when } : {}), ...(r.remarks ? { remarks: r.remarks } : {}) });
  }
  return { catalog, rejected };
}

export async function loadCatalog(tenantId: string): Promise<{ catalog: Catalog; rejected: string[]; rows: CatalogRows }> {
  const rows = await withTenant(tenantId, (tx) => loadCatalogRows(tx));
  return { ...rowsToCatalog(rows), rows };
}

/** Code Builder slot catalog for a tenant = its registered Sub Codes (p31). */
export async function loadSlotDefs(tenantId: string): Promise<SlotDef[]> {
  const rows = await withTenant(tenantId, (tx) => tx.subCode.findMany({ orderBy: [{ itemKey: "asc" }, { seq: "asc" }] }));
  return slotDefsFromSubCodes(rows.map((r) => ({ itemKey: r.itemKey, itemName: r.itemName, seq: r.seq, value: r.value, description: r.description })));
}

/**
 * Unified tables (2026-09-19): the Macro reads the SAME registered tables as the BOM.
 * Returns the DSL-provider tables + back-translation labels of the product code `A`
 * (null when the tenant has not registered that product → caller falls back to samples).
 */
export async function loadMacroTables(tenantId: string, productCode: string): Promise<ReturnType<typeof macroTablesOf> | null> {
  const { catalog } = await loadCatalog(tenantId);
  const p = catalog.productCodes.find((x) => x.code === productCode && x.kind === "product");
  return p ? macroTablesOf(p) : null;
}

/**
 * B(ccmd J) · 매크로가 읽는 **도면 치수 어휘** `Var(DIM, …)` — 등록된 치수 표 · 구획에서 그 슬롯 조합의 값(bom-code designFacts).
 *   L 전장(구획 합) · W · H · SECSUM 구획 길이 합 · SECTIONS · COMPONENTS · LMAX · LMAXPCT
 * 학습 공식이 π_user 로 이 어휘에 옮겨져 회사 매크로로 돈다. 새 계산이 아니라 BOM Run 이 도면에 쓰는 것과 같은 값이다.
 * 치수 표가 없는 제품이면 빈 값(그 기호를 읽는 매크로는 '모르는 기호'로 멈춘다 — 추측하지 않는다).
 */
export async function loadDesignVars(tenantId: string, slots: Record<string, string | undefined>): Promise<Record<string, number>> {
  const { catalog } = await loadCatalog(tenantId);
  const p = catalog.productCodes.find((x) => x.code === (slots.A ?? "") && x.kind === "product");
  if (!p) return {};
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(slots)) if (typeof v === "string") clean[k] = v;
  const d = dimsFor(p, clean);
  if (!d.ok) return {};
  const facts = designFacts(d.dims, sectionDimsFor(p, clean, d.dims.L, null));
  const out: Record<string, number> = { "DIM|SECSUM": facts.L! };
  for (const [k, v] of Object.entries(facts)) out[`DIM|${k}`] = v;
  return out;
}
