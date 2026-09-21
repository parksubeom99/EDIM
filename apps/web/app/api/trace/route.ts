import { NextResponse, type NextRequest } from "next/server";
import { withTenant, traceRun } from "@edim/db";
import { getServerSession } from "@/app/lib/session";

/** P6 추적 — 산출물에서 거꾸로: 스냅샷 → 코드 개정 → 카탈로그 지문 → 매크로 개정 → 승인 기록. */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const runId = req.nextUrl.searchParams.get("runId") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    return NextResponse.json({ error: "runId 형식이 올바르지 않습니다" }, { status: 400 });
  const t = await withTenant(session.tenantId, (tx) => traceRun(tx, runId));
  if (!t) return NextResponse.json({ error: "BOM 스냅샷을 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(t);
}
