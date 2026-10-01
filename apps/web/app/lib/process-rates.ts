import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * ccmd P · p44-6 — 공정비용(참고 · 원가 미반영). 작업장별 시간당 요율은 **파일**에서 읽는다(PCR 요율표와 같은 자리 규칙 · 조회마다 새로 읽음).
 *   1) EDIM_PROCESS_RATES(파일 경로) → 2) packages/bom-code/cost-rules/process-rates.local.json(회사 파일 · .gitignore) → 3) process-rates.sample.json(샘플)
 * 원가 · 견적 · PCR 계산 경로는 이 값을 읽지 않는다(시연 원가 ₩15,487,170 · 견적 ₩17,035,887 보호).
 */
export interface ProcessRates { version: string; sample: string; currency: string; ratePerHour: Record<string, number>; default: number | null }
export interface ProcessRatesSnap { fingerprint: string; file: string; rates: ProcessRates }

export function parseProcessRates(v: unknown): { ok: true; rates: ProcessRates } | { ok: false; error: string } {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return { ok: false, error: "객체가 아닙니다" };
  if (typeof o.version !== "string" || !o.version) return { ok: false, error: "version 이 필요합니다" };
  const r = o.ratePerHour as Record<string, unknown> | undefined;
  if (!r || typeof r !== "object") return { ok: false, error: "ratePerHour(작업장 코드 → 원/인·시)가 필요합니다" };
  const rate: Record<string, number> = {};
  for (const [k, x] of Object.entries(r)) {
    if (typeof x !== "number" || !Number.isFinite(x) || x < 0) return { ok: false, error: `${k}: 요율은 0 이상의 수` };
    rate[k] = x;
  }
  const d = o.default;
  if (d !== undefined && d !== null && !(typeof d === "number" && Number.isFinite(d) && d >= 0)) return { ok: false, error: "default 는 0 이상의 수" };
  return { ok: true, rates: { version: o.version, sample: typeof o.sample === "string" ? o.sample : "", currency: typeof o.currency === "string" ? o.currency : "KRW", ratePerHour: rate, default: typeof d === "number" ? d : null } };
}

function ratesDir(): string | null {
  let d = process.cwd();
  for (let i = 0; i < 6; i++) {
    const c = join(d, "packages", "bom-code", "cost-rules");
    if (existsSync(join(c, "process-rates.sample.json"))) return c;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}

export function loadProcessRates(): { ok: true; snap: ProcessRatesSnap } | { ok: false; error: string } {
  const env = process.env.EDIM_PROCESS_RATES;
  const dir = ratesDir();
  const path = env ? resolve(env) : dir ? (existsSync(join(dir, "process-rates.local.json")) ? join(dir, "process-rates.local.json") : join(dir, "process-rates.sample.json")) : null;
  if (!path || !existsSync(path)) return { ok: false, error: env ? `공정 요율 파일을 찾을 수 없습니다(EDIM_PROCESS_RATES=${env})` : "공정 요율 파일이 없습니다" };
  let text: string;
  try { text = readFileSync(path, "utf-8"); } catch { return { ok: false, error: `공정 요율 파일을 읽을 수 없습니다: ${basename(path)}` }; }
  let json: unknown;
  try { json = JSON.parse(text); } catch { return { ok: false, error: `공정 요율 파일이 JSON 이 아닙니다: ${basename(path)}` }; }
  const p = parseProcessRates(json);
  if (!p.ok) return { ok: false, error: `공정 요율 ${basename(path)} — ${p.error}` };
  return { ok: true, snap: { fingerprint: createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex").slice(0, 12), file: basename(path), rates: p.rates } };
}

export interface ProcessCostRow { seq: number; name: string; center: string; hours: number; persons: number; qty: number; rate: number | null; amount: number | null }
/** 결정론: 단계마다 시간 × 인원 × 수량 × 요율(작업장 코드 → 없으면 default → 없으면 계산 안 함 · 합에서 빠짐을 표시). 원 단위 반올림. */
export function processCostOf(steps: { seq: number; name: string; center: string; hours: number; persons: number }[], qty: number, rates: ProcessRates) {
  const rows: ProcessCostRow[] = steps.map((s) => {
    const rate = rates.ratePerHour[s.center] ?? rates.default;
    return { seq: s.seq, name: s.name, center: s.center, hours: s.hours, persons: s.persons, qty, rate, amount: rate === null ? null : Math.round(s.hours * s.persons * qty * rate) };
  });
  return { rows, total: rows.reduce((a, r) => a + (r.amount ?? 0), 0), missing: rows.filter((r) => r.amount === null).map((r) => r.center) };
}
