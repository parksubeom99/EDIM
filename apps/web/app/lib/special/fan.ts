/**
 * C · Special '팬 선정' 계산(결정론 · 손 계산과 대조 — test/fan.test.ts).
 *
 * 입력: 풍량 Q₀[CMH] · 기외정압 Pₛ[Pa] · 밀도 ρ(기본 1.2).
 *  1. 계통 곡선 P = k·Q², k = Pₛ / Q₀²
 *  2. 팬 곡선(모델 · 회전수)과 계통 곡선의 교점 = 동작점 — 곡선 점 사이 선형 보간 + 이분법. 곡선 범위 밖이면 그 후보 제외.
 *  3. 교점 Q 가 Q₀ 의 ±5 % 안인 후보만
 *  4. 효율 η 도 같은 구간에서 보간 · 축동력 kW = Q[m³/s] × P / (η × 1000) × (ρ / 1.2)
 *  5. 모터 = 축동력 × 1.15 이상인 표준 모터 목록의 최소값
 *  6. 선정 = 효율 최대(동률이면 모터 작은 쪽)
 * 곡선 원자료는 받지 않는다 — DB 함수 special_fan_candidates 가 **교점을 품은 한 구간(점 2개)** 만 준다(관리자 자료 보호).
 */
export interface FanInput { qCmh: number; pPa: number; rho?: number }
/** 교점을 품은 한 구간 — 없으면 그 곡선은 범위 밖(q1 = null) */
export interface FanSegment { model: string; rpm: number; q1: number | null; p1: number | null; e1: number | null; q2: number | null; p2: number | null; e2: number | null }
export interface FanPick { model: string; rpm: number; q: number; p: number; eta: number; shaftKw: number; motorKw: number }
export type FanResult =
  | { ok: true; pick: FanPick; candidates: FanPick[]; dropped: { model: string; rpm: number; why: string }[]; k: number }
  | { ok: false; reason: string; dropped: { model: string; rpm: number; why: string }[]; k: number };

export const STANDARD_MOTORS_KW = [0.75, 1.5, 2.2, 3.7, 5.5, 7.5, 11, 15] as const;
export const MOTOR_MARGIN = 1.15;
export const Q_TOLERANCE = 0.05;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function validateFanInput(i: Partial<FanInput>): string | null {
  const q = Number(i.qCmh), p = Number(i.pPa), rho = i.rho === undefined ? 1.2 : Number(i.rho);
  if (!Number.isFinite(q) || q <= 0 || q > 1_000_000) return "풍량은 0 보다 큰 CMH";
  if (!Number.isFinite(p) || p <= 0 || p > 10_000) return "기외정압은 0 보다 큰 Pa";
  if (!Number.isFinite(rho) || rho < 0.5 || rho > 2) return "밀도는 0.5~2.0 kg/m³";
  return null;
}

/** 계통 곡선과 선형 구간의 교점 — 이분법(구간 끝에서 부호가 바뀌어야 한다). */
export function intersect(seg: { q1: number; p1: number; q2: number; p2: number }, k: number): number | null {
  const f = (q: number) => seg.p1 + ((seg.p2 - seg.p1) * (q - seg.q1)) / (seg.q2 - seg.q1) - k * q * q;
  let a = seg.q1, b = seg.q2, fa = f(a), fb = f(b);
  const eps = 1e-9 * Math.max(1, Math.abs(seg.p1), Math.abs(seg.p2));   // 끝점이 교점이면 부동소수 찌꺼기로 놓치지 않게
  if (Math.abs(fa) <= eps) return a;
  if (Math.abs(fb) <= eps) return b;
  if (fa * fb > 0) return null;
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2, fm = f(m);
    if (fm === 0 || b - a < 1e-6) return m;
    if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return (a + b) / 2;
}

export function motorFor(shaftKw: number): number | null {
  return STANDARD_MOTORS_KW.find((m) => m >= shaftKw * MOTOR_MARGIN) ?? null;
}

export function selectFan(input: FanInput, segs: FanSegment[]): FanResult {
  const rho = input.rho ?? 1.2;
  const k = input.pPa / (input.qCmh * input.qCmh);
  const dropped: { model: string; rpm: number; why: string }[] = [];
  const candidates: FanPick[] = [];
  for (const s of segs) {
    if (s.q1 === null || s.q2 === null || s.p1 === null || s.p2 === null || s.e1 === null || s.e2 === null) { dropped.push({ model: s.model, rpm: s.rpm, why: "동작점이 곡선 범위 밖" }); continue; }
    const q = intersect({ q1: s.q1, p1: s.p1, q2: s.q2, p2: s.p2 }, k);
    if (q === null) { dropped.push({ model: s.model, rpm: s.rpm, why: "동작점이 곡선 범위 밖" }); continue; }
    if (Math.abs(q - input.qCmh) > input.qCmh * Q_TOLERANCE) { dropped.push({ model: s.model, rpm: s.rpm, why: `동작점 풍량 ${Math.round(q)} CMH — 요구의 ±5 % 밖` }); continue; }
    const t = (q - s.q1) / (s.q2 - s.q1);
    const p = k * q * q;
    const eta = s.e1 + (s.e2 - s.e1) * t;
    const shaftKw = ((q / 3600) * p) / (eta * 1000) * (rho / 1.2);
    const motor = motorFor(shaftKw);
    if (motor === null) { dropped.push({ model: s.model, rpm: s.rpm, why: `축동력 ${r3(shaftKw)} kW — 표준 모터(15 kW) 초과` }); continue; }
    candidates.push({ model: s.model, rpm: s.rpm, q: r3(q), p: r3(p), eta: r3(eta), shaftKw: r3(shaftKw), motorKw: motor });
  }
  if (candidates.length === 0) return { ok: false, reason: "적합한 팬 없음 — 모든 후보가 범위 밖이거나 ±5 % 를 벗어났습니다", dropped, k };
  const sorted = [...candidates].sort((a, b) => b.eta - a.eta || a.motorKw - b.motorKw);
  return { ok: true, pick: sorted[0]!, candidates: sorted, dropped, k };
}

/** 곡선(점 목록)에서 교점을 품은 구간 찾기 — DB 함수와 같은 규칙(시험·시드 대조용). */
export function bracketOf(points: { q: number; p: number; eta: number }[], k: number): Omit<FanSegment, "model" | "rpm"> {
  const pts = [...points].sort((a, b) => a.q - b.q);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const fa = a.p - k * a.q * a.q, fb = b.p - k * b.q * b.q;
    if (fa === 0 || fa * fb < 0 || fb === 0) return { q1: a.q, p1: a.p, e1: a.eta, q2: b.q, p2: b.p, e2: b.eta };
  }
  return { q1: null, p1: null, e1: null, q2: null, p2: null, e2: null };
}
