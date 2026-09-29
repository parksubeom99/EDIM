import { createHash } from "node:crypto";
import { listSpecialGrants, fanCandidates, type TenantClient } from "@edim/db";
import { resolveSpecialInputs, type Dims, type ProductCode, type SlotValues, type SpecialCall, type SpecialValues } from "@edim/bom-code";
import { selectFan, validateFanInput, type FanPick } from "./fan";

/**
 * ccmd K · KA — CPQ 가 BOM Run 안에서 Special(팬 선정)을 부른다(결정론 · LLM 0).
 *   입력 = 제품 코드의 special 표가 가리키는 등록 값(치수 · 표 칸 · 상수) — 사람이 다시 입력하지 않는다.
 *   부여(special_grant) 확인 → special_fan_candidates(교점 구간만) → selectFan → 스냅샷 dims.special 에 박을 값.
 *   곡선 지문 = 받은 교점 구간(회사 쪽에 닿는 유일한 곡선 자료)의 sha256 앞 12자 — 성능표가 바뀌면 지문이 바뀐다.
 * 사용 기록(과금)은 스냅샷을 저장한 뒤 같은 트랜잭션에서 1행 — 호출하는 쪽(BOM Run)이 넣는다.
 */
export interface SpecialSnapshot {
  program: string;
  version: number;
  input: Record<string, number>;
  inputSources: Record<string, string>;
  result: { model: string; rpm: number; q: number; p: number; eta: number; shaftKw: number; motorKw: number; candidates: number; dropped: number };
  grantId: string;
  curveFingerprint: string;
  price: number;
  currency: string;
  sample: string;
}

export type SpecialCallOutcome =
  | { ok: true; snapshot: SpecialSnapshot; values: SpecialValues }
  | { ok: true; snapshot: null; values: null; notice: string }
  | { ok: false; status: 422; error: string };

/** 선정 결과 → `{special.<필드>}` 로 읽는 평평한 값. 사양 문자열 · 단가 행 선택(bySpecial)이 이 값을 읽는다. */
export function specialValuesOf(pick: FanPick): SpecialValues {
  return {
    model: pick.model, rpm: pick.rpm, q: Math.round(pick.q), p: Math.round(pick.p), eta: pick.eta,
    etaPct: Math.round(pick.eta * 1000) / 10, shaftKw: pick.shaftKw, motorKw: String(pick.motorKw),
  };
}

export function curveFingerprintOf(segs: unknown): string {
  return createHash("sha256").update(JSON.stringify(segs)).digest("hex").slice(0, 12);
}

export async function callSpecialForBom(
  tx: TenantClient, product: ProductCode, call: SpecialCall, slots: SlotValues, dims: Dims | null,
): Promise<SpecialCallOutcome> {
  const skip = (why: string): SpecialCallOutcome => call.required ? { ok: false, status: 422, error: why } : { ok: true, snapshot: null, values: null, notice: why };
  if (call.program !== "fan-select") return skip(`Special 프로그램 '${call.program}' 은 BOM Run 호출을 지원하지 않습니다(지금은 fan-select 만)`);
  const grant = (await listSpecialGrants(tx)).find((g) => g.programKey === call.program);
  if (!grant) return skip("Special 부여 필요 — 플랫폼에 의뢰하세요(팬 선정 · Company Info. ▸ 플랫폼에 의뢰)");
  const got = resolveSpecialInputs(product, call, slots, dims);
  if (!got.ok) return skip(got.message);
  const input = { qCmh: got.values.q_cmh ?? NaN, pPa: got.values.p_pa ?? NaN, ...(got.values.rho !== undefined ? { rho: got.values.rho } : {}) };
  const bad = validateFanInput(input);
  if (bad) return skip(`Special 입력이 맞지 않습니다 — ${bad} (special 표의 q_cmh · p_pa 출처 확인)`);
  const segs = await fanCandidates(tx, input.qCmh, input.pPa);
  const r = selectFan(input, segs);
  if (!r.ok) return skip(`Special 팬 선정 불가 — ${r.reason} (풍량 ${input.qCmh} CMH · 정압 ${input.pPa} Pa)`);
  const p = r.pick;
  return {
    ok: true,
    values: specialValuesOf(p),
    snapshot: {
      program: call.program, version: grant.version, input: got.values, inputSources: got.sources,
      result: { model: p.model, rpm: p.rpm, q: p.q, p: p.p, eta: p.eta, shaftKw: p.shaftKw, motorKw: p.motorKw, candidates: r.candidates.length, dropped: r.dropped.length },
      grantId: grant.id, curveFingerprint: curveFingerprintOf(segs), price: grant.pricePerRun, currency: grant.currency,
      sample: "샘플 성능표 기준 — 실제 제조사 자료 아님",
    },
  };
}
