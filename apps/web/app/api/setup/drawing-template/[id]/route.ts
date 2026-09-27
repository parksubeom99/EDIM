import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, UUID } from "../../_guard";

/** H5 · 도면 템플릿 한 항목 삭제(0028). 이미 뜬 도면은 뜰 때 박힌 목록을 갖고 있어 영향 없다. 다른 회사 id 는 RLS 로 404. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const n = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.drawingTemplateItem.findFirst({ where: { id } });
    if (!cur) return 0;
    await tx.drawingTemplateItem.delete({ where: { id } });
    await writeAudit(tx, g.session.userId, "delete", "drawing_template_item", id, { productCode: cur.productCode, kind: cur.kind, childCode: cur.childCode, text: cur.text }, null);
    return 1;
  });
  if (!n) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
