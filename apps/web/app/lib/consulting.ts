import type { ProductCode } from "@edim/bom-code";
import { designFacts, detailFacts, type DetailDim, type SectionDim } from "@edim/bom-code";
import { selectFan, type FanSegment } from "./special/fan";

/**
 * ccmd K · KB-1 — 컨설팅 트랙 1 "내부 최적안"(순수 함수 · 결정론 · LLM 0). 회사가 **자기** BOM 스냅샷 하나를 분석해 제안을 받는다.
 * 제안은 읽기 전용이다 — 적용 버튼 없음(적용은 사람이 기존 화면에서). 모든 제안에 근거 행 id 를 붙인다.
 *   공급처  : 같은 자재 코드 · 같은 품목(item)에 대해 단가 이력상 더 싼 등록 공급처(공급처별 최신 유효 행)가 있으면 (차액 × 수량)
 *   팬 효율 : 스냅샷에 dims.special 이 있으면 같은 운전점에서 효율이 더 높은 후보(special_fan_candidates 범위 안) · 연간 절감 kWh = 가정 운전시간(샘플) × 축동력 차
 *   설계 여유: 설계 검증 규칙(max · min) 대비 여유가 5% 미만인 항목(위반은 아니지만 위험) — 규칙 표의 행을 근거로
 */
export const SAMPLE_HOURS_PER_YEAR = 4000;   // 가정 운전시간(샘플) — 화면 · 인쇄본에 표시한다
export const MARGIN_LIMIT = 0.05;

export type Evidence = { kind: "price_history" | "bom_line" | "special_candidate" | "rule_row" | "bom_run"; id: string; note?: string };
export interface Proposal {
  kind: "supplier" | "fan" | "margin";
  title: string;
  detail: string;
  saving: { amount: number; unit: "KRW" | "kWh/yr" } | null;
  evidence: Evidence[];
}

export interface SnapLineLite {
  no?: unknown; childCode?: unknown; part?: unknown; qty?: unknown; unitCost?: unknown; supplier?: unknown;
  priceSource?: { kind?: string; priceId?: string; supplier?: string | null } | null;
}
export interface PriceLite { id: string; code: string; item: string; price: number; currency: string; supplier: string | null; effectiveFrom: string; createdAt: string }

const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

export function supplierProposals(runId: string, lines: SnapLineLite[], prices: PriceLite[], today: string): Proposal[] {
  const out: Proposal[] = [];
  for (const l of lines) {
    const code = typeof l.childCode === "string" ? l.childCode : "";
    const qty = typeof l.qty === "number" ? l.qty : 0;
    const unit = typeof l.unitCost === "number" ? l.unitCost : 0;
    if (!code || qty <= 0 || unit <= 0) continue;
    const src = l.priceSource?.priceId ? prices.find((p) => p.id === l.priceSource!.priceId) : undefined;
    const item = src?.item ?? "";
    const curSupplier = (src?.supplier ?? (typeof l.supplier === "string" ? l.supplier : null)) || null;
    const latestBySupplier = new Map<string, PriceLite>();
    for (const p of prices) {
      if (p.code !== code || p.item !== item || p.currency !== "KRW" || !p.supplier || p.effectiveFrom > today) continue;
      const cur = latestBySupplier.get(p.supplier);
      if (!cur || p.effectiveFrom > cur.effectiveFrom || (p.effectiveFrom === cur.effectiveFrom && p.createdAt > cur.createdAt)) latestBySupplier.set(p.supplier, p);
    }
    const best = [...latestBySupplier.values()]
      .filter((p) => p.supplier !== curSupplier && p.price < unit)
      .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))[0];
    if (!best) continue;
    const saving = Math.round((unit - best.price) * qty);
    out.push({
      kind: "supplier",
      title: `${code} — 더 싼 등록 공급처 ${best.supplier}`,
      detail: `스냅샷 단가 ${won(unit)}${curSupplier ? `(${curSupplier})` : ""} → ${best.supplier} ${won(best.price)}(${best.effectiveFrom} 유효) · 수량 ${qty} · 차액 ${won(saving)}`,
      saving: { amount: saving, unit: "KRW" },
      evidence: [{ kind: "bom_line", id: `${runId}#${String(l.no ?? "")}` }, { kind: "price_history", id: best.id }, ...(src ? [{ kind: "price_history" as const, id: src.id, note: "스냅샷 단가 출처" }] : [])],
    });
  }
  return out;
}

export interface SpecialSnapLite { input?: { q_cmh?: number; p_pa?: number; rho?: number }; result?: { model?: string; rpm?: number; eta?: number; shaftKw?: number } }

/** 같은 운전점 · 지금 받을 수 있는 후보 구간(교점 구간 2점)만으로 다시 고른다. 스냅샷 선정보다 효율이 높은 후보가 있으면 제안. */
export function fanProposals(runId: string, sp: SpecialSnapLite | null, segs: FanSegment[] | null, hours = SAMPLE_HOURS_PER_YEAR): { proposals: Proposal[]; note: string } {
  if (!sp || !sp.input || !sp.result) return { proposals: [], note: "이 스냅샷에는 Special 팬 선정 결과가 없습니다(팬 효율 분석 대상 아님)" };
  if (!segs) return { proposals: [], note: "팬 선정 부여가 없어 후보 구간을 받을 수 없습니다" };
  const q = Number(sp.input.q_cmh), p = Number(sp.input.p_pa);
  const r = selectFan({ qCmh: q, pPa: p, ...(sp.input.rho !== undefined ? { rho: Number(sp.input.rho) } : {}) }, segs);
  if (!r.ok) return { proposals: [], note: `같은 운전점(${q} CMH · ${p} Pa)에서 지금 받을 수 있는 후보가 없습니다` };
  const curEta = Number(sp.result.eta ?? 0), curShaft = Number(sp.result.shaftKw ?? 0);
  const better = r.candidates.filter((c) => c.eta > curEta && !(c.model === sp.result!.model && c.rpm === sp.result!.rpm));
  if (better.length === 0) return { proposals: [], note: `스냅샷 선정(${sp.result.model} · ${sp.result.rpm} rpm · η ${curEta})이 같은 운전점 후보 ${r.candidates.length}개 중 효율 최고입니다` };
  const b = better[0]!;
  const kwh = Math.round((curShaft - b.shaftKw) * hours);
  return {
    proposals: [{
      kind: "fan",
      title: `팬 — 같은 운전점에서 효율이 더 높은 ${b.model} · ${b.rpm} rpm`,
      detail: `η ${curEta} → ${b.eta} · 축동력 ${curShaft} → ${b.shaftKw} kW · 가정 운전시간 ${hours.toLocaleString("ko-KR")} h/년(샘플) → 연간 약 ${kwh.toLocaleString("ko-KR")} kWh 절감`,
      saving: { amount: kwh, unit: "kWh/yr" },
      evidence: [{ kind: "bom_run", id: runId, note: "dims.special" }, { kind: "special_candidate", id: `${b.model}@${b.rpm}` }],
    }],
    note: `후보 ${r.candidates.length}개 비교`,
  };
}

/** 규칙 표(role rule)의 max · min 행을 스냅샷 사실에 대 본다 — 여유 = |한계 − 실제| ÷ 한계. 0 ≤ 여유 < 5% 면 제안(위반은 도면 단계에서 이미 막힌다). */
export function marginProposals(runId: string, product: ProductCode | null, dims: Record<string, unknown> | null, limit = MARGIN_LIMIT): Proposal[] {
  if (!product || !dims) return [];
  const entry = Object.entries(product.tables ?? {}).find(([, t]) => t.role === "rule");
  if (!entry) return [];
  const [tName, t] = entry;
  const W = Number(dims.W), H = Number(dims.H), L = Number(dims.L);
  if (![W, H, L].every(Number.isFinite)) return [];
  const secs = (Array.isArray(dims.sections) ? dims.sections : []) as SectionDim[];
  const details = (Array.isArray(dims.detail) ? dims.detail : []) as DetailDim[];
  const facts: Record<string, number> = { ...designFacts({ W, H, L }, secs), ...detailFacts(details) };
  const colOf = (nm: string) => t.cols.find((c) => c.name.toLowerCase() === nm)?.key;
  const kT = colOf("target"), kO = colOf("op"), kV = colOf("value"), kN = colOf("name");
  if (!kT || !kO || !kV) return [];
  const out: Proposal[] = [];
  for (const r of t.rows) {
    const rawT = String(r.cells[kT] ?? "").trim();
    const target = /^detail\./i.test(rawT) ? `detail.${rawT.slice(7)}` : rawT.toUpperCase();
    const op = String(r.cells[kO] ?? "").toLowerCase();
    const lim = Number(r.cells[kV]);
    const actual = facts[target];
    if ((op !== "max" && op !== "min") || !Number.isFinite(lim) || lim === 0 || actual === undefined) continue;
    const m = op === "max" ? (lim - actual) / lim : (actual - lim) / lim;
    if (m < 0 || m >= limit) continue;
    const name = String(r.cells[kN ?? ""] ?? r.item);
    out.push({
      kind: "margin",
      title: `설계 여유 ${Math.round(m * 1000) / 10}% — ${name}`,
      detail: `${target} ${op === "max" ? "≤" : "≥"} ${lim} · 지금 ${actual} — 위반은 아니지만 여유가 ${limit * 100}% 미만입니다(사이즈 · 치수 변경 시 먼저 걸립니다)`,
      saving: null,
      evidence: [{ kind: "rule_row", id: `${product.code}#${tName}.${r.item}` }, { kind: "bom_run", id: runId }],
    });
  }
  return out;
}
