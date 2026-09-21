import type { TenantClient } from "./tenant";

/**
 * P6 — 추적. 구매 요청 한 줄·견적 한 장에서 **거꾸로** 따라간다:
 *   산출물 → BOM 스냅샷 → 코드 개정 → 카탈로그 지문 → 승인 매크로 개정 → 승인 기록
 * 전부 저장된 값이다. 여기서 다시 계산하거나 지금의 카탈로그를 들여다보지 않는다.
 */
export interface RunTrace {
  snapshot: { id: string; code: string; createdAt: Date; catalogFp: string; macroValue: number | null; total: number | null; lines: number };
  project: { projectNo: string; name: string } | null;
  codeRevision: { id: string; rev: number; code: string; reason: string | null } | null;
  macro: { id: string; revision: number; dsl: string } | null;
  approvals: { tier: string; state: string; requestedAt: Date; decidedAt: Date | null }[];
  approved: boolean;
  drawings: { drawingNo: string; rev: string; status: string }[];
  documents: { docNo: string; type: string; rev: string; status: string }[];
  purchaseRequest: { prNo: string; poNo: string | null; status: string; lines: number } | null;
}

export async function traceRun(tx: TenantClient, runId: string): Promise<RunTrace | null> {
  const run = await tx.bomCodeRun.findUnique({ where: { id: runId } });
  if (!run) return null;
  const [project, rev, approvals, drawings, documents, pr] = await Promise.all([
    run.hierarchyStable ? tx.project.findFirst({ where: { hierarchyStable: run.hierarchyStable } }) : null,
    run.codeRevisionId ? tx.codeRevision.findUnique({ where: { id: run.codeRevisionId } }) : null,
    tx.projectApproval.findMany({ where: { bomRunId: runId }, orderBy: { requestedAt: "asc" } }),
    tx.drawing.findMany({ where: { bomRunId: runId }, orderBy: { createdAt: "asc" } }),
    tx.document.findMany({ where: { bomRunId: runId }, orderBy: { createdAt: "asc" } }),
    tx.purchaseRequest.findFirst({ where: { bomRunId: runId }, include: { lines: true } }),
  ]);
  const cost = run.cost as { total?: number } | null;
  const tierOf = (n: string | null) => ((n ?? "").startsWith("tier:platform") ? "platform" : (n ?? "").startsWith("tier:org") ? "org" : "—");
  return {
    snapshot: {
      id: run.id, code: run.code, createdAt: run.createdAt, catalogFp: run.catalogFp, macroValue: run.macroValue,
      total: typeof cost?.total === "number" ? cost.total : null, lines: Array.isArray(run.lines) ? run.lines.length : 0,
    },
    project: project ? { projectNo: project.projectNo, name: project.name } : null,
    codeRevision: rev ? { id: rev.id, rev: rev.revNo, code: rev.code, reason: rev.reason } : null,
    macro: run.macroId && run.macroRevision !== null && run.macroDsl ? { id: run.macroId, revision: run.macroRevision, dsl: run.macroDsl } : null,
    approvals: approvals.map((a) => ({ tier: tierOf(a.note), state: a.state, requestedAt: a.requestedAt, decidedAt: a.decidedAt })),
    approved: approvals.some((a) => a.state === "approved" && (a.note ?? "").startsWith("tier:org")),
    drawings: drawings.map((d) => ({ drawingNo: d.drawingNo, rev: d.currentRev, status: d.status })),
    documents: documents.map((d) => ({ docNo: d.docNo, type: d.docType, rev: d.currentRev, status: d.status })),
    purchaseRequest: pr ? { prNo: pr.prNo, poNo: pr.poNo, status: pr.status, lines: pr.lines.length } : null,
  };
}
