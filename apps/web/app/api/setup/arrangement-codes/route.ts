import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { loadCatalog } from "@/app/lib/catalog";
import { guard, str } from "../_guard";

/**
 * p35 Arrangement Code Registration. GET = 목록(대기 먼저). POST { code, productCode, description } =
 * 그 제품의 지금 배치(구획 순서·길이·방향·부품 위치)를 스냅샷으로 떠서 pending 으로 등록한다.
 */
export async function GET() {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const rows = await withTenant(g.session.tenantId, (tx) => tx.arrangementCode.findMany({ orderBy: [{ createdAt: "desc" }] }));
  const order = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  rows.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = str(b.code, 40), productCode = str(b.productCode, 40), description = str(b.description, 200);
  if (!code || !productCode) return NextResponse.json({ error: "code · productCode 필수" }, { status: 400 });
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(code)) return NextResponse.json({ error: "코드는 영문·숫자·공백·_ . - 만" }, { status: 400 });
  const { catalog } = await loadCatalog(g.session.tenantId);
  const product = catalog.productCodes.find((p) => p.code === productCode);
  if (!product || product.kind !== "product") return NextResponse.json({ error: `제품 코드 ${productCode} 없음` }, { status: 404 });
  const sections = product.sections ?? [];
  if (sections.length === 0) return NextResponse.json({ error: `${productCode} 에 배치(구획)가 없습니다` }, { status: 409 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    if (await tx.arrangementCode.findFirst({ where: { code } })) return null;
    const tenantId = await requireTenant(tx);
    const row = await tx.arrangementCode.create({ data: { tenantId, code, productCode, description, sections: sections as unknown as object, requestedBy: g.session.userId } });
    await writeAudit(tx, g.session.userId, "create", "arrangement_code", row.id, null, { code, productCode, sections: sections.map((s) => s.name) });
    return row.id;
  });
  if (!out) return NextResponse.json({ error: `이미 있는 Arrangement Code: ${code}` }, { status: 409 });
  return NextResponse.json({ ok: true, id: out, status: "pending" });
}
