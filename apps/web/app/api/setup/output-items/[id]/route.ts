import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, UUID } from "../../_guard";

/** H6 · Output 항목 삭제 — 그래프가 표시선으로 쓰면 409(그래프를 먼저 고친다). 이미 만든 문서는 body 에 값이 있어 그대로. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.outputItem.findFirst({ where: { id } });
    if (!cur) return { missing: true as const };
    const used = await tx.graphDef.count({ where: { docType: cur.docType, markerKey: cur.key } });
    if (used) return { used };
    await tx.outputItem.delete({ where: { id } });
    await writeAudit(tx, g.session.userId, "delete", "output_item", id, { key: cur.key, label: cur.label }, null);
    return { ok: true as const };
  });
  if ("missing" in out) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ("used" in out) return NextResponse.json({ error: `그래프 ${out.used}개가 이 항목을 표시선으로 씁니다 — 그래프를 먼저 고치십시오` }, { status: 409 });
  return NextResponse.json({ ok: true });
}
