import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { requestApproval, ApprovalBindingError } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: unknown; runId?: unknown };
  const note = typeof body.note === "string" ? body.note : null;
  // P6: 승인은 BOM 스냅샷에 대해 요청한다 — 무엇을 승인하는지 모르는 승인은 받지 않는다.
  const runId = typeof body.runId === "string" ? body.runId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    return NextResponse.json({ error: "runId 필요 — 승인은 BOM 스냅샷에 대해 요청합니다(먼저 BOM Run)" }, { status: 400 });

  try {
    const approvalId = await withTenantSession(session, (tx) =>
      requestApproval(tx, id, session.userId, note, runId),
    );
    return NextResponse.json({ ok: true, id: approvalId, runId });
  } catch (e) {
    if (e instanceof ApprovalBindingError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
