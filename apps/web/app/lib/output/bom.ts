import type { SlotValues } from "../rccs";
import { SAMPLE_TABLES, SAMPLE_VARS, codesFromSlots } from "../macro/provider";

/**
 * M3 — deterministic output layer.
 *
 * P1 (2026-09-19): `buildBom` is NO LONGER the runtime BOM. The BOM now comes from
 * registered codes (@edim/bom-code + Set-Up DB). This function is kept only as the
 * regression oracle (test/bom-code-regression.test.ts). buildEbom/buildCost stay in use.
 * Given the assembled RCCS slots (and, when
 * present, the approved-macro value), produce the Item BOM, the section-grouped
 * EBOM, and the cost roll-up. Pure: same slots → same BOM → same cost.
 * Unit costs are SAMPLE values (KRW); real price tables bind later.
 *
 * Spec strings follow the blueprint's own AHU spec table — EDIM.pdf p14
 * "공기조화기 사양" (casing/frame/fan/coil/damper) — so the BOM reads as the
 * company's product, not an invented one. Where p14 gives no value (filters,
 * rotor, VFD) the spec stays a documented sample. Sources are cited per line.
 */
/** EDIM.pdf p14 — 공기조화기 사양 (verbatim materials/thicknesses). */
export const P14_SPEC = {
  casingOuter: "칼라강판 0.8T",          // CASING 외판
  casingInner: "아연도(G.I) 강판 0.8T",  // CASING 내판
  insulation: "G/Wool 48K 50T",         // CASING 보온재
  panelForm: "계단식(凸) 판넬",           // CASING 특징
  frame: "Steel 1.6t Forming 분체소부도장", // FRAME 구조
  corner: "AL 다이케스팅",               // FRAME 코너 마운틴
  fan: "EURUS 에어포일 · AMCA Seal",     // FAN Fan/인증현황/적용Fan형식
  motor: "효성모터",                     // FAN 적용모터
  coilFin: "AL Fin 8FPI 0.12mmT",        // COIL AL Fin
  coilTube: "Cu 1/2\"×0.5mmT",          // COIL Tube규격
  coilFrame: "SGCC 1.6T",               // COIL Frame
  damper: "OA/EA/BYPASS Link식 SGCC 1.6T/AL 1.2T", // DAMPER
  damperVel: "5~7 m/s 이하",            // DAMPER 설계풍속
} as const;

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
  /** F10 · p66 · p67 — 인건비를 어떻게 셌는지. 스냅샷에 박혀서, 표를 나중에 고쳐도 뜬 원가·견적은 그대로다. */
  laborBasis?: LaborBasis;
}

/** p66 Manufacturing Cost Table 한 행(0026 mfg_rate). amount = round(hours × rate). */
export interface MfgRateLine { process: string; equipment: string | null; hours: number; rate: number; amount: number }
export type LaborBasis =
  | { kind: "ratio"; ratio: number }
  | { kind: "mfg-table"; productCode: string; rows: MfgRateLine[] };

export const LABOR_RATIO = 0.18;
export const OVERHEAD_RATIO = 0.12;

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
    { section: "Casing", part: "Panel (double skin)", spec: `${panelMm}T ${face}×${face} · ${P14_SPEC.casingOuter}/${P14_SPEC.casingInner} · ${P14_SPEC.insulation}`, qty: sections.length * 4, unit: "ea", material: mat, unitCost: Math.round(48000 * mf * (panelMm / 25)) },
    { section: "Casing", part: "Base frame", spec: `L${length} C-channel · ${P14_SPEC.frame} · ${P14_SPEC.corner}`, qty: 1, unit: "set", material: "SS400", unitCost: Math.round(120000 + length * 45) },
    { section: "Mixing", part: "Mixing damper", spec: `${face}×600 opposed · ${P14_SPEC.damper} · ${P14_SPEC.damperVel}`, qty: 2, unit: "ea", material: mat, unitCost: Math.round(85000 * mf) },
    { section: "Filter", part: "Pre filter", spec: "MERV 8 592×592×50", qty: Math.ceil((face / 592) ** 2), unit: "ea", material: "Synthetic", unitCost: 18000 },
    { section: "Filter", part: "Bag filter", spec: "MERV 13 592×592×600", qty: Math.ceil((face / 592) ** 2), unit: "ea", material: "Glass fiber", unitCost: 62000 },
    { section: "Coil", part: "Cooling coil", spec: `${coilRows}R ${face}×${Math.round(face * 0.8)} · ${P14_SPEC.coilFin} · ${P14_SPEC.coilTube} · Frame ${P14_SPEC.coilFrame}`, qty: 1, unit: "ea", material: "Cu/Al", unitCost: Math.round(420000 + coilRows * 95000 + cap * 6000) },
    { section: "Coil", part: "Drain pan", spec: `${face}×600 SUS`, qty: 1, unit: "ea", material: "SUS304", unitCost: 68000 },
    { section: "Fan", part: "Plug fan", spec: `${fanKw}kW 380V 4P IE3 · ${P14_SPEC.fan} · ${P14_SPEC.motor}`, qty: 1, unit: "ea", material: "AL impeller", unitCost: Math.round(680000 + fanKw * 52000) },
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
/** `sections` = the registered section order of the product code (P1); falls back to the M3 slot rule. */
export function buildEbom(lines: BomLine[], slots: SlotValues, sections?: string[]): EbomGroup[] {
  const order = ["Casing", ...(sections ?? sectionsOf(slots))];
  const groups = new Map<string, BomLine[]>();
  for (const l of lines) groups.set(l.section, [...(groups.get(l.section) ?? []), l]);
  return order.filter((s) => groups.has(s)).map((section) => {
    const items = groups.get(section)!;
    return { section, items, subtotal: items.reduce((a, l) => a + l.qty * l.unitCost, 0) };
  });
}

/**
 * 원가 = 재료비 + 인건비 + 경비. 인건비는 제조 정보 표(p66 · 0026)가 그 제품에 있으면 Σ 시간 × 임율,
 * 없으면 재료비 × 18%(기존). 경비는 어느 쪽이든 (재료비 + 인건비) × 12%. 어느 쪽으로 셌는지 laborBasis 에 남긴다.
 */
export function buildCost(lines: BomLine[], mfg?: { productCode: string; rows: Omit<MfgRateLine, "amount">[] }): CostSummary {
  const material = lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
  const rows = (mfg?.rows ?? []).map((r) => ({ ...r, amount: Math.round(r.hours * r.rate) }));
  const laborBasis: LaborBasis = mfg && rows.length
    ? { kind: "mfg-table", productCode: mfg.productCode, rows }
    : { kind: "ratio", ratio: LABOR_RATIO };
  const labor = laborBasis.kind === "mfg-table" ? rows.reduce((a, r) => a + r.amount, 0) : Math.round(material * LABOR_RATIO);
  const overhead = Math.round((material + labor) * OVERHEAD_RATIO);
  return { material, labor, overhead, total: material + labor + overhead, lines: lines.length, currency: "KRW", laborBasis };
}
