import { NextResponse, type NextRequest } from "next/server";
import { requirePlatform } from "../../../_auth";
import { runWriteTool } from "@/app/lib/learning/runner";

/** 투영 — 승인 공식 → π_user → 그 회사 착지 표(한쪽 방향 · DB 함수 platform.project_formula). 미승인 409 · 중복 409. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { tenantId?: unknown };
  const r = await runWriteTool("project", { formulaId: id, tenantId: b.tenantId }, a.userId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, ...r.outputRef });
}
