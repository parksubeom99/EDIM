/**
 * ccmd M · p66 PCR 세부(Table) — Procurement · Sub-manufacturing · Other direct · Sales & Adm. · EBIT 를 Business Type 열마다.
 * **순수 함수**(파일·DB 모름). 입력 = 스냅샷 원가(재료비 · 인건비) + 견적 금액 + 요율표(샘플 파일 · pcr-rules.ts 가 읽는다).
 * ccmd M-1(회장님 결정 09-30) — 요율표의 marginPct 로 **견적 단가 = 스냅샷 원가 × (1 + 마진율)**. 원가(스냅샷)는 그대로다.
 * 이 표의 Contract Amount = 그 견적 금액 → EBIT = 견적 − Full costs.
 * ccmd M-2 · 원가 기준 — 이 표는 스냅샷 **재료비 + 인건비**(costBase)에서 출발해 간접비를 요율표 줄로 **다시 센다**.
 * 스냅샷 원가의 Overhead(12% 일괄 · snapshotOverhead)는 넣지 않는다(넣으면 간접비 이중 계상). 그래서 EBIT 는
 * "견적 − 스냅샷 원가"와 다를 수 있고, 항상 EBIT ≤ 견적 − costBase 다(요율 줄은 0 이상).
 */
export type PcrKind = "bom" | "mfg" | "rate";
export type PcrBase = "exwork" | "contract";
export interface PcrRowRule { label: string; kind: PcrKind; base?: PcrBase; pct?: number[] }
export interface PcrSectionRule { name: string; group: "direct" | "sna"; rows: PcrRowRule[] }
export interface PcrRules { version: string; sample: string; businessTypes: string[]; sections: PcrSectionRule[]; /** 견적 마진율(%) — 없으면 0 */ marginPct: number }

export function parsePcrRules(v: unknown): { ok: true; rules: PcrRules } | { ok: false; error: string } {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return { ok: false, error: "객체가 아닙니다" };
  if (typeof o.version !== "string" || !o.version) return { ok: false, error: "version 이 필요합니다" };
  const types = o.businessTypes;
  if (!Array.isArray(types) || types.length < 1 || types.length > 6 || !types.every((t) => typeof t === "string" && t.trim()))
    return { ok: false, error: "businessTypes 는 글자 1~6개입니다" };
  if (!Array.isArray(o.sections) || o.sections.length < 1) return { ok: false, error: "sections 가 필요합니다" };
  const sections: PcrSectionRule[] = [];
  let bom = 0, mfg = 0;
  for (const s of o.sections as Record<string, unknown>[]) {
    if (typeof s?.name !== "string" || !s.name) return { ok: false, error: "section.name 이 필요합니다" };
    if (s.group !== "direct" && s.group !== "sna") return { ok: false, error: `${s.name}: group 은 direct | sna` };
    if (!Array.isArray(s.rows) || s.rows.length < 1) return { ok: false, error: `${s.name}: rows 가 필요합니다` };
    const rows: PcrRowRule[] = [];
    for (const r of s.rows as Record<string, unknown>[]) {
      if (typeof r?.label !== "string" || !r.label) return { ok: false, error: `${s.name}: row.label 이 필요합니다` };
      if (r.kind === "bom" || r.kind === "mfg") {
        if (s.group !== "direct") return { ok: false, error: `${r.label}: ${r.kind} 줄은 direct 구역에만` };
        r.kind === "bom" ? bom++ : mfg++;
        rows.push({ label: r.label, kind: r.kind });
      } else if (r.kind === "rate") {
        if (r.base !== "exwork" && r.base !== "contract") return { ok: false, error: `${r.label}: base 는 exwork | contract` };
        const pct = r.pct;
        if (!Array.isArray(pct) || pct.length !== types.length || !pct.every((p) => typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 100))
          return { ok: false, error: `${r.label}: pct 는 businessTypes 수(${types.length})만큼 0~100 의 수` };
        rows.push({ label: r.label, kind: "rate", base: r.base, pct: pct as number[] });
      } else return { ok: false, error: `${r.label}: kind 는 bom | mfg | rate` };
    }
    sections.push({ name: s.name, group: s.group, rows });
  }
  if (bom !== 1 || mfg !== 1) return { ok: false, error: "bom(Ex-Work) 줄과 mfg(Manufacturing) 줄이 한 번씩 있어야 합니다 — 스냅샷 원가가 빠지거나 두 번 들어가지 않게" };
  const m = o.marginPct;
  if (m !== undefined && !(typeof m === "number" && Number.isFinite(m) && m >= 0 && m <= 100)) return { ok: false, error: "marginPct 는 0~100 의 수(%)입니다" };
  return { ok: true, rules: { version: o.version, sample: typeof o.sample === "string" ? o.sample : "", businessTypes: types as string[], sections, marginPct: typeof m === "number" ? m : 0 } };
}

export interface PcrDetailRow { label: string; basis: string; values: number[] }
export interface PcrDetail {
  version: string; fingerprint: string; file: string; sample: string;
  /** 이 견적 금액을 만든 마진율(%) */
  marginPct: number;
  businessTypes: string[];
  contract: number;
  /** ccmd M-2 · 이 표의 원가 기준 = 스냅샷 재료비 + 인건비(수량 곱) — 옛 견적 body 엔 없다 */
  costBase?: number;
  /** ccmd M-2 · 이 표에 넣지 않은 스냅샷 Overhead(수량 곱) — 옛 견적 body 엔 없다 */
  snapshotOverhead?: number;
  sections: { name: string; group: "direct" | "sna"; rows: PcrDetailRow[]; subtotal: number[] }[];
  directTotal: number[]; contribution: number[]; snaTotal: number[]; fullCost: number[]; ebit: number[];
}

/** ccmd M-1 · 견적 단가 = 스냅샷 원가 × (1 + 마진율/100) — 원 단위 반올림. 마진율 0 이면 원가 그대로(옛 견적과 같다). */
export function salePrice(costTotal: number, marginPct: number): number {
  return marginPct ? Math.round(costTotal * (1 + marginPct / 100)) : costTotal;
}

const sum = (xs: number[][], n: number) => Array.from({ length: n }, (_, i) => xs.reduce((a, r) => a + r[i]!, 0));

/** 스냅샷 재료비·인건비(수량 곱한 값)와 견적 금액으로 표를 편다. 모든 칸은 원 단위 반올림. */
export function buildPcrDetail(
  input: { material: number; labor: number; contract: number; overhead?: number },
  rules: PcrRules, meta: { fingerprint: string; file: string },
): PcrDetail {
  const n = rules.businessTypes.length;
  const sections = rules.sections.map((s) => {
    const rows = s.rows.map((r): PcrDetailRow => {
      if (r.kind === "bom") return { label: r.label, basis: "BOM Data · 스냅샷 재료비", values: Array(n).fill(Math.round(input.material)) };
      if (r.kind === "mfg") return { label: r.label, basis: "스냅샷 인건비(F10)", values: Array(n).fill(Math.round(input.labor)) };
      const base = r.base === "exwork" ? input.material : input.contract;
      return { label: r.label, basis: `${r.base === "exwork" ? "Ex-Work" : "견적 금액"} × %`, values: r.pct!.map((p) => Math.round((base * p) / 100)) };
    });
    return { name: s.name, group: s.group, rows, subtotal: sum(rows.map((r) => r.values), n) };
  });
  const directTotal = sum(sections.filter((s) => s.group === "direct").map((s) => s.subtotal), n);
  const snaTotal = sum(sections.filter((s) => s.group === "sna").map((s) => s.subtotal), n);
  const contract = Math.round(input.contract);
  const fullCost = directTotal.map((d, i) => d + snaTotal[i]!);
  return {
    version: rules.version, fingerprint: meta.fingerprint, file: meta.file, sample: rules.sample, marginPct: rules.marginPct,
    businessTypes: rules.businessTypes, contract,
    costBase: Math.round(input.material) + Math.round(input.labor),
    ...(input.overhead !== undefined ? { snapshotOverhead: Math.round(input.overhead) } : {}),
    sections,
    directTotal, contribution: directTotal.map((d) => contract - d), snaTotal, fullCost, ebit: fullCost.map((f) => contract - f),
  };
}
