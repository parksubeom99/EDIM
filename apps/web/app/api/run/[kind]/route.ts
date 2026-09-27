import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { runApprovedForSession } from "@/app/lib/macro/run";
import type { SlotValues } from "@/app/lib/rccs";
import { buildEbom, buildCost } from "@/app/lib/output/bom";
import { runBomCode, toBomLine, catalogFingerprint, dimsFor, sectionDimsFor, designRulesOf, checkDesign, buyItemOf } from "@edim/bom-code";
import { applyPriceHistory, type PriceRowLike } from "@/app/lib/price";
import { businessToday, dateOnly } from "@/app/lib/today";
import { loadCatalog } from "@/app/lib/catalog";
import { withTenant, saveBomCodeRun, getBomRun, revisionIdForSlots } from "@edim/db";

const KINDS = new Set(["bom", "edim", "ebom", "cost"]);

/**
 * Action Bar run endpoints (p62). edim = approved macro (M2) · bom/ebom/cost =
 * CODE-BASED BOM (P1, GAP1): registered Product Code + Code Relationship + tables
 * from the Set-Up DB → pure engine. No slot→function fallback: an unregistered
 * product code is a 422, not a guessed BOM. A BOM run leaves a BomCodeRun snapshot.
 *
 * P4-a 에서 바뀐 것 (연결 장부 약함 3건):
 *  1. 매크로 값을 **서버가 직접 실행**해서 얻는다. 예전에는 브라우저가 계산해 둔
 *     값을 본문에 담아 보냈다 — 화면을 거치는 연결이라 근거가 약했다.
 *  2. 스냅샷에 **어느 코드 개정으로 돌렸는지**를 박는다(그 슬롯 조합으로 저장된 개정일 때만).
 *  3. EBOM·Cost 는 다시 계산하지 않고 **스냅샷을 읽는다**(runId 필수).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { kind } = await params;
  if (!KINDS.has(kind))
    return NextResponse.json({ error: "unknown run kind" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    projectId?: unknown;
    code?: unknown;
    node?: unknown;
    slots?: unknown;
    /** P4-a — EBOM·Cost 가 읽을 BOM 스냅샷 id */
    runId?: unknown;
  };
  if (kind === "edim") {
    if (typeof body.node !== "string")
      return NextResponse.json({ error: "node required" }, { status: 400 });
    const slots = (body.slots && typeof body.slots === "object" ? body.slots : {}) as SlotValues;
    const r = await runApprovedForSession(body.node, slots);
    if (!r) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({
      ok: r.ok, status: r.status, kind, projectId: typeof body.projectId === "string" ? body.projectId : null,
      code: typeof body.code === "string" ? body.code : null, macroId: r.macroId ?? null, revision: r.revision ?? null,
      dsl: r.dsl ?? null, value: r.value ?? null, message: r.message, at: new Date().toISOString(),
    });
  }
  const slots = (body.slots && typeof body.slots === "object" ? body.slots : {}) as SlotValues;
  const at = new Date().toISOString();
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const node = typeof body.node === "string" && UUID.test(body.node) ? body.node : null;

  // EBOM·Cost: 스냅샷을 읽는다. 매번 다시 계산하지 않는다.
  if (kind === "ebom" || kind === "cost") {
    const runId = typeof body.runId === "string" ? body.runId : "";
    if (!runId)
      return NextResponse.json(
        { error: "runId 필요 — 먼저 BOM Run 을 실행하세요(산출물은 스냅샷에서 나옵니다)." },
        { status: 409 },
      );
    const snap = await withTenant(session.tenantId, (tx) => getBomRun(tx, runId));
    if (!snap)
      return NextResponse.json({ error: "BOM 스냅샷을 찾을 수 없습니다" }, { status: 404 });
    const snapLines = (Array.isArray(snap.lines) ? snap.lines : []) as unknown as ReturnType<typeof toBomLine>[];
    const snapBase = { ok: true, status: "ran", kind, projectId: typeof body.projectId === "string" ? body.projectId : null, code: snap.code, at, runId };
    if (kind === "ebom") {
      const sections: string[] = [];
      for (const l of snapLines) if (l.section && !sections.includes(l.section)) sections.push(l.section);
      const groups = buildEbom(snapLines, (snap.slots ?? {}) as SlotValues, sections);
      return NextResponse.json({ ...snapBase, groups, catalogFp: snap.catalogFp, message: `EBOM ${groups.length}섹션 · ${snapLines.length}행 · 스냅샷 ${runId.slice(0, 8)}` });
    }
    const cost = snap.cost as unknown as { total: number };
    return NextResponse.json({ ...snapBase, cost, catalogFp: snap.catalogFp, value: cost.total, message: `원가 합계 ₩${cost.total.toLocaleString("ko-KR")} · 스냅샷 ${runId.slice(0, 8)}` });
  }

  // BOM: 매크로 값은 서버가 직접 낸다 — 클라이언트가 보낸 값은 쓰지 않는다.
  let macroValue: number | null = null;
  // P4-b: 값만이 아니라 **그 값을 낸 매크로 개정**도 스냅샷에 남긴다(Tech Data 의 근거).
  let macroSrc: { macroId: string; macroRevision: number; macroDsl: string } | null = null;
  if (node) {
    const mr = await runApprovedForSession(node, slots);
    if (mr && mr.ok && typeof mr.value === "number" && Number.isFinite(mr.value)) {
      macroValue = mr.value;
      if (mr.macroId && typeof mr.revision === "number" && mr.dsl)
        macroSrc = { macroId: mr.macroId, macroRevision: mr.revision, macroDsl: mr.dsl };
    }
  }
  const base = { ok: true, status: "ran", kind, projectId: typeof body.projectId === "string" ? body.projectId : null, code: typeof body.code === "string" ? body.code : null, at };
  const { catalog, rejected } = await loadCatalog(session.tenantId);
  const result = runBomCode(catalog, slots, macroValue);
  if (!result.ok)
    return NextResponse.json({ error: `${result.error.code}: ${result.error.message}`, rejected }, { status: 422 });
  const catalogFp = catalogFingerprint(catalog);   // 단가 이력은 카탈로그가 아니다 — 지문에 넣지 않는다(단가 한 줄로 옛 스냅샷이 막히지 않게)
  // p67 단가 이력 → 원가(ccmd E): BOM Run 순간 "현재 단가"를 줄에 입히고 출처를 박는다. 이후 스냅샷은 바뀌지 않는다.
  const codes = [...new Set(result.lines.map((l) => l.childCode))];
  // F10 · p66 · p67: 제조 정보 표(공정별 시간 × 임율)도 같은 순간에 읽는다 — 있으면 인건비 = Σ, 없으면 재료비 × 18%. 근거는 cost.laborBasis 로 스냅샷에.
  const [priceRows, mfgRows] = await withTenant(session.tenantId, async (tx) => [
    await tx.priceHistory.findMany({ where: { code: { in: codes } } }),
    await tx.mfgRate.findMany({ where: { productCode: result.parent }, orderBy: [{ seq: "asc" }, { createdAt: "asc" }] }),
  ] as const);
  const byCode = new Map<string, PriceRowLike[]>();
  for (const r of priceRows)
    byCode.set(r.code, [...(byCode.get(r.code) ?? []), { id: r.id, item: r.item, price: Number(r.price), currency: r.currency, supplier: r.supplier, effectiveFrom: dateOnly(r.effectiveFrom), createdAt: r.createdAt }]);
  const productOf = new Map(catalog.productCodes.map((p) => [p.code, p]));
  const priced = applyPriceHistory(result.lines, byCode, (l) => { const p = productOf.get(l.childCode); return p ? buyItemOf(p, slots) : null; }, businessToday());
  const lines = priced.map((l) => ({ ...toBomLine(l), priceSource: l.priceSource }));
  const trace = priced.map((l) => ({ no: l.no, childCode: l.childCode, resolvedCode: l.resolvedCode, relSeq: l.relSeq, remarks: l.remarks }));
  if (kind === "bom") {
    const cost = buildCost(lines, { productCode: result.parent, rows: mfgRows.map((r) => ({ process: r.process, equipment: r.equipment, hours: Number(r.hours), rate: Number(r.rate) })) });
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(slots)) if (typeof v === "string" && v) clean[k] = v;
    // 0011: 치수는 스냅샷을 뜨는 이 순간의 등록 표 값으로 함께 박는다 — 도면은 이후 이 값만 읽는다.
    const productForDims = catalog.productCodes.find((p) => p.code === result.parent && p.kind === "product");
    const drSnap = productForDims ? dimsFor(productForDims, slots) : null;
    const secDims = productForDims && drSnap && drSnap.ok ? sectionDimsFor(productForDims, slots, drSnap.dims.L, macroValue) : [];
    // 설계 검증(p36 Design Verification) — 규칙은 등록된 role="rule" 표에서 오고, 결과를 **스냅샷에 박는다**.
    // 지금 규칙을 나중에 고쳐도 이미 뜬 스냅샷의 판정은 그대로다(0011 과 같은 원칙).
    const rules = productForDims ? designRulesOf(productForDims) : [];
    const violations = drSnap && drSnap.ok ? checkDesign(rules, drSnap.dims, secDims) : [];
    const dimsSnap = drSnap && drSnap.ok
      ? { ...drSnap.dims, item: drSnap.item, tableName: drSnap.tableName, sections: secDims, rules: rules.length, violations }
      : null;
    const snap = await withTenant(session.tenantId, async (tx) =>
      saveBomCodeRun(tx, {
        stableId: node,
        code: typeof body.code === "string" ? body.code : "", slots: clean, macroValue, parentCode: result.parent,
        catalogFp, lines: priced as unknown as object[], cost: cost as unknown as object,
        // 이 슬롯 조합으로 저장된 개정만 근거로 삼는다(없으면 null — 최신 개정을 대신 박지 않는다).
        codeRevisionId: node ? await revisionIdForSlots(tx, node, clean) : null,
        ...(macroSrc ?? {}),
        dims: dimsSnap,
        createdBy: session.userId,
      }),
    );
    // 등록된 Key Dimension 을 함께 돌려준다 — 화면이 치수를 따로 계산하지 않도록.
    const dims = dimsSnap ? { W: dimsSnap.W, H: dimsSnap.H, L: dimsSnap.L, item: dimsSnap.item, sections: result.sections?.length ?? 0, rules: rules.length, violations } : null;
    return NextResponse.json({ ...base, lines, trace, mainCode: result.mainCode, catalogFp, runId: snap.id, macroValue, dims, message: `BOM ${lines.length}행 · 코드 관계 ${result.parent} · 스냅샷 ${snap.id.slice(0, 8)}` });
  }
  return NextResponse.json({
    ok: true,
    status: "stub",
    kind,
    projectId: typeof body.projectId === "string" ? body.projectId : null,
    code: typeof body.code === "string" ? body.code : null,
    message: `${kind.toUpperCase()} Run — 인터페이스 고정, 실행기는 M2에서 연결`,
    at: new Date().toISOString(),
  });
}
