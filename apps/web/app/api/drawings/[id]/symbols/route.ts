import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { validatePlace } from "@/app/lib/symbol";

/**
 * ccmd K · KC-3 · p58 설계 심볼 — 도면 위 배치(0036).
 * GET → { locked, rows } (읽기 모든 역할) · POST { symbolId, x, y, rot?, scale? } (도면 좌표 mm) — viewer 403.
 * 원 도면(DXF · 스냅샷)은 바꾸지 않는다. 발행된 도면에는 놓지 못한다(409 · DB 트리거가 한 번 더 막는다). 다른 회사 도면 → 404.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenant(s.tenantId, async (tx) => {
    const d = await tx.drawing.findFirst({ where: { id }, select: { id: true, status: true } });
    if (!d) return null;
    const rows = await tx.drawingSymbol.findMany({ where: { drawingId: id }, orderBy: { createdAt: "asc" } });
    return { status: d.status, rows };
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ locked: out.status === "issued", rows: out.rows.map((r) => ({ id: r.id, symbolId: r.symbolId, x: r.x, y: r.y, rot: r.rot, scale: r.scale })) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const symbolId = typeof b.symbolId === "string" && UUID.test(b.symbolId) ? b.symbolId : "";
  if (!symbolId) return NextResponse.json({ error: "symbolId 필요" }, { status: 400 });
  const v = validatePlace(b);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const out = await withTenant(s.tenantId, async (tx) => {
    const d = await tx.drawing.findFirst({ where: { id }, select: { id: true, status: true, drawingNo: true } });
    if (!d) return { missing: "도면" as const };
    if (d.status === "issued") return { locked: d.drawingNo };
    const sym = await tx.designSymbol.findFirst({ where: { id: symbolId }, select: { id: true, key: true } });
    if (!sym) return { missing: "심볼" as const };
    const row = await tx.drawingSymbol.create({ data: { tenantId: await requireTenant(tx), drawingId: id, symbolId, ...v.p, createdBy: s.userId } });
    await writeAudit(tx, s.userId, "create", "drawing_symbol", row.id, null, { drawingId: id, symbol: sym.key, ...v.p });
    return { id: row.id };
  });
  if ("missing" in out) return NextResponse.json({ error: `${out.missing}을(를) 찾을 수 없습니다` }, { status: 404 });
  if ("locked" in out) return NextResponse.json({ error: `도면 ${out.locked} 은 발행돼 심볼을 놓을 수 없습니다` }, { status: 409 });
  return NextResponse.json({ ok: true, id: out.id, ...v.p });
}
