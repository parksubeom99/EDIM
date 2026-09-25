import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str, UUID } from "../../setup/_guard";
import { parseSpec } from "@/app/lib/ui-form";

/** 폼 저장(PUT: spec · 이름 · scope · Templet 여부) · 삭제(DELETE). 다른 회사의 id 는 RLS 로 404. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = parseSpec(b.spec);
  if (!p.ok) return NextResponse.json({ error: p.reason }, { status: 400 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const before = await tx.uiForm.findFirst({ where: { id } });
    if (!before) return "missing" as const;
    const name = str(b.name, 60) || before.name;
    if (name !== before.name && (await tx.uiForm.findFirst({ where: { name } }))) return "dup" as const;
    await tx.uiForm.update({ where: { id }, data: { name, scope: str(b.scope, 40) || before.scope,
      isTemplet: typeof b.isTemplet === "boolean" ? b.isTemplet : before.isTemplet, spec: p.spec as unknown as object, updatedAt: new Date(), updatedBy: g.session.userId } });
    await writeAudit(tx, g.session.userId, "update", "ui_form", id, { name: before.name, widgets: (before.spec as { widgets?: unknown[] })?.widgets?.length ?? 0 }, { name, widgets: p.spec.widgets.length });
    return "ok" as const;
  });
  if (out === "missing") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (out === "dup") return NextResponse.json({ error: "이미 있는 이름" }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const n = await withTenant(g.session.tenantId, async (tx) => {
    const r = await tx.uiForm.deleteMany({ where: { id } });
    if (r.count) await writeAudit(tx, g.session.userId, "delete", "ui_form", id, null, null);
    return r.count;
  });
  return n ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
