import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { validateAnnot } from "@/app/lib/annotation";

/**
 * H10 · p58 그림 제작 Module 1단계 — 도면 주석(0031).
 * GET → { rows } (읽기 모든 역할) · POST { kind: line|rect|text|dim, x1, y1, x2?, y2?, text? } (도면 좌표 mm)
 * 원 도면(DXF · 스냅샷)은 바꾸지 않는다. 발행된 도면에는 주석을 더하지 못한다(409). 다른 회사 도면 → 404.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenant(session.tenantId, async (tx) => {
    const d = await tx.drawing.findFirst({ where: { id }, select: { id: true, status: true } });
    if (!d) return null;
    return { status: d.status, rows: await tx.drawingAnnotation.findMany({ where: { drawingId: id }, orderBy: { createdAt: "asc" } }) };
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ locked: out.status === "issued", rows: out.rows.map((r) => ({ id: r.id, kind: r.kind, x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, text: r.text })) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const v = validateAnnot(await req.json().catch(() => ({})));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const out = await withTenant(session.tenantId, async (tx) => {
    const d = await tx.drawing.findFirst({ where: { id }, select: { id: true, status: true, drawingNo: true } });
    if (!d) return { missing: true as const };
    if (d.status === "issued") return { locked: d.drawingNo };
    const row = await tx.drawingAnnotation.create({ data: { tenantId: await requireTenant(tx), drawingId: id, ...v.a, createdBy: session.userId } });
    await writeAudit(tx, session.userId, "create", "drawing_annotation", row.id, null, { drawingId: id, kind: v.a.kind });
    return { id: row.id };
  });
  if ("missing" in out) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ("locked" in out) return NextResponse.json({ error: `도면 ${out.locked} 은 발행돼 주석을 더할 수 없습니다` }, { status: 409 });
  return NextResponse.json({ ok: true, id: out.id });
}
