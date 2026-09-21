import { NextResponse, type NextRequest } from "next/server";
import {
  withTenant, createPurchaseRequest, listPurchaseRequests, PrDuplicateError, PrEmptyError,
} from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { documentSourceFromRun } from "@/app/lib/output/document-source";
import { purchaseLinesOf, noCoreOf } from "@/app/lib/output/document";

/** GET = 구매 요청 목록 · POST = BOM 스냅샷의 구매 품목으로 구매 요청을 만든다(p51). */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const node = req.nextUrl.searchParams.get("node");
  const rows = await withTenant(session.tenantId, (tx) => listPurchaseRequests(tx, node));
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const runId = typeof b.runId === "string" ? b.runId : "";
  if (!runId) return NextResponse.json({ error: "runId 필요 — 구매 요청은 BOM 스냅샷에서 나옵니다" }, { status: 400 });

  let requiredDate: Date | null = null;
  if (typeof b.requiredDate === "string" && b.requiredDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.requiredDate) || Number.isNaN(Date.parse(b.requiredDate)))
      return NextResponse.json({ error: "필요일은 YYYY-MM-DD 형식이어야 합니다" }, { status: 400 });
    requiredDate = new Date(`${b.requiredDate}T00:00:00Z`);
  }
  const remarks = typeof b.remarks === "string" && b.remarks.trim() ? b.remarks.trim().slice(0, 200) : null;

  const src = await documentSourceFromRun(session.tenantId, runId);
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });
  const pl = purchaseLinesOf(src.run);
  if (!pl.ok) return NextResponse.json({ error: pl.error }, { status: pl.status });

  try {
    const row = await withTenant(session.tenantId, (tx) =>
      createPurchaseRequest(tx, {
        stableId: src.run.stableId, bomRunId: runId, noCore: noCoreOf(src.project?.projectNo),
        projectNo: src.project?.projectNo ?? null, code: src.run.code,
        requiredDate, remarks, lines: pl.lines, createdBy: session.userId,
      }),
    );
    return NextResponse.json({
      ok: true, id: row.id, prNo: row.prNo, status: row.status, lines: row.lines.length,
      message: `구매 요청 ${row.prNo} 생성 · 구매 품목 ${row.lines.length}줄 · 스냅샷 ${runId.slice(0, 8)}`,
    });
  } catch (e) {
    if (e instanceof PrDuplicateError) return NextResponse.json({ error: e.message, prNo: e.prNo }, { status: 409 });
    if (e instanceof PrEmptyError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
