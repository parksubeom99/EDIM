import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { specDefError } from "@edim/bom-code";
import { loadCatalog } from "@/app/lib/catalog";
import { parseCsv } from "@/app/lib/csv";
import { SPEC_CSV_HEADER, cleanSource, specRowToDef } from "@/app/lib/spec-def";
import { guard, str } from "../../_guard";

/**
 * ⑥ p46 사양 항목 Import — **CSV**, 두 단계.
 *   POST { productCode, csv, confirm:false } → 미리보기: 줄마다 ok 또는 이유(줄 번호 = 파일의 실제 줄)
 *   POST { productCode, csv, confirm:true }  → 모든 줄이 맞을 때만 한꺼번에 등록(하나라도 틀리면 아무것도 넣지 않고 400)
 * 머리글: key,label,unit,slot,kind,op,scale,table,col. 이미 있는 key · 파일 안 중복 key 는 거부.
 * 아직 없음: xlsx(엑셀 파일) — 엑셀에서 "CSV UTF-8" 로 저장해 올리면 된다.
 */
export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productCode = str(b.productCode, 40);
  if (!productCode || typeof b.csv !== "string") return NextResponse.json({ error: "productCode · csv 필수" }, { status: 400 });
  const parsed = parseCsv(b.csv);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const missing = SPEC_CSV_HEADER.filter((h) => ["key", "label", "slot", "kind"].includes(h) && !parsed.header.includes(h));
  if (missing.length) return NextResponse.json({ error: `머리글에 없음: ${missing.join(", ")} (필요: ${SPEC_CSV_HEADER.join(",")})` }, { status: 400 });
  const { catalog } = await loadCatalog(g.session.tenantId);
  if (!catalog.productCodes.some((p) => p.code === productCode && p.kind === "product"))
    return NextResponse.json({ error: `제품 코드 ${productCode} 없음` }, { status: 404 });
  const existing = new Set((await withTenant(g.session.tenantId, (tx) => tx.specItem.findMany({ where: { productCode }, select: { key: true } }))).map((x) => x.key));
  const seen = new Set<string>();
  const rows = parsed.rows.map((r) => {
    const def = specRowToDef(r.cells);
    const why = specDefError(def, catalog, productCode)
      ?? (existing.has(def.key) ? `이미 있는 key: ${def.key}` : null)
      ?? (seen.has(def.key) ? `파일 안에서 key 중복: ${def.key}` : null);
    seen.add(def.key);
    return { line: r.line, key: def.key, label: def.label, slot: def.slot, kind: def.source.kind, ok: !why, error: why, def };
  });
  const bad = rows.filter((r) => !r.ok).length;
  const preview = rows.map(({ def: _d, ...x }) => x);
  if (b.confirm !== true) return NextResponse.json({ preview, ok: rows.length - bad, bad });
  if (bad > 0 || rows.length === 0) return NextResponse.json({ error: `틀린 줄 ${bad}개 — 고친 뒤 다시 올리십시오 (아무것도 넣지 않았습니다)`, preview }, { status: 400 });
  await withTenant(g.session.tenantId, async (tx) => {
    const tenantId = await requireTenant(tx);
    let seq = await tx.specItem.count({ where: { productCode } });
    for (const r of rows) {
      const row = await tx.specItem.create({ data: { tenantId, productCode, seq: ++seq, key: r.def.key, label: r.def.label, unit: r.def.unit, slot: r.def.slot, source: cleanSource(r.def.source) as object, createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "spec_item", row.id, null, { key: r.def.key, via: "csv-import" });
    }
  });
  return NextResponse.json({ ok: true, imported: rows.length });
}
