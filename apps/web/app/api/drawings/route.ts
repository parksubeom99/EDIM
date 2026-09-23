import { NextResponse, type NextRequest } from "next/server";
import { withTenant, saveDrawing, listDrawings } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { dxfSourceFromRun } from "@/app/lib/output/drawing-source";
import { buildView, isDrawingView } from "@/app/lib/output/dxf";

/** GET = 도면 목록 · POST = BOM 스냅샷에서 도면을 떠서 남긴다(p24). */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const node = req.nextUrl.searchParams.get("node");
  const rows = await withTenant(session.tenantId, (tx) => listDrawings(tx, node));
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const runId = typeof b.runId === "string" ? b.runId : "";
  // 3각법(0012): plan=Top · front · right · assembly. 모르는 값은 평면으로 떨어뜨리지 않고 400 으로 막는다.
  if (b.type !== undefined && !isDrawingView(b.type))
    return NextResponse.json({ error: `도면 종류가 아닙니다: ${String(b.type)}` }, { status: 400 });
  const type = isDrawingView(b.type) ? b.type : "plan";
  if (!runId) return NextResponse.json({ error: "runId 필요" }, { status: 400 });

  const src = await dxfSourceFromRun(session.tenantId, runId);
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });

  const { dxf, meta } = buildView(type, src.input);
  // 도면번호 = 코드 + 종류. 같은 번호를 다시 뜨면 개정(A→B)이 붙는다.
  const NO: Record<string, string> = { plan: "PLN", assembly: "ASM", front: "FRT", right: "RHT" };
  const drawingNo = `${src.run.code}-${NO[type]}`;
  const row = await withTenant(session.tenantId, (tx) =>
    saveDrawing(tx, {
      stableId: src.run.stableId,
      bomRunId: runId,
      drawingNo,
      drawingType: type,
      code: src.run.code,
      dxf,
      meta: meta as unknown as object,
      createdBy: session.userId,
    }),
  );
  return NextResponse.json({
    ok: true, id: row.id, drawingNo: row.drawingNo, rev: row.currentRev, status: row.status,
    meta, message: `도면 ${row.drawingNo} Rev ${row.currentRev} 생성 · 치수 ${meta.dimItem} (W${meta.widthMm}×L${meta.lengthMm})`,
  });
}
