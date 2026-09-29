import { NextResponse, type NextRequest } from "next/server";
import {
  withTenant, getDrawing, setDrawingStatus, isDrawingStatus, setDrawingPurpose, isDrawingPurpose,
  DrawingLockedError, BomNotApprovedError, DrawingStatusBackwardsError,
} from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { withAnnotations, type Annot } from "@/app/lib/annotation";
import { withSymbols, validatePrims } from "@/app/lib/symbol";

/**
 * GET = 도면 DXF 내려받기(?annot=1 이면 H10 주석을 ANNOT 레이어로 덧붙인 사본 — 원 DXF 는 그대로)
 * PATCH = 상태 전이(작성중→검토→승인→발행) 또는 { purpose } 용도 바꾸기(발행 전까지만 · 0020).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const annot = req.nextUrl.searchParams.get("annot") === "1";
  const out = await withTenant(session.tenantId, async (tx) => {
    const row = await getDrawing(tx, id);
    if (!row) return null;
    const notes = annot ? await tx.drawingAnnotation.findMany({ where: { drawingId: row.id }, orderBy: { createdAt: "asc" } }) : [];
    // ccmd K · KC-3 — 설계 심볼 배치도 같은 사본에 SYMBOL 레이어로(선 전개). 원 DXF 는 그대로.
    const syms = annot ? await tx.drawingSymbol.findMany({ where: { drawingId: row.id }, orderBy: { createdAt: "asc" }, include: { symbol: true } }) : [];
    return { row, notes, syms };
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { row, notes, syms } = out;
  const placed = syms.flatMap((sm) => { const v = validatePrims(sm.symbol.primitives); return v.ok ? [{ prims: v.prims, at: { x: sm.x, y: sm.y, rot: sm.rot, scale: sm.scale } }] : []; });
  const body = annot ? withSymbols(withAnnotations(row.dxf, notes.map((n) => ({ kind: n.kind as Annot["kind"], x1: n.x1, y1: n.y1, x2: n.x2, y2: n.y2, text: n.text }))), placed) : row.dxf;
  return new NextResponse(body, {
    headers: {
      "content-type": "application/dxf",
      "content-disposition": `attachment; filename="${row.drawingNo}-Rev${row.currentRev}${annot ? "-annot" : ""}.dxf"`,
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
