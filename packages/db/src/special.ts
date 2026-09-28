import { platformDb } from "./client";
import type { TenantClient } from "./tenant";

/**
 * 0034 · C Special Tool Box — 팬 선정.
 *   platform* 함수 → platformDb(edim_platform): 프로그램 목록 · 부여(grant_special 함수) · 부여 목록 · 과금 합계(금액 칸만).
 *   회사 쪽 함수   → TenantClient(edim_app): 내 부여 · 팬 후보(special_fan_candidates 함수 — 교점 구간만) · 회사 자체 표 · 사용 기록.
 */

export interface SpecialProgramRow { id: string; key: string; version: number; title: string; uiFormRef: unknown; binding: unknown; pricePerRun: number; currency: string; state: string; isSample: boolean }
export async function platformListPrograms(): Promise<SpecialProgramRow[]> {
  const rows = await platformDb.$queryRaw<(Omit<SpecialProgramRow, "pricePerRun"> & { pricePerRun: unknown })[]>`
    SELECT id, key, version, title, ui_form_ref AS "uiFormRef", binding, price_per_run AS "pricePerRun", currency, state, is_sample AS "isSample"
      FROM platform.special_program ORDER BY key`;
  return rows.map((r) => ({ ...r, pricePerRun: Number(r.pricePerRun) }));
}

/** 승인된 Special 의뢰 → 그 회사에 grant(함수 · 승인 안 된 의뢰는 DB 가 거절). */
export async function platformGrantSpecial(requestId: string, programKey: string, by: string): Promise<string> {
  const rows = await platformDb.$queryRaw<{ gid: string }[]>`SELECT platform.grant_special(${requestId}::uuid, ${programKey}, ${by}::uuid) AS gid`;
  return rows[0]!.gid;
}

export interface GrantBillingRow { tenantId: string; tenantName: string | null; programKey: string; grantedAt: Date; runs: number; amount: number; currency: string }
/** 부여 목록 + 과금 합계 — 사용 기록의 금액 칸만 읽는다(입력·결과 값은 플랫폼 권한 밖). */
export async function platformGrantsWithBilling(): Promise<GrantBillingRow[]> {
  const rows = await platformDb.$queryRaw<(Omit<GrantBillingRow, "amount" | "runs"> & { amount: unknown; runs: unknown })[]>`
    SELECT g.tenant_id AS "tenantId", t.name AS "tenantName", g.program_key AS "programKey", g.granted_at AS "grantedAt", g.currency,
           (SELECT count(*) FROM public.special_run r WHERE r.tenant_id = g.tenant_id AND r.program_key = g.program_key) AS runs,
           (SELECT COALESCE(sum(r.price), 0) FROM public.special_run r WHERE r.tenant_id = g.tenant_id AND r.program_key = g.program_key) AS amount
      FROM public.special_grant g LEFT JOIN public.tenant t ON t.id = g.tenant_id ORDER BY g.granted_at`;
  return rows.map((r) => ({ ...r, runs: Number(r.runs), amount: Number(r.amount) }));
}

/* ───────────── 회사 쪽 ───────────── */

export interface SpecialGrantRow { id: string; programKey: string; version: number; title: string; pricePerRun: number; currency: string; binding: unknown; formId: string | null; grantedAt: Date }
export async function listSpecialGrants(tx: TenantClient): Promise<SpecialGrantRow[]> {
  const rows = await tx.$queryRaw<(Omit<SpecialGrantRow, "pricePerRun"> & { pricePerRun: unknown })[]>`
    SELECT id, program_key AS "programKey", version, title, price_per_run AS "pricePerRun", currency, binding, form_id AS "formId", granted_at AS "grantedAt"
      FROM special_grant ORDER BY granted_at`;
  return rows.map((r) => ({ ...r, pricePerRun: Number(r.pricePerRun) }));
}

export interface FanSegmentRow { model: string; rpm: number; q1: number | null; p1: number | null; e1: number | null; q2: number | null; p2: number | null; e2: number | null }
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
/** DB① 팬 성능표에서 교점을 품은 구간만(함수) — grant 가 없으면 DB 가 거절한다. */
export async function fanCandidates(tx: TenantClient, q: number, p: number): Promise<FanSegmentRow[]> {
  const rows = await tx.$queryRaw<Record<string, unknown>[]>`SELECT * FROM special_fan_candidates(${q}::numeric, ${p}::numeric)`;
  return rows.map((r) => ({ model: String(r.model), rpm: Number(r.rpm), q1: num(r.q1), p1: num(r.p1), e1: num(r.e1), q2: num(r.q2), p2: num(r.p2), e2: num(r.e2) }));
}

export async function tenantFanCurves(tx: TenantClient): Promise<{ model: string; rpm: number; points: { q: number; p: number; eta: number }[] }[]> {
  const rows = await tx.$queryRaw<{ model: string; rpm: number; q: unknown; p: unknown; eta: unknown }[]>`
    SELECT model, rpm, q_cmh AS q, p_pa AS p, eta FROM tenant_fan_curve ORDER BY model, rpm, q_cmh`;
  const by = new Map<string, { model: string; rpm: number; points: { q: number; p: number; eta: number }[] }>();
  for (const r of rows) {
    const k = `${r.model}|${r.rpm}`;
    const c = by.get(k) ?? { model: r.model, rpm: Number(r.rpm), points: [] };
    c.points.push({ q: Number(r.q), p: Number(r.p), eta: Number(r.eta) });
    by.set(k, c);
  }
  return [...by.values()];
}

export interface SpecialRunInsert { programKey: string; version: number; input: unknown; result: unknown; bindingSource: "platform" | "tenant"; price: number; currency: string; createdBy: string; tenantId: string }
export async function insertSpecialRun(tx: TenantClient, r: SpecialRunInsert): Promise<string> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO special_run (tenant_id, program_key, version, input, result, binding_source, price, currency, created_by)
    VALUES (${r.tenantId}::uuid, ${r.programKey}, ${r.version}, ${JSON.stringify(r.input)}::jsonb, ${JSON.stringify(r.result)}::jsonb, ${r.bindingSource}, ${r.price}, ${r.currency}, ${r.createdBy}::uuid)
    RETURNING id`;
  return rows[0]!.id;
}

export interface SpecialRunRow { id: string; programKey: string; input: unknown; result: unknown; bindingSource: string; price: number; currency: string; createdAt: Date }
export async function listSpecialRuns(tx: TenantClient, programKey: string): Promise<SpecialRunRow[]> {
  const rows = await tx.$queryRaw<(Omit<SpecialRunRow, "price"> & { price: unknown })[]>`
    SELECT id, program_key AS "programKey", input, result, binding_source AS "bindingSource", price, currency, created_at AS "createdAt"
      FROM special_run WHERE program_key = ${programKey} ORDER BY created_at DESC LIMIT 50`;
  return rows.map((r) => ({ ...r, price: Number(r.price) }));
}
