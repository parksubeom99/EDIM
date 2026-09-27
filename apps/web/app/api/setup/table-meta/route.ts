import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { loadCatalog } from "@/app/lib/catalog";
import { guard, str, dbError } from "../_guard";

/**
 * H6 · p16 · p47 Table List(0029) — 제품 코드의 등록 표마다 Department · Table Type(Variant · Tech · Material) · Description · 변형 원본.
 * GET ?product= → { tables: [{ name, no, role, rows, cols, meta | null }] } — 표 목록은 카탈로그(등록 표)에서, 칸은 table_meta 에서
 * PUT { productCode, tableName, tableType, department?, description?, variantOf? } → 한 표의 칸을 저장(있으면 고친다)
 *   없는 제품 404 · 없는 표 400 · variantOf 는 같은 제품의 다른 표이고 Type=variant 일 때만(400). 표 내용(행·열)은 건드리지 않는다.
 */
const TYPES = ["variant", "tech", "material"] as const;

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const product = str(new URL(req.url).searchParams.get("product") ?? "", 40);
  const { catalog } = await loadCatalog(g.session.tenantId);
  const pc = catalog.productCodes.find((p) => p.code === product);
  if (!pc) return NextResponse.json({ error: `제품 코드 ${product} 없음` }, { status: 404 });
  const metas = await withTenant(g.session.tenantId, (tx) => tx.tableMeta.findMany({ where: { productCode: product } }));
  const tables = Object.entries(pc.tables).map(([name, t]) => {
    const m = metas.find((x) => x.tableName === name);
    return { name, no: t.no, role: t.role ?? "tech", rows: t.rows.length, cols: t.cols.length,
      meta: m ? { tableType: m.tableType, department: m.department, description: m.description, variantOf: m.variantOf } : null };
  });
  return NextResponse.json({ tables });
}

export async function PUT(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productCode = str(b.productCode, 40), tableName = str(b.tableName, 40);
  const tableType = (TYPES as readonly string[]).includes(String(b.tableType)) ? (b.tableType as (typeof TYPES)[number]) : null;
  if (!tableType) return NextResponse.json({ error: "Table Type 은 variant · tech · material" }, { status: 400 });
  const { catalog } = await loadCatalog(g.session.tenantId);
  const pc = catalog.productCodes.find((p) => p.code === productCode);
  if (!pc) return NextResponse.json({ error: `제품 코드 ${productCode} 없음` }, { status: 404 });
  if (!pc.tables[tableName]) return NextResponse.json({ error: `${productCode} 에 표 ${tableName} 없음` }, { status: 400 });
  const variantOf = str(b.variantOf, 40) || null;
  if (variantOf && (tableType !== "variant" || variantOf === tableName || !pc.tables[variantOf]))
    return NextResponse.json({ error: "변형 원본은 Type 이 Variant 일 때 같은 제품의 다른 표만" }, { status: 400 });
  const data = { tableType, department: str(b.department, 60), description: str(b.description, 200), variantOf, updatedBy: g.session.userId, updatedAt: new Date() };
  try {
    await withTenant(g.session.tenantId, async (tx) => {
      const cur = await tx.tableMeta.findFirst({ where: { productCode, tableName } });
      if (cur) await tx.tableMeta.update({ where: { id: cur.id }, data });
      else await tx.tableMeta.create({ data: { tenantId: await requireTenant(tx), productCode, tableName, ...data } });
      await writeAudit(tx, g.session.userId, cur ? "update" : "create", "table_meta", cur?.id ?? `${productCode}:${tableName}`, cur ? { tableType: cur.tableType, department: cur.department } : null, { productCode, tableName, tableType, department: data.department, variantOf });
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return dbError(e); }
}
