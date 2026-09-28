import { NextResponse, type NextRequest } from "next/server";
import { platformGetJob, platformListFormulas } from "@edim/db";
import { requirePlatform, UUID } from "../../_auth";
import { runLearningJob } from "@/app/lib/learning/runner";

/** GET = 작업 · 단계(상태 · 비용) · 공식 후보. POST = 다시 돌리기(완료된 단계는 건너뛴다 — 재시작). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const { id } = await params;
  const j = UUID.test(id) ? await platformGetJob(id) : null;
  if (!j) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ...j, formulas: await platformListFormulas(id) });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const { id } = await params;
  if (!UUID.test(id) || !(await platformGetJob(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await runLearningJob(id, a.userId));
}
