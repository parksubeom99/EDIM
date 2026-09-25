import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str, UUID } from "../setup/_guard";
import { parseSpec, SCOPES } from "@/app/lib/ui-form";

/**
 * p25·p26 사용자 UI Form. GET = 목록(Templet 포함). POST = 새 폼 — fromTemplet 을 주면 그 Templet 을 복사해
 * 시작한다(Sample Templet 호출하여 Customizing). 쓰기는 카탈로그 편집 역할(owner · engineer).
 */
export async function GET() {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const rows = await withTenant(g.session.tenantId, (tx) => tx.uiForm.findMany({ orderBy: [{ isTemplet: "desc" }, { name: "asc" }] }));
  return NextResponse.json({ rows, scopes: SCOPES });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(b.name, 60), scope = str(b.scope, 40) || SCOPES[0];
  if (!name) return NextResponse.json({ error: "이름이 필요합니다" }, { status: 400 });
  const from = typeof b.fromTemplet === "string" && UUID.test(b.fromTemplet) ? b.fromTemplet : null;
  const out = await withTenant(g.session.tenantId, async (tx) => {
    if (await tx.uiForm.findFirst({ where: { name } })) return { dup: true as const };
    let spec: unknown = { widgets: [] };
    if (from) {
      const t = await tx.uiForm.findFirst({ where: { id: from, isTemplet: true } });
      if (!t) return { noTemplet: true as const };
      spec = t.spec;
    }
    const p = parseSpec(spec);
    if (!p.ok) return { bad: p.reason };
    const tenantId = g.session.tenantId;
    const row = await tx.uiForm.create({ data: { tenantId, name, scope, isTemplet: false, spec: p.spec as unknown as object, updatedBy: g.session.userId } });
    await writeAudit(tx, g.session.userId, "create", "ui_form", row.id, null, { name, scope, fromTemplet: from });
    return { id: row.id };
  });
  if ("dup" in out) return NextResponse.json({ error: `이미 있는 이름: ${name}` }, { status: 409 });
  if ("noTemplet" in out) return NextResponse.json({ error: "Templet 을 찾을 수 없습니다" }, { status: 404 });
  if ("bad" in out) return NextResponse.json({ error: out.bad }, { status: 400 });
  return NextResponse.json({ ok: true, id: out.id });
}
