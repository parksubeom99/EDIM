import { NextResponse, type NextRequest } from "next/server";
import {
  withTenant, getDrawing, setDrawingStatus, isDrawingStatus, setDrawingPurpose, isDrawingPurpose,
  DrawingLockedError, BomNotApprovedError, DrawingStatusBackwardsError,
} from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

/** GET = 도면 DXF 내려받기 · PATCH = 상태 전이(작성중→검토→승인→발행) 또는 { purpose } 용도 바꾸기(발행 전까지만 · 0020). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await withTenant(session.tenantId, (tx) => getDrawing(tx, id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(row.dxf, {
    headers: {
      "content-type": "application/dxf",
      "content-disposition": `attachment; filename="${row.drawingNo}-Rev${row.currentRev}.dxf"`,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.status === undefined && "purpose" in b) {
    if (b.purpose !== null && !isDrawingPurpose(b.purpose))
      return NextResponse.json({ error: `도면 용도가 아닙니다: ${String(b.purpose)}` }, { status: 400 });
    const row = await withTenant(session.tenantId, (tx) => getDrawing(tx, id));
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    try {
      const out = await withTenant(session.tenantId, (tx) => setDrawingPurpose(tx, { id, purpose: (b.purpose ?? null) as never, actorId: session.userId }));
      return NextResponse.json({ ok: true, purpose: out.purpose });
    } catch (e) {
      if (e instanceof DrawingLockedError) return NextResponse.json({ error: e.message }, { status: 409 });
      return NextResponse.json({ error: "용도 변경 실패" }, { status: 409 });
    }
  }
  if (!isDrawingStatus(b.status))
    return NextResponse.json({ error: "status 필요 (draft|review|approved|issued)" }, { status: 400 });

  try {
    const row = await withTenant(session.tenantId, (tx) =>
      setDrawingStatus(tx, { id, status: b.status as never, actorId: session.userId }),
    );
    return NextResponse.json({ ok: true, status: row.status });
  } catch (e) {
    if (e instanceof BomNotApprovedError || e instanceof DrawingLockedError || e instanceof DrawingStatusBackwardsError)
      return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: "상태 변경 실패" }, { status: 409 });
  }
}
