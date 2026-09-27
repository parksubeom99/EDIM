import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { validateAnnot } from "@/app/lib/annotation";

/**
 * H10 · 도면 주석 한 개 — PATCH(옮기기 { dx, dy } 또는 { x1, y1, x2, y2, text } 고치기) · DELETE.
 * 종류는 바꾸지 않는다. 발행된 도면의 주석은 잠긴다(409). 다른 회사 id → 404.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(tenantId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const a = await tx.drawingAnnotation.findFirst({ where: { id } });
    if (!a) return null;
    const d = await tx.drawing.findFirst({ where: { id: a.drawingId }, select: { status: true, drawingNo: true } });
    return { a, issued: d?.status === "issued", drawingNo: d?.drawingNo ?? "" };
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cur = await load(session.tenantId, id);
  if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (cur.issued) return NextResponse.json({ error: `도면 ${cur.drawingNo} 은 발행돼 주석이 잠겼습니다` }, { status: 409 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.kind !== undefined && b.kind !== cur.a.kind) return NextResponse.json({ error: "주석 종류는 바꿀 수 없습니다" }, { status: 400 });
  const moving = b.dx !== undefined || b.dy !== undefined;
  const dx = Number(b.dx ?? 0), dy = Number(b.dy ?? 0);
  const next = moving
    ? { kind: cur.a.kind, x1: cur.a.x1 + dx, y1: cur.a.y1 + dy, x2: cur.a.x2 + dx, y2: cur.a.y2 + dy, text: cur.a.text }
    : { kind: cur.a.kind, x1: b.x1 ?? cur.a.x1, y1: b.y1 ?? cur.a.y1, x2: b.x2 ?? cur.a.x2, y2: b.y2 ?? cur.a.y2, text: b.text ?? cur.a.text };
  const v = validateAnnot(next);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  await withTenant(session.tenantId, async (tx) => {
    await tx.drawingAnnotation.update({ where: { id }, data: { x1: v.a.x1, y1: v.a.y1, x2: v.a.x2, y2: v.a.y2, text: v.a.text, updatedAt: new Date() } });
    await writeAudit(tx, session.userId, "update", "drawing_annotation", id, { x1: cur.a.x1, y1: cur.a.y1 }, { x1: v.a.x1, y1: v.a.y1 });
  });
  return NextResponse.json({ ok: true, ...v.a });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cur = await load(session.tenantId, id);
  if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (cur.issued) return NextResponse.json({ error: `도면 ${cur.drawingNo} 은 발행돼 주석이 잠겼습니다` }, { status: 409 });
  await withTenant(session.tenantId, async (tx) => {
    await tx.drawingAnnotation.delete({ where: { id } });
    await writeAudit(tx, session.userId, "delete", "drawing_annotation", id, { kind: cur.a.kind }, null);
  });
  return NextResponse.json({ ok: true });
}
