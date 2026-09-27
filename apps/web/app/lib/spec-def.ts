import type { SlotKey, SpecItemDef, SpecSource } from "@edim/bom-code";

/**
 * ⑥ 사양 항목 정의 — 저장할 모양 한 곳(등록 · 수정 · CSV Import 가 같이 쓴다).
 * 저장은 정의에 쓰이는 필드만 — 보낸 잡값이 source 에 섞이지 않게.
 */
export function cleanSource(s: SpecSource): Record<string, unknown> {
  return s.kind === "choice" ? { kind: "choice" }
    : s.kind === "item" ? { kind: "item", op: s.op, ...(s.scale !== undefined ? { scale: s.scale } : {}) }
    : { kind: "table", table: s.table, col: s.col, op: s.op };
}

/** CSV 머리글: key,label,unit,slot,kind,op,scale,table,col (kind = item|table|choice) */
export const SPEC_CSV_HEADER = ["key", "label", "unit", "slot", "kind", "op", "scale", "table", "col"] as const;

export function specRowToDef(c: Record<string, string>): SpecItemDef {
  const kind = c.kind ?? "";
  const source = (kind === "choice" ? { kind: "choice" }
    : kind === "item" ? { kind: "item", op: c.op, ...(c.scale ? { scale: Number(c.scale) } : {}) }
    : { kind, table: c.table, col: c.col, op: c.op }) as SpecSource;
  return { key: c.key ?? "", label: c.label ?? "", unit: c.unit ?? "", slot: (c.slot ?? "") as SlotKey, source };
}
