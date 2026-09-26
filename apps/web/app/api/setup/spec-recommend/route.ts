import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@edim/db";
import { recommendSlots, type SpecItemDef, type SlotKey, type SpecSource } from "@edim/bom-code";
import { loadCatalog } from "@/app/lib/catalog";
import { guard, str } from "../_guard";

/**
 * ⑥ 사양 입력표 → 코드 추천 (청사진 p46). 읽기만 한다 — 저장은 Code Builder 의 개정 저장(code_revision) 한 곳.
 * POST { productCode, inputs: { key: "값" } } → { slots, lines, unmet }
 *   slots  = 등록된 Sub Code 값 중 사양을 모두 만족하는 것(없으면 unmet 에 슬롯)
 *   lines  = 사양마다 근거 한 줄
 */
export async function POST(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const productCode = str(b.productCode, 40);
  const raw = b.inputs;
  if (!productCode || !raw || typeof raw !== "object" || Array.isArray(raw))
    return NextResponse.json({ error: "productCode · inputs(객체) 필수" }, { status: 400 });
  const inputs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "string" && typeof v !== "number") return NextResponse.json({ error: `사양 값은 글자나 수: ${k}` }, { status: 400 });
    inputs[k] = String(v).slice(0, 40);
  }
  const [{ catalog }, rows] = await Promise.all([
    loadCatalog(g.session.tenantId),
    withTenant(g.session.tenantId, (tx) => tx.specItem.findMany({ where: { productCode }, orderBy: [{ seq: "asc" }] })),
  ]);
  if (!catalog.productCodes.some((p) => p.code === productCode && p.kind === "product"))
    return NextResponse.json({ error: `제품 코드 ${productCode} 없음` }, { status: 404 });
  const defs: SpecItemDef[] = rows.map((r) => ({ key: r.key, label: r.label, unit: r.unit, slot: r.slot as SlotKey, source: r.source as unknown as SpecSource }));
  const unknown = Object.keys(inputs).filter((k) => inputs[k]!.trim() !== "" && !defs.some((d) => d.key === k));
  if (unknown.length) return NextResponse.json({ error: `정의되지 않은 사양: ${unknown.join(", ")}` }, { status: 400 });
  return NextResponse.json(recommendSlots(catalog, productCode, defs, inputs));
}
