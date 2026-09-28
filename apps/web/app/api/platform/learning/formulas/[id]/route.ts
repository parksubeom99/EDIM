import { NextResponse, type NextRequest } from "next/server";
import { requirePlatform } from "../../_auth";
import { runWriteTool } from "@/app/lib/learning/runner";

/** 공식 승인/반려 — 사람이 붙이는 라벨(쓰기 도구 approve · 관리자 승인 관문). 후보(proposed)일 때만. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { decision?: unknown; note?: unknown };
  const r = await runWriteTool("approve", { formulaId: id, decision: b.decision, note: b.note }, a.userId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  if (!r.outputRef.changed) return NextResponse.json({ error: "후보(proposed) 상태가 아니거나 없는 공식" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
