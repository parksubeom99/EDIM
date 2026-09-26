import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { specDefError, type SpecItemDef, type SlotKey, type SpecSource } from "@edim/bom-code";
import { loadCatalog } from "@/app/lib/catalog";
import { guard, str, dbError } from "../_guard";

/**
 * ⑥ 사양 입력표 — 사양 항목 정의 (청사진 p46 [Spec List in-put table]).
 * GET  ?product=EU → { rows: [{ key, label, unit, slot, source, seq }] }  (회사 것만 — RLS)
 * POST { productCode, key, label, unit, slot, source } → 등록. 표·열·슬롯이 등록된 카탈로그와 맞아야 한다(400).
 * 아직 없음: 항목 수정·삭제 · Import(엑셀) · Option 정의(Item Image).
 */
export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const product = str(new URL(req.url).searchParams.get("product") ?? "", 40);
  const rows = await withTenant(g.session.tenantId, (tx) =>
    tx.specItem.findMany({ where: product ? { productCode: product } : {}, orderBy: [{ productCode: "asc" }, { seq: "asc" }, { createdAt: "asc" }] }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, productCode: r.productCode, seq: r.seq, key: r.key, label: r.label, unit: r.unit, slot: r.slot, source: r.source })) });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productCode = str(b.productCode, 40);
  const def: SpecItemDef = {
    key: str(b.key, 40), label: str(b.label, 60), unit: str(b.unit, 20),
    slot: str(b.slot, 1) as SlotKey, source: (b.source ?? null) as SpecSource,
  };
  if (!productCode) return NextResponse.json({ error: "productCode 필수" }, { status: 400 });
  const { catalog } = await loadCatalog(g.session.tenantId);
  const product = catalog.productCodes.find((p) => p.code === productCode && p.kind === "product");
  if (!product) return NextResponse.json({ error: `제품 코드 ${productCode} 없음` }, { status: 404 });
  const bad = specDefError(def, catalog, productCode);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  // 저장은 정의에 쓰이는 필드만 — 화면이 보낸 잡값이 source 에 섞이지 않게
  const s = def.source;
  const source = s.kind === "choice" ? { kind: "choice" }
    : s.kind === "item" ? { kind: "item", op: s.op, ...(s.scale !== undefined ? { scale: s.scale } : {}) }
    : { kind: "table", table: s.table, col: s.col, op: s.op };
  try {
    const id = await withTenant(g.session.tenantId, async (tx) => {
      const tenantId = await requireTenant(tx);
      const seq = (await tx.specItem.count({ where: { productCode } })) + 1;
      const row = await tx.specItem.create({ data: { tenantId, productCode, seq, key: def.key, label: def.label, unit: def.unit, slot: def.slot, source, createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "spec_item", row.id, null, { productCode, key: def.key, slot: def.slot, source });
      return row.id;
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) { return dbError(e); }
}
