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

/** p32/p33 "Table 참조": rows keyed by the value of one slot. */
export interface TechTable {
  by: SlotKey;
  /** row key used when the slot is EMPTY (a chosen value without a row is an error) */
  default: string;
  rows: Record<string, Record<string, Cell>>;
}

export type Cond = { slot: SlotKey; eq: string } | { macro: true };

export interface SectionDef {
  name: string;
  when?: Cond;
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
  relSeq: number;
  remarks: string | null;
}

export type BomCodeError =
  | { code: "UNKNOWN_PRODUCT"; message: string }
  | { code: "UNKNOWN_CHILD"; message: string }
  | { code: "UNKNOWN_REF"; message: string };

export type BomCodeResult =
  | { ok: true; parent: string; sections: string[]; lines: BomCodeLine[] }
  | { ok: false; error: BomCodeError };

function holds(c: Cond | undefined, slots: SlotValues, macroValue: number | null): boolean {
  if (!c) return true;
  if ("macro" in c) return macroValue !== null;
  return (slots[c.slot] ?? "") === c.eq;
}

export function sectionsFor(product: ProductCode, slots: SlotValues, macroValue: number | null = null): string[] {
  return (product.sections ?? []).filter((s) => holds(s.when, slots, macroValue)).map((s) => s.name);
}

class RefError extends Error {}

function lookup(ref: string, child: ProductCode, parent: ProductCode, slots: SlotValues): Cell {
  const dot = ref.indexOf(".");
  const tName = dot < 0 ? ref : ref.slice(0, dot);
  const col = dot < 0 ? "" : ref.slice(dot + 1);
  const table = child.tables[tName] ?? parent.tables[tName];
  if (!table) throw new RefError(`table '${tName}' is not registered on ${child.code} or ${parent.code}`);
  const key = slots[table.by] ?? "";
  // `default` covers an EMPTY slot only. A chosen value with no row is a gap in
  // the registration and must surface — never borrow another size's numbers.
  const row = table.rows[key] ?? (key === "" ? table.rows[table.default] : undefined);
  if (!row) throw new RefError(`table '${tName}' has no row for ${table.by}='${key}' — register it in Set-Up ▸ Product Code ▸ Table`);
  const cell = row[col];
  if (cell === undefined) throw new RefError(`'${ref}' has no value for ${table.by}='${key}'`);
  return cell;
}

function num(ref: string, child: ProductCode, parent: ProductCode, slots: SlotValues): number {
  const v = lookup(ref, child, parent, slots);
  if (typeof v !== "number") throw new RefError(`'${ref}' is not a number`);
  return v;
}

function fill(tpl: string, child: ProductCode, parent: ProductCode, slots: SlotValues, macroValue: number | null): string {
  return tpl.replace(/\{([^}]+)\}/g, (_m, ref: string) =>
    ref === "macro" ? String(Math.round(macroValue ?? 0)) : String(lookup(ref, child, parent, slots)),
  );
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
      const qty = "lit" in r.qty ? r.qty.lit : num(r.qty.ref, child, parent, slots);
      const base = "lit" in r.unitCost ? r.unitCost.lit : num(r.unitCost.ref, child, parent, slots);
      const unitCost = Math.round(r.unitCost.scale ? base * num(r.unitCost.scale, child, parent, slots) : base);
      lines.push({
        no: lines.length + 1,
        section: r.section,
        part: child.name,
        spec: fill(child.specTemplate, child, parent, slots, mv),
        qty,
        unit: child.unit,
        material: fill(child.materialTemplate, child, parent, slots, mv),
        unitCost,
        childCode: child.code,
        relSeq: r.seq,
        remarks: r.remarks ?? null,
      });
    }
  } catch (e) {
    if (e instanceof RefError) return { ok: false, error: { code: "UNKNOWN_REF", message: e.message } };
    throw e;
  }
  return { ok: true, parent: parent.code, sections, lines };
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
