import { NextResponse } from "next/server";
import { platformListSources, platformListJobs, platformListFormulas, platformListProjections, listTenantsForPlatform, platformGetJob } from "@edim/db";
import { requirePlatform } from "./_auth";
import { similarity } from "@/app/lib/learning/similarity";
import { localAiConfig } from "@/app/lib/learning/local-ai";
import { TOOLS, DEFAULT_PLAN } from "@/app/lib/learning/tools";

/** B · 플랫폼 콘솔 '학습' 한 화면 분량 — 원천 · 최근 작업(단계) · 공식 후보 · 투영 · 유사도 · 감시 · 로컬 AI 상태. */
export async function GET() {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const [sources, jobs, formulas, projections, tenants] = await Promise.all([
    platformListSources(), platformListJobs(), platformListFormulas(), platformListProjections(), listTenantsForPlatform(),
  ]);
  const latest = jobs[0] ? await platformGetJob(jobs[0].id) : null;
  const sim = similarity(projections.map((p) => ({ id: p.id, target: p.userTarget, expression: p.userExpression })));
  const approved = formulas.filter((f) => f.state === "approved");
  const preview = similarity(approved.map((f) => ({ id: f.id, target: f.userTarget, expression: f.userExpression })));
  const drift = sources.filter((s) => (s.monitor as { mismatched?: number } | null)?.mismatched);
  const ai = localAiConfig();
  return NextResponse.json({
    sources: sources.map((s) => ({ ...s, sha8: s.sha256?.slice(0, 8) ?? null })),
    plan: DEFAULT_PLAN.map((t) => ({ tool: t, title: TOOLS[t]!.title, readOnly: TOOLS[t]!.readOnly })),
    writeTools: (["approve", "project"] as const).map((t) => ({ tool: t, title: TOOLS[t]!.title, readOnly: TOOLS[t]!.readOnly })),
    jobs, latest, formulas: latest ? formulas.filter((f) => f.jobId === latest.job.id) : [],
    projections, similarity: sim, approvedPreview: preview,
    monitor: { sources: sources.filter((s) => s.monitor).length, drift: drift.map((s) => ({ id: s.id, title: s.title, monitor: s.monitor })) },
    tenants: tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    localAi: ai ? { on: true, model: ai.model } : { on: false, model: null },
  });
}
