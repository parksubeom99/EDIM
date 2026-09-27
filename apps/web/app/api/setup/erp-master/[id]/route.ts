import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str, UUID } from "../../_guard";
import { isErpKind, normalizeAttrs, type ErpAttrs } from "@/app/lib/erp-master";
import { checkRefs, erpUsage } from "@/app/lib/erp-master-db";

/**
 * H4 · p64 기준정보 한 행 — 수정(PATCH { name?, attrs?, remarks?, active? }) · 삭제(DELETE).
 * 코드·종류는 바꾸지 않는다(다른 행이 코드로 가리킨다). 가리키는 곳이 있으면 삭제 409 — 대신 사용 중지.
 * 다른 회사 id 는 RLS 로 안 보인다 → 404.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.code !== undefined || b.kind !== undefined) return NextResponse.json({ error: "코드·종류는 바꿀 수 없습니다(다른 곳이 코드로 가리킨다)" }, { status: 400 });
  if (b.name !== undefined && !str(b.name, 120)) return NextResponse.json({ error: "이름은 비울 수 없습니다" }, { status: 400 });
  if (b.active !== undefined && typeof b.active !== "boolean") return NextResponse.json({ error: "active 는 true/false" }, { status: 400 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.erpMaster.findFirst({ where: { id } });
    if (!cur || !isErpKind(cur.kind)) return { missing: true as const };
    const kind = cur.kind;
    let attrs: ErpAttrs | undefined;
    if (b.attrs !== undefined) {
      const a = normalizeAttrs(kind, b.attrs);
      if (!a.ok) return { bad: a.error };
      const badRef = await checkRefs(tx, kind, cur.code, a.attrs, cur.attrs as ErpAttrs);
      if (badRef) return { bad: badRef };
      attrs = a.attrs;
    }
    const data = {
      ...(b.name !== undefined ? { name: str(b.name, 120) } : {}),
      ...(b.remarks !== undefined ? { remarks: str(b.remarks, 200) } : {}),
      ...(attrs ? { attrs } : {}),
      ...(typeof b.active === "boolean" ? { active: b.active } : {}),
    };
    await tx.erpMaster.update({ where: { id }, data });
    await writeAudit(tx, g.session.userId, "update", "erp_master", id, { name: cur.name, attrs: cur.attrs, active: cur.active }, data);
    return { ok: true as const };
  });
  if ("missing" in out) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ("bad" in out) return NextResponse.json({ error: out.bad }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.erpMaster.findFirst({ where: { id } });
    if (!cur || !isErpKind(cur.kind)) return { missing: true as const };
    const u = await erpUsage(tx, cur.kind, cur.code);
    if (u.total > 0) return { used: u };
    await tx.erpMaster.delete({ where: { id } });
    await writeAudit(tx, g.session.userId, "delete", "erp_master", id, { kind: cur.kind, code: cur.code, name: cur.name }, null);
    return { ok: true as const };
  });
  if ("missing" in out) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ("used" in out) return NextResponse.json({ error: `사용 중이라 지울 수 없습니다 — ${out.used!.detail.join(" · ")}. 대신 '사용 중지'하십시오`, usage: out.used! }, { status: 409 });
  return NextResponse.json({ ok: true });
}
