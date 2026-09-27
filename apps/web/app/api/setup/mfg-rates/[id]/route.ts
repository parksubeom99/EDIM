import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, UUID } from "../../_guard";

/** F10 · 제조 정보 표 한 행 삭제. 뜬 스냅샷은 laborBasis 를 따로 갖고 있어 영향 없다. 다른 회사 id 는 RLS 로 404. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const n = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.mfgRate.findFirst({ where: { id } });
    if (!cur) return 0;
    await tx.mfgRate.delete({ where: { id } });
    await writeAudit(tx, g.session.userId, "delete", "mfg_rate", id, { productCode: cur.productCode, process: cur.process }, null);
    return 1;
  });
  if (!n) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
