import type { SlotValues } from "../rccs";
import { SAMPLE_TABLES, SAMPLE_VARS, codesFromSlots } from "../macro/provider";

/**
 * M3 — deterministic output layer. Given the assembled RCCS slots (and, when
 * present, the approved-macro value), produce the Item BOM, the section-grouped
 * EBOM, and the cost roll-up. Pure: same slots → same BOM → same cost.
 * Unit costs are SAMPLE values (KRW); real price tables bind later.
 */
export interface BomLine {
  no: number;
  section: string;
  part: string;
  spec: string;
  qty: number;
  unit: string;
  material: string;
  unitCost: number; // KRW, sample
}
export interface CostSummary {
  material: number;
  labor: number;
  overhead: number;
  total: number;
  lines: number;
  currency: "KRW";
}

const MATERIAL_LABEL: Record<string, string> = { "": "GI", SS: "SUS304", AL: "AL" };
const MATERIAL_FACTOR: Record<string, number> = { "": 1, SS: 1.6, AL: 1.35 };

export function sectionsOf(slots: SlotValues): string[] {
  const s = ["Mixing", "Filter"];
  if (slots.D === "630") s.push("Rotor");
  s.push("Coil");
  if (slots.D === "A1") s.push("Humid.");
  if (slots.D === "H2") s.push("HeatPump");
  s.push("Fan");
  return s;
}

export function buildBom(slots: SlotValues, macroValue?: number | null): BomLine[] {
  const c = codesFromSlots(slots);
  const row = c.ROW || 1;
  const fanKw = SAMPLE_TABLES["1!A"][row as 1 | 2 | 3 | 4];
  const coilRows = SAMPLE_TABLES["1!B"][row as 1 | 2 | 3 | 4];
  const panelMm = SAMPLE_TABLES["1!C"][row as 1 | 2 | 3 | 4];
  const mat = MATERIAL_LABEL[slots.E ?? ""] ?? "GI";
  const mf = MATERIAL_FACTOR[slots.E ?? ""] ?? 1;
  const cap = c.CAP || 10;
  const sections = sectionsOf(slots);
  const face = Math.round(Math.sqrt((cap * 1000) / SAMPLE_VARS["NS|10"] / 3600) * 1000); // mm, face velocity 2.5 m/s
  const length = sections.length * 900;

  const lines: Omit<BomLine, "no">[] = [
    { section: "Casing", part: "Panel (double skin)", spec: `${panelMm}T ${face}×${face}`, qty: sections.length * 4, unit: "ea", material: mat, unitCost: Math.round(48000 * mf * (panelMm / 25)) },
    { section: "Casing", part: "Base frame", spec: `L${length} C-channel`, qty: 1, unit: "set", material: "SS400", unitCost: Math.round(120000 + length * 45) },
    { section: "Mixing", part: "Mixing damper", spec: `${face}×600 opposed`, qty: 2, unit: "ea", material: mat, unitCost: Math.round(85000 * mf) },
    { section: "Filter", part: "Pre filter", spec: "MERV 8 592×592×50", qty: Math.ceil((face / 592) ** 2), unit: "ea", material: "Synthetic", unitCost: 18000 },
    { section: "Filter", part: "Bag filter", spec: "MERV 13 592×592×600", qty: Math.ceil((face / 592) ** 2), unit: "ea", material: "Glass fiber", unitCost: 62000 },
    { section: "Coil", part: "Cooling coil", spec: `${coilRows}R ${face}×${Math.round(face * 0.8)} Cu/Al`, qty: 1, unit: "ea", material: "Cu/Al", unitCost: Math.round(420000 + coilRows * 95000 + cap * 6000) },
    { section: "Coil", part: "Drain pan", spec: `${face}×600 SUS`, qty: 1, unit: "ea", material: "SUS304", unitCost: 68000 },
    { section: "Fan", part: "Plug fan", spec: `${fanKw}kW 380V 4P IE3`, qty: 1, unit: "ea", material: "AL impeller", unitCost: Math.round(680000 + fanKw * 52000) },
    { section: "Fan", part: "Inverter", spec: `${fanKw}kW VFD`, qty: 1, unit: "ea", material: "—", unitCost: Math.round(310000 + fanKw * 21000) },
  ];
  if (slots.D === "630") lines.push({ section: "Rotor", part: "Heat recovery rotor", spec: `Ø${Math.round(face * 1.1)} sensible`, qty: 1, unit: "ea", material: "AL", unitCost: Math.round(1400000 + cap * 18000) });
  if (slots.D === "A1") lines.push({ section: "Humid.", part: "Steam humidifier", spec: `${Math.round(cap * 0.6)} kg/h`, qty: 1, unit: "ea", material: "SUS304", unitCost: Math.round(520000 + cap * 9000) });
  if (slots.D === "H2") lines.push({ section: "HeatPump", part: "DX heat pump coil", spec: `${coilRows}R ${face}×${Math.round(face * 0.8)}`, qty: 1, unit: "ea", material: "Cu/Al", unitCost: Math.round(980000 + cap * 15000) });
  if (typeof macroValue === "number" && Number.isFinite(macroValue))
    lines.push({ section: "Fan", part: "Vibration isolator", spec: `for ${Math.round(macroValue)} kg (macro)`, qty: 4, unit: "ea", material: "Rubber/SS", unitCost: 12000 });

  return lines
    .sort((a, b) => sections.indexOf(a.section) - sections.indexOf(b.section))
    .map((l, i) => ({ no: i + 1, ...l }));
}

export interface EbomGroup { section: string; items: BomLine[]; subtotal: number }
export function buildEbom(lines: BomLine[], slots: SlotValues): EbomGroup[] {
  const order = ["Casing", ...sectionsOf(slots)];
  const groups = new Map<string, BomLine[]>();
  for (const l of lines) groups.set(l.section, [...(groups.get(l.section) ?? []), l]);
  return order.filter((s) => groups.has(s)).map((section) => {
    const items = groups.get(section)!;
    return { section, items, subtotal: items.reduce((a, l) => a + l.qty * l.unitCost, 0) };
  });
}

export function buildCost(lines: BomLine[]): CostSummary {
  const material = lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
  const labor = Math.round(material * 0.18);
  const overhead = Math.round((material + labor) * 0.12);
  return { material, labor, overhead, total: material + labor + overhead, lines: lines.length, currency: "KRW" };
}
