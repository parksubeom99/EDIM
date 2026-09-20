import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { runApprovedForSession } from "@/app/lib/macro/run";
import type { SlotValues } from "@/app/lib/rccs";
import { buildEbom, buildCost } from "@/app/lib/output/bom";
import { runBomCode, toBomLine, catalogFingerprint } from "@edim/bom-code";
import { loadCatalog } from "@/app/lib/catalog";
import { withTenant, saveBomCodeRun, getBomRun, latestRevisionId } from "@edim/db";

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
 *  2. 스냅샷에 **어느 코드 개정으로 돌렸는지**를 박는다.
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
  if (node) {
    const mr = await runApprovedForSession(node, slots);
    if (mr && mr.ok && typeof mr.value === "number" && Number.isFinite(mr.value)) macroValue = mr.value;
  }
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
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(slots)) if (typeof v === "string" && v) clean[k] = v;
    const snap = await withTenant(session.tenantId, async (tx) =>
      saveBomCodeRun(tx, {
        stableId: node,
        code: typeof body.code === "string" ? body.code : "", slots: clean, macroValue, parentCode: result.parent,
        catalogFp, lines: result.lines as unknown as object[], cost: cost as unknown as object,
        codeRevisionId: node ? await latestRevisionId(tx, node) : null,
        createdBy: session.userId,
      }),
    );
    return NextResponse.json({ ...base, lines, trace, mainCode: result.mainCode, catalogFp, runId: snap.id, macroValue, message: `BOM ${lines.length}행 · 코드 관계 ${result.parent} · 스냅샷 ${snap.id.slice(0, 8)}` });
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
