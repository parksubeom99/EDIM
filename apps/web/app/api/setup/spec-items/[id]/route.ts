import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { specDefError, type SlotKey, type SpecItemDef, type SpecSource } from "@edim/bom-code";
import { loadCatalog } from "@/app/lib/catalog";
import { cleanSource } from "@/app/lib/spec-def";
import { guard, str, UUID } from "../../_guard";

/**
 * ⑥ p46 사양 항목 수정(PATCH — label · unit · slot · source, 카탈로그와 다시 대조) · 삭제(DELETE).
 * key 는 바꾸지 않는다(사양 입력표가 key 로 값을 보낸다).
 * 삭제 409 조건: 사양 항목을 **가리키는 저장 데이터**가 있을 때. 지금은 추천 결과가 슬롯 값으로만 저장되고
 * 사양 key 를 남기는 곳이 없어 해당 행이 없다 — 가리키는 곳이 생기면 specItemUsage() 한 곳에 더한다.
 */
async function specItemUsage(): Promise<number> {
  return 0;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.key !== undefined) return NextResponse.json({ error: "key 는 바꿀 수 없습니다 — 새 항목으로 등록하십시오" }, { status: 400 });
  const cur = await withTenant(g.session.tenantId, (tx) => tx.specItem.findFirst({ where: { id } }));
  if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
  const def: SpecItemDef = {
    key: cur.key,
    label: b.label !== undefined ? str(b.label, 60) : cur.label,
    unit: b.unit !== undefined ? str(b.unit, 20) : cur.unit,
    slot: (b.slot !== undefined ? str(b.slot, 1) : cur.slot) as SlotKey,
    source: (b.source !== undefined ? b.source : cur.source) as SpecSource,
  };
  const { catalog } = await loadCatalog(g.session.tenantId);
  const bad = specDefError(def, catalog, cur.productCode);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  await withTenant(g.session.tenantId, async (tx) => {
    await tx.specItem.update({ where: { id }, data: { label: def.label, unit: def.unit, slot: def.slot, source: cleanSource(def.source) as object } });
    await writeAudit(tx, g.session.userId, "update", "spec_item", id, { label: cur.label, slot: cur.slot, source: cur.source }, { label: def.label, slot: def.slot, source: cleanSource(def.source) });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const used = await specItemUsage();
  if (used > 0) return NextResponse.json({ error: `사용 중이라 지울 수 없습니다 (${used})` }, { status: 409 });
  const n = await withTenant(g.session.tenantId, async (tx) => {
    const cur = await tx.specItem.findFirst({ where: { id } });
    if (!cur) return 0;
    await tx.specItem.delete({ where: { id } });
    await writeAudit(tx, g.session.userId, "delete", "spec_item", id, { key: cur.key, productCode: cur.productCode }, null);
    return 1;
  });
  if (!n) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
