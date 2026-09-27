import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { loadCatalog } from "@/app/lib/catalog";
import { guard, str, dbError } from "../_guard";

/**
 * H5 · p39 도면 Templet 호출 설정 · p40 Call Sub Drawing · Detail Design 주의사항 (0028).
 * GET  ?product= → { subs, notes, children } — children = 그 제품의 코드 관계(BOM) 하위 코드(부를 수 있는 것)
 * POST { productCode, kind: "sub", childCode, priority } | { productCode, kind: "note", text, priority }
 *   없는 제품 404 · 관계에 없는 하위 코드 400 · 같은 하위 코드 409 · 우선순위 1~999 정수
 * 삭제 = ./[id] (고치기 = 지우고 새로). 이미 뜬 도면은 뜰 때 박힌 목록을 그대로 갖는다.
 */
export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const product = str(new URL(req.url).searchParams.get("product") ?? "", 40);
  if (!product) return NextResponse.json({ error: "product 필요" }, { status: 400 });
  const { catalog } = await loadCatalog(g.session.tenantId);
  const children = [...new Map(catalog.relationships.filter((r) => r.parent === product).map((r) => {
    const pc = catalog.productCodes.find((p) => p.code === r.child);
    return [r.child, { code: r.child, name: pc?.name ?? "", section: r.section }] as const;
  })).values()];
  const rows = await withTenant(g.session.tenantId, (tx) => tx.drawingTemplateItem.findMany({ where: { productCode: product }, orderBy: [{ kind: "asc" }, { priority: "asc" }, { createdAt: "asc" }] }));
  const subs = rows.filter((r) => r.kind === "sub").sort((a, b) => a.priority - b.priority || a.childCode!.localeCompare(b.childCode!))
    .map((r) => ({ id: r.id, childCode: r.childCode!, priority: r.priority }));
  const notes = rows.filter((r) => r.kind === "note").map((r) => ({ id: r.id, text: r.text!, priority: r.priority }));
  return NextResponse.json({ subs, notes, children });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productCode = str(b.productCode, 40);
  const kind = b.kind === "sub" || b.kind === "note" ? b.kind : null;
  const priority = Number(b.priority);
  if (!productCode || !kind) return NextResponse.json({ error: "productCode · kind(sub|note) 필수" }, { status: 400 });
  if (!Number.isInteger(priority) || priority < 1 || priority > 999) return NextResponse.json({ error: "우선순위는 1~999 정수" }, { status: 400 });
  const { catalog } = await loadCatalog(g.session.tenantId);
  if (!catalog.productCodes.some((p) => p.code === productCode && p.kind === "product")) return NextResponse.json({ error: `제품 코드 ${productCode} 없음` }, { status: 404 });
  const childCode = kind === "sub" ? str(b.childCode, 40) : null;
  const text = kind === "note" ? str(b.text, 200) : null;
  if (kind === "sub" && !catalog.relationships.some((r) => r.parent === productCode && r.child === childCode))
    return NextResponse.json({ error: `${childCode || "(빈 코드)"} 는 ${productCode} 의 코드 관계(BOM) 하위 코드가 아닙니다` }, { status: 400 });
  if (kind === "note" && !text) return NextResponse.json({ error: "주의사항 문구가 비었습니다" }, { status: 400 });
  try {
    const out = await withTenant(g.session.tenantId, async (tx) => {
      if (kind === "sub" && await tx.drawingTemplateItem.findFirst({ where: { productCode, kind, childCode } })) return { dup: true as const };
      const tenantId = await requireTenant(tx);
      const row = await tx.drawingTemplateItem.create({ data: { tenantId, productCode, kind, childCode, text, priority, createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "drawing_template_item", row.id, null, { productCode, kind, childCode, text, priority });
      return { id: row.id };
    });
    if ("dup" in out) return NextResponse.json({ error: `이미 부르는 하위 도면: ${childCode}` }, { status: 409 });
    return NextResponse.json({ ok: true, id: out.id });
  } catch (e) { return dbError(e); }
}
