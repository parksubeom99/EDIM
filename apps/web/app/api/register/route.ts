import { NextResponse, type NextRequest } from "next/server";

import { withTenant, listDocuments, listDrawings } from "@edim/db";

import { getServerSession } from "@/app/lib/session";

/**
 * 승인 대장 (p55 [EDIM Approval Management] — DOC No · Version · Status · Released · Approver).
 *
 * 지금까지 문서(견적·Tech Data)와 도면(평면·정면·우측면·조립)은 각자 화면에서만 보였다.
 * 이 대장은 **둘을 한 표로 모아** 무엇이 어느 개정에서 어떤 상태인지 한눈에 보여 준다.
 * 새 데이터는 만들지 않는다 — 있는 것을 모아 볼 뿐이고, 상태 전이는 기존 문서·도면 화면에서 한다.
 *
 * GET ?node=<hierarchyStable>&status=<draft|review|approved|issued>&kind=<document|drawing>
 *   → { rows: [...], counts: {draft, review, approved, issued} }
 * 줄은 최신 갱신 순. 값은 전부 DB 에서 온다(화면이 상태를 짐작하지 않는다).
 */

export interface RegisterRow {
  id: string;
  kind: "document" | "drawing";
  /** DOC No · DWG No (p55 "DOC No.") */
  no: string;
  /** 종류 — quotation·techdata · plan/front/right/assembly */
  type: string;
  /** Version (p55) = 현재 개정 A, B, … */
  rev: string;
  status: string;
  code: string;
  bomRunId: string;
  /** Released — 발행(issued)된 시각. 발행 전이면 null */
  releasedAt: string | null;
  updatedAt: string;
}

const STATUSES = ["draft", "review", "approved", "issued"] as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const node = q.get("node");
  const status = q.get("status");
  const kind = q.get("kind");
  if (status && !(STATUSES as readonly string[]).includes(status))
    return NextResponse.json({ error: `상태가 아닙니다: ${status}` }, { status: 400 });
  if (kind && kind !== "document" && kind !== "drawing")
    return NextResponse.json({ error: `종류가 아닙니다: ${kind}` }, { status: 400 });

  const [docs, dwgs] = await withTenant(session.tenantId, async (tx) => [
    await listDocuments(tx, node),
    await listDrawings(tx, node),
  ]);

  const rows: RegisterRow[] = [
    ...docs.map((d) => ({
      id: d.id, kind: "document" as const, no: d.docNo, type: d.docType, rev: d.currentRev,
      status: d.status, code: d.code, bomRunId: d.bomRunId,
      // 발행 시각은 따로 두지 않는다 — 발행은 마지막 상태 변경이므로 issued 일 때 updatedAt 이 그 시각이다.
      releasedAt: d.status === "issued" ? d.updatedAt.toISOString() : null,
      updatedAt: d.updatedAt.toISOString(),
    })),
    ...dwgs.map((d) => ({
      id: d.id, kind: "drawing" as const, no: d.drawingNo, type: d.drawingType, rev: d.currentRev,
      status: d.status, code: d.code, bomRunId: d.bomRunId,
      releasedAt: d.status === "issued" ? d.updatedAt.toISOString() : null,
      updatedAt: d.updatedAt.toISOString(),
    })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // 상태 칩의 숫자는 **상태 필터를 걸기 전** 기준이다 — 걸고 나서 세면 나머지 칩이 전부 0 으로 보인다.
  const inKind = rows.filter((r) => !kind || r.kind === kind);
  const counts = Object.fromEntries(STATUSES.map((st) => [st, inKind.filter((r) => r.status === st).length]));
  const shown = inKind.filter((r) => !status || r.status === status);
  return NextResponse.json({ rows: shown, counts, total: shown.length, totalInKind: inKind.length });
}
