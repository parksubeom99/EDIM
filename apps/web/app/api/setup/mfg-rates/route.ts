import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { loadCatalog } from "@/app/lib/catalog";
import { guard, str, dbError } from "../_guard";

/**
 * F10 · p66 · p67 제조 정보 표 — 공정별 시간 × 임율 · 장비 이름(0026). GET ?product= · POST { productCode, process, equipment?, hours, rate }.
 * 삭제 = ./[id] DELETE(고치기 = 지우고 새로). 표를 고쳐도 이미 뜬 BOM 스냅샷 원가·견적은 그대로다(스냅샷에 박힌 laborBasis 가 근거).
 * 아직 없음: 장비(설비) 사용료 · 재고 단가 Table — 필요한 입력: 회사 설비·재고 데이터.
 */
export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const product = str(new URL(req.url).searchParams.get("product") ?? "", 40);
  const rows = await withTenant(g.session.tenantId, (tx) => tx.mfgRate.findMany({ where: product ? { productCode: product } : {}, orderBy: [{ productCode: "asc" }, { seq: "asc" }] }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, productCode: r.productCode, process: r.process, equipment: r.equipment, hours: Number(r.hours), rate: Number(r.rate), amount: Math.round(Number(r.hours) * Number(r.rate)) })) });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productCode = str(b.productCode, 40), process = str(b.process, 60), equipment = str(b.equipment, 80) || null;
  const hours = Number(b.hours), rate = Number(b.rate);
  if (!productCode || !process) return NextResponse.json({ error: "productCode · process 필수" }, { status: 400 });
  if (!(Number.isFinite(hours) && hours > 0 && hours < 1e6)) return NextResponse.json({ error: "시간(h)은 0 보다 커야 합니다" }, { status: 400 });
  if (!(Number.isFinite(rate) && rate > 0 && rate < 1e10)) return NextResponse.json({ error: "임율(원/h)은 0 보다 커야 합니다" }, { status: 400 });
  const { catalog } = await loadCatalog(g.session.tenantId);
  if (!catalog.productCodes.some((p) => p.code === productCode && p.kind === "product")) return NextResponse.json({ error: `제품 코드 ${productCode} 없음` }, { status: 404 });
  try {
    const id = await withTenant(g.session.tenantId, async (tx) => {
      if (await tx.mfgRate.findFirst({ where: { productCode, process } })) return null;
      const tenantId = await requireTenant(tx);
      const seq = ((await tx.mfgRate.aggregate({ where: { productCode }, _max: { seq: true } }))._max.seq ?? 0) + 1;
      const row = await tx.mfgRate.create({ data: { tenantId, productCode, seq, process, equipment, hours, rate, createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "mfg_rate", row.id, null, { productCode, process, equipment, hours, rate });
      return row.id;
    });
    if (!id) return NextResponse.json({ error: `이미 있는 공정: ${process}` }, { status: 409 });
    return NextResponse.json({ ok: true, id });
  } catch (e) { return dbError(e); }
}
