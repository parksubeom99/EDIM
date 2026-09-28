import { NextResponse, type NextRequest } from "next/server";
import { requirePlatform, UUID } from "../_auth";
import { createLearningJob, runLearningJob } from "@/app/lib/learning/runner";

/** B · 학습 작업 만들기 + 실행. 계획(extract → align → mine → verify)을 먼저 적고 그 순서로 돈다. 읽기 전용 단계뿐 — 승인·투영은 따로. */
export async function POST(req: NextRequest) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const b = (await req.json().catch(() => ({}))) as { title?: unknown; sourceIds?: unknown };
  const ids = Array.isArray(b.sourceIds) ? b.sourceIds.filter((x): x is string => typeof x === "string" && UUID.test(x)) : undefined;
  const title = typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 80) : `학습 작업 ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  const jobId = await createLearningJob(title, a.userId, ids && ids.length ? ids : undefined);
  const r = await runLearningJob(jobId, a.userId);
  return NextResponse.json({ jobId, ...r }, { status: r.state === "done" ? 200 : 500 });
}
