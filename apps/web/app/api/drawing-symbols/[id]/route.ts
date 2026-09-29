import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { validatePlace } from "@/app/lib/symbol";

/**
 * ccmd K · KC-3 · 배치된 설계 심볼 하나 — PATCH(옮기기 { dx, dy } · 회전 { rot } · 배율 { scale } · 자리 { x, y }) · DELETE.
 * 발행된 도면이면 409(DB 트리거가 한 번 더 막는다) · viewer 403 · 다른 회사 id → 404.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(tenantId: string, id: string) {
  return withTenant(tenantId, async (tx) => {
    const r = await tx.drawingSymbol.findFirst({ where: { id } });
    if (!r) return null;
    const d = await tx.drawing.findFirst({ where: { id: r.drawingId }, select: { status: true, drawingNo: true } });
    return { r, issued: d?.status === "issued", drawingNo: d?.drawingNo ?? "" };
  });
}

async function guard(req: NextRequest, params: Promise<{ id: string }>) {
  const s = await getServerSession();
  if (!s) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!canEditProject(s.role)) return { res: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const { id } = await params;
  if (!UUID.test(id)) return { res: NextResponse.json({ error: "not found" }, { status: 404 }) };
  const cur = await load(s.tenantId, id);
  if (!cur) return { res: NextResponse.json({ error: "not found" }, { status: 404 }) };
  if (cur.issued) return { res: NextResponse.json({ error: `도면 ${cur.drawingNo} 은 발행돼 심볼이 잠겼습니다` }, { status: 409 }) };
  return { s, id, cur };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, params);
  if ("res" in g) return g.res;
  const { s, id, cur } = g;
  const v = validatePlace(await req.json().catch(() => ({})), { x: cur.r.x, y: cur.r.y, rot: cur.r.rot, scale: cur.r.scale });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  await withTenant(s.tenantId, async (tx) => {
    await tx.drawingSymbol.update({ where: { id }, data: { ...v.p, updatedAt: new Date() } });
    await writeAudit(tx, s.userId, "update", "drawing_symbol", id, { x: cur.r.x, y: cur.r.y, rot: cur.r.rot, scale: cur.r.scale }, v.p);
  });
  return NextResponse.json({ ok: true, ...v.p });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, params);
  if ("res" in g) return g.res;
  const { s, id, cur } = g;
  await withTenant(s.tenantId, async (tx) => {
    await tx.drawingSymbol.delete({ where: { id } });
    await writeAudit(tx, s.userId, "delete", "drawing_symbol", id, { symbolId: cur.r.symbolId }, null);
  });
  return NextResponse.json({ ok: true });
}
