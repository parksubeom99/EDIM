import { NextResponse, type NextRequest } from "next/server";

import { withTenant, upsertProductCode } from "@edim/db";
import { sectionDimsFor, type ProductCode, type SlotValues } from "@edim/bom-code";

import { loadCatalog } from "@/app/lib/catalog";
import { guard, str, dbError } from "../_guard";

/**
 * Arrangement Set-up (p35·36·46·58 · 코퍼스 EDIM_ARRANGEMENT_SETUP_DRAWING_VIEW_MODEL.md).
 * 1차 슬라이스: 구획(section)별 **길이**만 등록한다. 스키마 변경 없음 — 길이는 제품 코드의
 * sections 배열에 `len` 으로 얹혀 저장되고, BOM Run 시점에 스냅샷 dims 로 박힌다.
 * 방향(L0~R270)·Component 배치·2D 3각법·3D 는 2차(코퍼스 MVP)로 미룬다.
 *
 * GET  ?code=EU&slots={...} → { sections: [{name, len|null}] }  (현재 슬롯에서 활성인 구획 + 등록 길이)
 * POST { code, lengths: { <sectionName>: number } } → 그 이름의 구획에 길이를 얹어 upsert (다른 필드 보존)
 */

function findProduct(catalog: { productCodes: ProductCode[] }, code: string): ProductCode | undefined {
  return catalog.productCodes.find((p) => p.code === code && p.kind === "product");
}

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const code = str(new URL(req.url).searchParams.get("code") ?? "", 40);
  let slots: SlotValues = {};
  try { slots = JSON.parse(new URL(req.url).searchParams.get("slots") ?? "{}") as SlotValues; } catch { slots = {}; }
  const { catalog } = await loadCatalog(g.session.tenantId);
  const product = code ? findProduct(catalog, code) : undefined;
  if (!product) return NextResponse.json({ sections: [] });
  // 활성 구획(현재 슬롯 기준). L=1 을 주면 len 미등록 구획의 fallback 이 1 이 되어 "미등록"을 null 로 구분한다.
  const active = sectionDimsFor(product, slots, 1);
  const declared = new Map((product.sections ?? []).map((s) => [s.name, typeof s.len === "number" ? s.len : null]));
  const sections = active.map((s) => ({ name: s.name, len: declared.get(s.name) ?? null }));
  return NextResponse.json({ sections });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as { code?: unknown; lengths?: unknown };
  const code = str(b.code, 40);
  if (!code) return NextResponse.json({ error: "code 필수" }, { status: 400 });
  const lengths = (b.lengths && typeof b.lengths === "object" ? b.lengths : {}) as Record<string, unknown>;
  for (const v of Object.values(lengths))
    if (!(typeof v === "number" && Number.isFinite(v) && v > 0))
      return NextResponse.json({ error: "길이는 양수여야 합니다" }, { status: 400 });

  const { catalog } = await loadCatalog(g.session.tenantId);
  const product = findProduct(catalog, code);
  if (!product) return NextResponse.json({ error: `제품 코드 ${code} 없음` }, { status: 404 });

  // 기존 sections 를 그대로 두고, lengths 에 있는 이름에만 len 을 얹거나 지운다.
  const nextSections = (product.sections ?? []).map((s) => {
    if (!(s.name in lengths)) return s;
    const len = lengths[s.name] as number;
    return { name: s.name, ...(s.when ? { when: s.when } : {}), len };
  });

  try {
    const row = await withTenant(g.session.tenantId, (tx) =>
      upsertProductCode(tx, {
        code: product.code, name: product.name, kind: product.kind,
        category: product.category, unit: product.unit,
        specTemplate: product.specTemplate, materialTemplate: product.materialTemplate,
        tables: product.tables as unknown as object,
        sections: nextSections as unknown as object[],
        createdBy: g.session.userId,
      }),
    );
    return NextResponse.json({ ok: true, id: row.id, code: row.code });
  } catch (e) { return dbError(e); }
}
