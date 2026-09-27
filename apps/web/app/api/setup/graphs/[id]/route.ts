import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, UUID } from "../../_guard";

/** H6 · 그래프 삭제(0029). 이미 만든 Tech Data 는 그래프(점·표시선 값)를 body 에 갖고 있어 그대로. 다른 회사 id 는 404. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const n = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.graphDef.findFirst({ where: { id } });
    if (!cur) return 0;
    await tx.graphDef.delete({ where: { id } });
    await writeAudit(tx, g.session.userId, "delete", "graph_def", id, { name: cur.name }, null);
    return 1;
  });
  if (!n) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
