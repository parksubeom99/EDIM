import { withTenant, getBomRun, getProjectByStable } from "@edim/db";
import type { SnapshotLike, ProjectLike, Refusal } from "./document";

/**
 * 문서·구매 요청의 입력을 읽는다 — **스냅샷 한 줄**과, 그 스냅샷이 묶인 프로젝트.
 * 프로젝트는 번호 머리(QR-61313 · PR-61313)와 문서 머리말에만 쓴다. 숫자는 전부 스냅샷에서 온다.
 */
export async function documentSourceFromRun(
  tenantId: string,
  runId: string,
): Promise<{ ok: true; run: SnapshotLike & { stableId: string | null }; project: ProjectLike | null } | Refusal> {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(runId)) return { ok: false, status: 400, error: "runId 형식이 올바르지 않습니다" };
  return withTenant(tenantId, async (tx) => {
    const snap = await getBomRun(tx, runId);
    if (!snap) return { ok: false as const, status: 404, error: "BOM 스냅샷을 찾을 수 없습니다" };
    const p = snap.hierarchyStable ? await getProjectByStable(tx, snap.hierarchyStable) : null;
    return {
      ok: true as const,
      run: {
        id: snap.id, code: snap.code, slots: snap.slots, macroValue: snap.macroValue,
        macroId: snap.macroId, macroRevision: snap.macroRevision, macroDsl: snap.macroDsl,
        catalogFp: snap.catalogFp, codeRevisionId: snap.codeRevisionId,
        lines: snap.lines, cost: snap.cost, stableId: snap.hierarchyStable,
      },
      project: p ? { projectNo: p.projectNo, name: p.name, clientName: p.clientName } : null,
    };
  });
}
