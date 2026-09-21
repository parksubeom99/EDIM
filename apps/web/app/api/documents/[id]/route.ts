import { NextResponse, type NextRequest } from "next/server";
import {
  withTenant, getDocument, setDocumentStatus, isDocumentStatus,
  DocumentLockedError, BomNotApprovedError, DocumentStatusBackwardsError,
} from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

/** GET = 문서 본문(JSON) · PATCH = 상태 전이(작성중→검토→승인→발행). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await withTenant(session.tenantId, (tx) => getDocument(tx, id)).catch(() => null);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    id: row.id, docNo: row.docNo, rev: row.currentRev, status: row.status, type: row.docType,
    code: row.code, bomRunId: row.bomRunId, body: row.body,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isDocumentStatus(b.status))
    return NextResponse.json({ error: "status 필요 (draft|review|approved|issued)" }, { status: 400 });
  const status = b.status;
  try {
    const row = await withTenant(session.tenantId, (tx) =>
      setDocumentStatus(tx, { id, status, actorId: session.userId }),
    );
    return NextResponse.json({ ok: true, status: row.status });
  } catch (e) {
    if (e instanceof BomNotApprovedError || e instanceof DocumentLockedError || e instanceof DocumentStatusBackwardsError)
      return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: "상태 변경 실패" }, { status: 409 });
  }
}
