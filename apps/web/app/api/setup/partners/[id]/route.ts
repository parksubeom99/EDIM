import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str, UUID } from "../../_guard";
import { partnerUsage } from "@/app/lib/partner";

/**
 * p64 Company DB — 고객·공급처 수정(PATCH) · 삭제(DELETE) · 사용 중지(PATCH { active:false }). 0024.
 * 코드(code)와 종류(kind)는 바꾸지 않는다 — 다른 곳이 코드로 알아본다.
 * 삭제는 프로젝트(client_id) · 단가 이력(supplier_id) · 구매 요청 줄(공급처 이름)이 가리키면 409 — 대신 사용 중지.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.code !== undefined || b.kind !== undefined) return NextResponse.json({ error: "코드·종류는 바꿀 수 없습니다(다른 곳이 코드로 알아본다)" }, { status: 400 });
  if (b.name !== undefined && !str(b.name, 120)) return NextResponse.json({ error: "이름은 비울 수 없습니다" }, { status: 400 });
  if (b.active !== undefined && typeof b.active !== "boolean") return NextResponse.json({ error: "active 는 true/false" }, { status: 400 });
  const data = {
    ...(b.name !== undefined ? { name: str(b.name, 120) } : {}),
    ...(b.contact !== undefined ? { contact: str(b.contact, 200) } : {}),
    ...(b.nation !== undefined ? { nation: str(b.nation, 40) } : {}),
    ...(b.remarks !== undefined ? { remarks: str(b.remarks, 200) } : {}),
    ...(typeof b.active === "boolean" ? { active: b.active } : {}),
  };
  const ok = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.partner.findFirst({ where: { id } });
    if (!cur) return false;
    await tx.partner.update({ where: { id }, data });
    await writeAudit(tx, g.session.userId, "update", "partner", id, { name: cur.name, active: cur.active }, data);
    return true;
  });
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.partner.findFirst({ where: { id } });
    if (!cur) return { missing: true as const };
    const u = await partnerUsage(tx, cur);
    if (u.projects + u.prices + u.purchaseLines > 0) return { used: u };
    await tx.partner.delete({ where: { id } });
    await writeAudit(tx, g.session.userId, "delete", "partner", id, { code: cur.code, name: cur.name }, null);
    return { ok: true as const };
  });
  if ("missing" in out) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ("used" in out) {
    const u = out.used!;
    return NextResponse.json({ error: `사용 중이라 지울 수 없습니다 — 프로젝트 ${u.projects} · 단가 이력 ${u.prices} · 구매 요청 줄 ${u.purchaseLines}. 대신 '사용 중지'하십시오`, usage: u }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
