import { NextResponse, type NextRequest } from "next/server";

import { withTenant, upsertProductCode } from "@edim/db";
import { sectionDimsFor, isDirection, isAt, isLevel, type ProductCode, type SectionDef, type ComponentPos, type SlotValues } from "@edim/bom-code";

import { loadCatalog } from "@/app/lib/catalog";
import { guard, str, dbError } from "../_guard";

/**
 * Arrangement Set-up (p13·35·36·46·58 · 코퍼스 EDIM_ARRANGEMENT_SETUP_DRAWING_VIEW_MODEL.md).
 *
 * 1차(2026-09-22): 구획(section)별 **길이**. 2차(2026-09-23): 구획 **순서(Move)·추가(Add)·삭제(Delete)**
 * 와 **방향(L0~R270, p36 Fan Direction)**. 스키마 변경은 여전히 없다 — 전부 제품 코드의 sections 배열이고,
 * BOM Run 시점에 스냅샷 dims.sections 로 박힌다(0011).
 * 남은 2차: 2D 3각법·3D View·Design Tool Binding(코퍼스 MVP) — drawing_type 확장이 필요해 Tier B.
 *
 * GET  ?code=EU&slots={...}
 *   → { sections: [{name, len|null, dir|null, when: bool, active: bool, locked: bool}] }
 *     등록된 전체 구획을 순서대로 준다. active = 지금 슬롯에서 도는 구획, when = 조건부 구획,
 *     locked = 그 구획에 BOM 관계가 걸려 있어 삭제하면 줄이 갈 곳을 잃는 구획.
 * POST { code, sections: [{name, len?, dir?}] }  ← 배열 순서가 곧 구획 순서
 *   → 이름으로 기존 구획의 조건(when)을 물려받고, 새 이름은 새 구획으로 추가, 빠진 이름은 삭제.
 *     삭제 대상에 BOM 관계가 걸려 있으면 409 로 거부한다(줄이 갈 곳을 잃지 않게).
 *   (구 형식 { code, lengths: {name: len} } 도 그대로 받는다 — 1차 e2e 보존)
 */

function findProduct(catalog: { productCodes: ProductCode[] }, code: string): ProductCode | undefined {
  return catalog.productCodes.find((p) => p.code === code && p.kind === "product");
}

/** 그 제품의 자식 관계가 쓰는 구획 이름 (삭제 잠금 근거) */
function usedSections(catalog: { relationships: { parent: string; section: string }[] }, code: string): Set<string> {
  return new Set(catalog.relationships.filter((r) => r.parent === code).map((r) => r.section));
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
  const active = new Set(sectionDimsFor(product, slots, 1).map((s) => s.name));
  const used = usedSections(catalog, product.code);
  // 그 구획에 실제로 달린 BOM 자식 — 배치할 수 있는 부품 목록이다(화면이 목록을 지어내지 않게)
  const childrenBySection = new Map<string, string[]>();
  for (const r of catalog.relationships.filter((r) => r.parent === product.code))
    childrenBySection.set(r.section, [...(childrenBySection.get(r.section) ?? []), r.child]);

  const sections = (product.sections ?? []).map((s) => ({
    name: s.name,
    len: typeof s.len === "number" ? s.len : null,
    dir: isDirection(s.dir) ? s.dir : null,
    components: s.components ?? [],
    children: childrenBySection.get(s.name) ?? [],
    when: Boolean(s.when),
    active: active.has(s.name),
    locked: used.has(s.name),
  }));
  return NextResponse.json({ sections });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as { code?: unknown; lengths?: unknown; sections?: unknown };
  const code = str(b.code, 40);
  if (!code) return NextResponse.json({ error: "code 필수" }, { status: 400 });

  const { catalog } = await loadCatalog(g.session.tenantId);
  const product = findProduct(catalog, code);
  if (!product) return NextResponse.json({ error: `제품 코드 ${code} 없음` }, { status: 404 });
  const prev = product.sections ?? [];
  const prevByName = new Map(prev.map((s) => [s.name, s]));

  let nextSections: SectionDef[];

  if (Array.isArray(b.sections)) {
    // ── 2차: 배열 전체 교체(순서·추가·삭제·길이·방향) ──
    const rows = b.sections as { name?: unknown; len?: unknown; dir?: unknown; components?: unknown }[];
    if (rows.length === 0) return NextResponse.json({ error: "구획이 하나도 없을 수는 없습니다" }, { status: 400 });
    const seen = new Set<string>();
    nextSections = [];
    for (const r of rows) {
      const name = str(r.name, 24);
      if (!name) return NextResponse.json({ error: "구획 이름은 비울 수 없습니다" }, { status: 400 });
      if (seen.has(name)) return NextResponse.json({ error: `구획 이름 중복: ${name}` }, { status: 400 });
      seen.add(name);
      if (r.len != null && !(typeof r.len === "number" && Number.isFinite(r.len) && r.len > 0))
        return NextResponse.json({ error: "길이는 양수여야 합니다" }, { status: 400 });
      if (r.dir != null && !isDirection(r.dir))
        return NextResponse.json({ error: `방향 값이 아닙니다: ${String(r.dir)}` }, { status: 400 });
      // Component 배치(p36): 그 구획의 BOM 자식만 놓을 수 있다 — 없는 부품을 도면에 그리지 않는다.
      let comps: ComponentPos[] | undefined;
      if (r.components !== undefined) {
        if (!Array.isArray(r.components)) return NextResponse.json({ error: "components 는 배열이어야 합니다" }, { status: 400 });
        const allowed = new Set(catalog.relationships.filter((x) => x.parent === product.code && x.section === name).map((x) => x.child));
        const acc: ComponentPos[] = [];
        for (const c of r.components as { code?: unknown; at?: unknown; level?: unknown }[]) {
          const code = str(c.code, 40);
          if (!code) return NextResponse.json({ error: "부품 코드가 비었습니다" }, { status: 400 });
          if (!allowed.has(code))
            return NextResponse.json({ error: `${name} 구획의 부품이 아닙니다: ${code} — Set-Up ▸ Code Relationship 에서 먼저 연결하십시오` }, { status: 409 });
          if (!isAt(c.at) || !isLevel(c.level))
            return NextResponse.json({ error: "배치 값이 아닙니다 (앞·중·뒤 × 상·중·하)" }, { status: 400 });
          if (acc.some((x) => x.code === code)) return NextResponse.json({ error: `부품 배치 중복: ${code}` }, { status: 400 });
          acc.push({ code, at: c.at, level: c.level });
        }
        comps = acc;
      }
      const old = prevByName.get(name);
      nextSections.push({
        name,
        ...(old?.when ? { when: old.when } : {}),            // 조건은 이름으로 물려받는다(화면에서 만들지 않는다)
        ...(typeof r.len === "number" ? { len: r.len } : {}),
        ...(isDirection(r.dir) ? { dir: r.dir } : {}),
        ...(comps !== undefined ? (comps.length > 0 ? { components: comps } : {}) : (old?.components ? { components: old.components } : {})),
      });
    }
    // 삭제되는 구획에 BOM 관계가 걸려 있으면 거부한다 — 그 줄들이 갈 곳을 잃는다.
    const used = usedSections(catalog, product.code);
    const removedInUse = prev.map((s) => s.name).filter((n) => !seen.has(n) && used.has(n));
    if (removedInUse.length > 0)
      return NextResponse.json(
        { error: `BOM 관계가 걸린 구획은 지울 수 없습니다: ${removedInUse.join(", ")} — Set-Up ▸ Code Relationship 에서 먼저 옮기십시오` },
        { status: 409 },
      );
  } else {
    // ── 1차 호환: { lengths: { name: len } } — 있는 구획에 길이만 얹는다 ──
    const lengths = (b.lengths && typeof b.lengths === "object" ? b.lengths : {}) as Record<string, unknown>;
    for (const v of Object.values(lengths))
      if (!(typeof v === "number" && Number.isFinite(v) && v > 0))
        return NextResponse.json({ error: "길이는 양수여야 합니다" }, { status: 400 });
    nextSections = prev.map((s) => {
      if (!(s.name in lengths)) return s;
      return { name: s.name, ...(s.when ? { when: s.when } : {}), ...(isDirection(s.dir) ? { dir: s.dir } : {}), len: lengths[s.name] as number };
    });
  }

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
    return NextResponse.json({ ok: true, id: row.id, code: row.code, sections: nextSections.length });
  } catch (e) { return dbError(e); }
}
