import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { runApprovedForSession } from "@/app/lib/macro/run";
import type { SlotValues } from "@/app/lib/rccs";
import { buildEbom, buildCost } from "@/app/lib/output/bom";
import { runBomCode, toBomLine, catalogFingerprint } from "@edim/bom-code";
import { loadCatalog } from "@/app/lib/catalog";
import { withTenant, saveBomCodeRun } from "@edim/db";

const KINDS = new Set(["bom", "edim", "ebom", "cost"]);

/**
 * Action Bar run endpoints (p62). edim = approved macro (M2) · bom/ebom/cost =
 * CODE-BASED BOM (P1, GAP1): registered Product Code + Code Relationship + tables
 * from the Set-Up DB → pure engine. No slot→function fallback: an unregistered
 * product code is a 422, not a guessed BOM. A BOM run leaves a BomCodeRun snapshot.
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
    macroValue?: unknown;
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
  const macroValue = typeof body.macroValue === "number" ? body.macroValue : null;
  const at = new Date().toISOString();
  const base = { ok: true, status: "ran", kind, projectId: typeof body.projectId === "string" ? body.projectId : null, code: typeof body.code === "string" ? body.code : null, at };
  const { catalog, rejected } = await loadCatalog(session.tenantId);
  const result = runBomCode(catalog, slots, macroValue);
  if (!result.ok)
    return NextResponse.json({ error: `${result.error.code}: ${result.error.message}`, rejected }, { status: 422 });
  const lines = result.lines.map(toBomLine);
  const trace = result.lines.map((l) => ({ no: l.no, childCode: l.childCode, resolvedCode: l.resolvedCode, relSeq: l.relSeq, remarks: l.remarks }));
  const catalogFp = catalogFingerprint(catalog);
  if (kind === "bom") {
    const cost = buildCost(lines);
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(slots)) if (typeof v === "string" && v) clean[k] = v;
    const snap = await withTenant(session.tenantId, (tx) =>
      saveBomCodeRun(tx, {
        stableId: typeof body.node === "string" && UUID.test(body.node) ? body.node : null,
        code: typeof body.code === "string" ? body.code : "", slots: clean, macroValue, parentCode: result.parent,
        catalogFp, lines: result.lines as unknown as object[], cost: cost as unknown as object, createdBy: session.userId,
      }),
    );
    return NextResponse.json({ ...base, lines, trace, mainCode: result.mainCode, catalogFp, runId: snap.id, message: `BOM ${lines.length}행 · 코드 관계 ${result.parent} · 스냅샷 ${snap.id.slice(0, 8)}` });
  }
  if (kind === "ebom") { const groups = buildEbom(lines, slots, result.sections); return NextResponse.json({ ...base, groups, catalogFp, message: `EBOM ${groups.length}섹션 · ${lines.length}행` }); }
  if (kind === "cost") { const cost = buildCost(lines); return NextResponse.json({ ...base, cost, catalogFp, value: cost.total, message: `원가 합계 ₩${cost.total.toLocaleString("ko-KR")}` }); }
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
