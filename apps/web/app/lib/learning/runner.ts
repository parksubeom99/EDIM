import {
  platformCreateJob, platformGetJob, platformSetJobState, platformStepStart, platformStepFinish, platformListSources,
} from "@edim/db";
import { TOOLS, DEFAULT_PLAN, type ToolCtx } from "./tools";
import { newUsage } from "./local-ai";

/**
 * B · 학습 작업 실행기 — **계획 먼저**: 작업을 만들 때 단계 목록을 learning_job.plan 에 적고, 실행은 그 목록을 따른다.
 * 단계 상태(대기 · 실행 · 완료 · 실패)는 learning_step 에 남는다(= 작업 그래프). 다시 돌리면 완료된 단계는 건너뛴다(재시작).
 * 단계마다 비용을 적는다: 걸린 ms · 처리 행 수 · 로컬 AI 호출 수 · 토큰(입력/출력) · 모델 — 나중 과금·운영의 근거.
 */
export async function createLearningJob(title: string, actorId: string, sourceIds?: string[]): Promise<string> {
  const plan = DEFAULT_PLAN.map((tool) => ({ tool, input: tool === "extract" && sourceIds ? { sourceIds } : {} }));
  return platformCreateJob(title, plan, actorId);
}

export async function runLearningJob(jobId: string, actorId: string): Promise<{ state: "done" | "failed"; error?: string }> {
  const j = await platformGetJob(jobId);
  if (!j) return { state: "failed", error: "작업 없음" };
  const titles = new Map((await platformListSources()).map((s) => [s.id, s.title]));
  await platformSetJobState(jobId, "running");
  for (const step of j.steps) {
    if (step.state === "done") continue;
    const tool = TOOLS[step.tool];
    const input = { ...((step.input as Record<string, unknown>) ?? {}) };
    const ctx: ToolCtx = { jobId, actorId, usage: newUsage() };
    const bad = !tool ? `모르는 도구 ${step.tool}` : tool.validate(input) ?? tool.authorize(ctx);
    if (bad) {
      await platformStepFinish(jobId, step.seq, { state: "failed", error: bad });
      await platformSetJobState(jobId, "failed");
      return { state: "failed", error: bad };
    }
    await platformStepStart(jobId, step.seq);
    const t0 = Date.now();
    try {
      const r = await tool!.run({ ...input, titles }, ctx);
      await platformStepFinish(jobId, step.seq, { state: "done", outputRef: r.outputRef, cost: costOf(t0, r.rows, ctx) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await platformStepFinish(jobId, step.seq, { state: "failed", error: msg.slice(0, 500), cost: costOf(t0, 0, ctx) });
      await platformSetJobState(jobId, "failed");
      return { state: "failed", error: msg };
    }
  }
  await platformSetJobState(jobId, "done");
  return { state: "done" };
}

function costOf(t0: number, rows: number, ctx: ToolCtx) {
  const u = ctx.usage;
  return { ms: Date.now() - t0, rows, localAi: { calls: u.calls, promptTokens: u.promptTokens, outputTokens: u.outputTokens, ms: u.ms, model: u.model, ...(u.error ? { error: u.error } : {}) } };
}

/** 쓰기 도구(approve · project) — 관리자가 화면에서 누른 것만(adminApproved). 같은 수명주기를 거친다. */
export async function runWriteTool(name: "approve" | "project", input: Record<string, unknown>, actorId: string): Promise<{ ok: true; outputRef: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const tool = TOOLS[name]!;
  const ctx: ToolCtx = { jobId: "", actorId, adminApproved: true, usage: newUsage() };
  const bad = tool.validate(input) ?? tool.authorize(ctx);
  if (bad) return { ok: false, status: 400, error: bad };
  try {
    const r = await tool.run(input, ctx);
    return { ok: true, outputRef: r.outputRef };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: /not approved|not found/.test(msg) ? 409 : /duplicate|unique|23505/i.test(msg) ? 409 : 500, error: msg.split("\n").slice(-1)[0]!.slice(0, 300) };
  }
}
