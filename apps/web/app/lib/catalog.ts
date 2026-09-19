import type { Role } from "@edim/core-ontology";
import { withTenant, loadCatalogRows, type CatalogRows } from "@edim/db";
import type { Catalog, Cond, CostBind, QtyBind, SectionDef, SlotKey, TechTable, Cell } from "@edim/bom-code";

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
  for (const [name, t] of Object.entries(v)) {
    if (!/^\w+$/.test(name) || !isObj(t) || !isSlot(t.by) || typeof t.default !== "string" || !isObj(t.rows)) return "invalid";
    const rows: Record<string, Record<string, Cell>> = {};
    for (const [k, row] of Object.entries(t.rows)) {
      if (!isObj(row)) return "invalid";
      const cells: Record<string, Cell> = {};
      for (const [c, cell] of Object.entries(row)) {
        if (!/^\w+$/.test(c) || !(typeof cell === "string" || (typeof cell === "number" && Number.isFinite(cell)))) return "invalid";
        cells[c] = cell;
      }
      rows[k] = cells;
    }
    out[name] = { by: t.by, default: t.default, rows };
  }
  return out;
}

export function parseSections(v: unknown): SectionDef[] | undefined | "invalid" {
  if (v === null || v === undefined) return undefined;
  if (!Array.isArray(v)) return "invalid";
  const out: SectionDef[] = [];
  for (const s of v) {
    if (!isObj(s) || typeof s.name !== "string" || !s.name) return "invalid";
    const c = parseCond(s.when);
    if (c === "invalid") return "invalid";
    out.push(c ? { name: s.name, when: c } : { name: s.name });
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
