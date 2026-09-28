import { platformDb } from "./client";
import type { TenantClient } from "./tenant";

/**
 * 0033 · B 학습 AI 1수준 + 이중 프로젝션.
 *   - platform* 함수 → platformDb(edim_platform) · platform 스키마만. 회사 업무 표는 권한이 없다.
 *   - 회사 쪽 함수   → withTenant 의 TenantClient(edim_app) · 착지 표 learned_suggestion 만(RLS).
 * DB①→DB② 쓰기는 platform.project_formula(SECURITY DEFINER) 하나로만 — 승인된 공식만 1행씩.
 * platform 스키마는 Prisma 모델이 아니므로(0007 과 같은 이유) raw SQL.
 */

export interface LearningSourceRow {
  id: string; kind: "drawing" | "techdoc"; title: string; origin: string; isSample: boolean;
  sha256: string | null; byteSize: number | null; createdAt: Date; monitor: unknown;
}

export async function platformListSources(): Promise<LearningSourceRow[]> {
  return platformDb.$queryRaw<LearningSourceRow[]>`
    SELECT id, kind, title, origin, is_sample AS "isSample", sha256, byte_size AS "byteSize", created_at AS "createdAt", monitor
      FROM platform.learning_source ORDER BY created_at ASC, title ASC`;
}

/** 같은 파일(sha256)은 두 번 올라가지 않는다 — null = 이미 있음 */
export async function platformInsertSource(s: { kind: "drawing" | "techdoc"; title: string; origin: string; isSample: boolean; content: Buffer; sha256: string; fileKey?: string | null }): Promise<string | null> {
  const rows = await platformDb.$queryRaw<{ id: string }[]>`
    INSERT INTO platform.learning_source (kind, title, origin, is_sample, content, sha256, byte_size, file_key)
    VALUES (${s.kind}, ${s.title}, ${s.origin}, ${s.isSample}, ${s.content}, ${s.sha256}, ${s.content.length}, ${s.fileKey ?? null})
    ON CONFLICT (sha256) DO NOTHING RETURNING id`;
  return rows[0]?.id ?? null;
}

export async function platformSourceContents(ids?: string[]): Promise<{ id: string; kind: "drawing" | "techdoc"; title: string; content: Buffer }[]> {
  return ids
    ? platformDb.$queryRaw`SELECT id, kind, title, content FROM platform.learning_source WHERE id = ANY(${ids}::uuid[]) AND content IS NOT NULL ORDER BY title`
    : platformDb.$queryRaw`SELECT id, kind, title, content FROM platform.learning_source WHERE content IS NOT NULL ORDER BY title`;
}

export async function platformSetSourceMonitor(id: string, monitor: unknown): Promise<void> {
  await platformDb.$executeRaw`UPDATE platform.learning_source SET monitor = ${JSON.stringify(monitor)}::jsonb WHERE id = ${id}::uuid`;
}

/* ───────────── 작업 · 단계 ───────────── */

export interface LearningStepRow { id: string; seq: number; tool: string; state: string; input: unknown; outputRef: unknown; error: string | null; cost: unknown; startedAt: Date | null; finishedAt: Date | null }
export interface LearningJobRow { id: string; title: string; plan: unknown; state: string; createdAt: Date; finishedAt: Date | null }

export async function platformCreateJob(title: string, plan: { tool: string; input?: unknown }[], by: string): Promise<string> {
  const rows = await platformDb.$queryRaw<{ id: string }[]>`
    INSERT INTO platform.learning_job (title, plan, created_by) VALUES (${title}, ${JSON.stringify(plan)}::jsonb, ${by}::uuid) RETURNING id`;
  const id = rows[0]!.id;
  for (const [i, s] of plan.entries())
    await platformDb.$executeRaw`INSERT INTO platform.learning_step (job_id, seq, tool, input) VALUES (${id}::uuid, ${i + 1}, ${s.tool}, ${JSON.stringify(s.input ?? {})}::jsonb)`;
  return id;
}

export async function platformSetJobState(id: string, state: "running" | "done" | "failed"): Promise<void> {
  await platformDb.$executeRaw`UPDATE platform.learning_job SET state = ${state}, finished_at = CASE WHEN ${state} IN ('done','failed') THEN now() ELSE NULL END WHERE id = ${id}::uuid`;
}

export async function platformStepStart(jobId: string, seq: number): Promise<void> {
  await platformDb.$executeRaw`UPDATE platform.learning_step SET state = 'running', started_at = now(), error = NULL WHERE job_id = ${jobId}::uuid AND seq = ${seq}`;
}
export async function platformStepFinish(jobId: string, seq: number, r: { state: "done" | "failed"; outputRef?: unknown; error?: string | null; cost?: unknown }): Promise<void> {
  await platformDb.$executeRaw`
    UPDATE platform.learning_step SET state = ${r.state}, finished_at = now(), output_ref = ${JSON.stringify(r.outputRef ?? null)}::jsonb,
           error = ${r.error ?? null}, cost = ${JSON.stringify(r.cost ?? null)}::jsonb
     WHERE job_id = ${jobId}::uuid AND seq = ${seq}`;
}

export async function platformGetJob(id: string): Promise<{ job: LearningJobRow; steps: LearningStepRow[] } | null> {
  const jobs = await platformDb.$queryRaw<LearningJobRow[]>`
    SELECT id, title, plan, state, created_at AS "createdAt", finished_at AS "finishedAt" FROM platform.learning_job WHERE id = ${id}::uuid`;
  if (!jobs[0]) return null;
  const steps = await platformDb.$queryRaw<LearningStepRow[]>`
    SELECT id, seq, tool, state, input, output_ref AS "outputRef", error, cost, started_at AS "startedAt", finished_at AS "finishedAt"
      FROM platform.learning_step WHERE job_id = ${id}::uuid ORDER BY seq`;
  return { job: jobs[0], steps };
}

export async function platformListJobs(): Promise<LearningJobRow[]> {
  return platformDb.$queryRaw<LearningJobRow[]>`
    SELECT id, title, plan, state, created_at AS "createdAt", finished_at AS "finishedAt" FROM platform.learning_job ORDER BY created_at DESC LIMIT 20`;
}

/* ───────────── 특징 ───────────── */

export interface FeatureInsert { sourceId: string; record: number; name: string; value: number; unit: string; rawLabel: string; layer: string; via: string; alignedName?: string | null; alignedBy?: string | null; alignedValue?: number | null }
export interface FeatureRow { id: string; sourceId: string; record: number; value: number; unit: string; rawLabel: string; layer: string; via: string; alignedName: string | null; alignedBy: string | null; alignedValue: number | null }

export async function platformInsertFeatures(jobId: string, rows: FeatureInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  const json = JSON.stringify(rows.map((r) => ({ ...r, alignedName: r.alignedName ?? null, alignedBy: r.alignedBy ?? null, alignedValue: r.alignedValue ?? null })));
  return platformDb.$executeRaw`
    INSERT INTO platform.learning_feature (job_id, source_id, record, name, value, unit, raw_label, layer, via, aligned_name, aligned_by, aligned_value)
    SELECT ${jobId}::uuid, x."sourceId", x.record, x.name, x.value, x.unit, x."rawLabel", x.layer, x.via, x."alignedName", x."alignedBy", x."alignedValue"
      FROM json_to_recordset(${json}::json) AS x("sourceId" uuid, record int, name text, value numeric, unit text, "rawLabel" text, layer text, via text,
                                                 "alignedName" text, "alignedBy" text, "alignedValue" numeric)`;
}

export async function platformDeleteFeatures(jobId: string): Promise<void> {
  await platformDb.$executeRaw`DELETE FROM platform.learning_feature WHERE job_id = ${jobId}::uuid`;
}

export async function platformListFeatures(jobId: string): Promise<FeatureRow[]> {
  const rows = await platformDb.$queryRaw<(Omit<FeatureRow, "value" | "alignedValue"> & { value: unknown; alignedValue: unknown })[]>`
    SELECT id, source_id AS "sourceId", record, value, unit, raw_label AS "rawLabel", layer, via, aligned_name AS "alignedName", aligned_by AS "alignedBy", aligned_value AS "alignedValue"
      FROM platform.learning_feature WHERE job_id = ${jobId}::uuid ORDER BY source_id, record, raw_label`;
  return rows.map((r) => ({ ...r, value: Number(r.value), alignedValue: r.alignedValue === null ? null : Number(r.alignedValue) }));
}

/* ───────────── 공식 ───────────── */

export interface FormulaInsert { jobId: string; target: string; expression: string; userTarget: string | null; userExpression: string | null; fit: unknown; supportSources: number; outliers: unknown; verify: unknown; description: string; localAiNote: string | null; state: "proposed" | "rejected"; note?: string }
export interface FormulaRow extends Omit<FormulaInsert, "state"> { id: string; state: string; decidedAt: Date | null; note: string; createdAt: Date }

export async function platformInsertFormula(f: FormulaInsert): Promise<string> {
  const rows = await platformDb.$queryRaw<{ id: string }[]>`
    INSERT INTO platform.learning_formula (job_id, target, expression, user_target, user_expression, fit, support_sources, outliers, verify, description, local_ai_note, state, note)
    VALUES (${f.jobId}::uuid, ${f.target}, ${f.expression}, ${f.userTarget}, ${f.userExpression}, ${JSON.stringify(f.fit)}::jsonb, ${f.supportSources},
            ${JSON.stringify(f.outliers)}::jsonb, ${JSON.stringify(f.verify)}::jsonb, ${f.description}, ${f.localAiNote}, ${f.state}, ${f.note ?? ""})
    RETURNING id`;
  return rows[0]!.id;
}

export async function platformListFormulas(jobId?: string): Promise<FormulaRow[]> {
  return jobId
    ? platformDb.$queryRaw<FormulaRow[]>`
        SELECT id, job_id AS "jobId", target, expression, user_target AS "userTarget", user_expression AS "userExpression", fit, support_sources AS "supportSources",
               outliers, verify, description, local_ai_note AS "localAiNote", state, decided_at AS "decidedAt", note, created_at AS "createdAt"
          FROM platform.learning_formula WHERE job_id = ${jobId}::uuid ORDER BY created_at`
    : platformDb.$queryRaw<FormulaRow[]>`
        SELECT id, job_id AS "jobId", target, expression, user_target AS "userTarget", user_expression AS "userExpression", fit, support_sources AS "supportSources",
               outliers, verify, description, local_ai_note AS "localAiNote", state, decided_at AS "decidedAt", note, created_at AS "createdAt"
          FROM platform.learning_formula ORDER BY created_at DESC LIMIT 100`;
}

/** 승인 = 사람이 붙이는 라벨. 후보(proposed)일 때만. */
export async function platformDecideFormula(id: string, state: "approved" | "rejected", by: string, note = ""): Promise<number> {
  return platformDb.$executeRaw`
    UPDATE platform.learning_formula SET state = ${state}, decided_by = ${by}::uuid, decided_at = now(), note = ${note}
     WHERE id = ${id}::uuid AND state = 'proposed'`;
}

/** 한쪽 방향 투영 — SECURITY DEFINER 함수만 부른다. 승인 안 된 공식이면 DB 가 예외를 던진다. */
export async function platformProjectFormula(formulaId: string, tenantId: string, by: string): Promise<string> {
  const rows = await platformDb.$queryRaw<{ sid: string }[]>`SELECT platform.project_formula(${formulaId}::uuid, ${tenantId}::uuid, ${by}::uuid) AS sid`;
  return rows[0]!.sid;
}

export interface ProjectionRow { id: string; formulaId: string; tenantId: string; tenantName: string | null; target: string; userTarget: string | null; userExpression: string | null; projectedAt: Date }
export async function platformListProjections(): Promise<ProjectionRow[]> {
  return platformDb.$queryRaw<ProjectionRow[]>`
    SELECT p.id, p.formula_id AS "formulaId", p.tenant_id AS "tenantId", t.name AS "tenantName", f.target,
           f.user_target AS "userTarget", f.user_expression AS "userExpression", p.projected_at AS "projectedAt"
      FROM platform.projection_log p JOIN platform.learning_formula f ON f.id = p.formula_id LEFT JOIN public.tenant t ON t.id = p.tenant_id
     ORDER BY p.projected_at DESC`;
}

/* ───────────── 회사 쪽 — 착지 표 ───────────── */

export interface SuggestionRow { id: string; formulaRef: string; target: string | null; expression: string | null; learnedTarget: string; learnedExpression: string; fit: unknown; description: string; state: string; adoptedMacroId: string | null; createdAt: Date }

export async function listSuggestions(tx: TenantClient): Promise<SuggestionRow[]> {
  return tx.$queryRaw<SuggestionRow[]>`
    SELECT id, formula_ref AS "formulaRef", target, expression, learned_target AS "learnedTarget", learned_expression AS "learnedExpression",
           fit, description, state, adopted_macro_id AS "adoptedMacroId", created_at AS "createdAt"
      FROM learned_suggestion ORDER BY created_at DESC`;
}

/** 회사가 바꿀 수 있는 것은 상태와 채택한 매크로 id 뿐(열 단위 권한). */
export async function setSuggestionState(tx: TenantClient, id: string, state: "adopted" | "dismissed" | "offered", macroId: string | null): Promise<number> {
  return tx.$executeRaw`UPDATE learned_suggestion SET state = ${state}, adopted_macro_id = ${macroId}::uuid WHERE id = ${id}::uuid`;
}
