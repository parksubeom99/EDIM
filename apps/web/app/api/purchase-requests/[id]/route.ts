import { NextResponse, type NextRequest } from "next/server";
import { withTenant, setPurchaseRequestStatus, isPrStatus, PrLockedError, BomNotApprovedError, PrBackwardsError } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

/** PATCH = Process 전이(작성중 → 견적 요청 → 발주, p51). 발주되면 PO 번호가 붙고 잠긴다. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isPrStatus(b.status))
    return NextResponse.json({ error: "status 필요 (draft|rfq|ordered)" }, { status: 400 });
  const status = b.status;
  try {
    const row = await withTenant(session.tenantId, (tx) =>
      setPurchaseRequestStatus(tx, { id, status, actorId: session.userId }),
    );
    return NextResponse.json({ ok: true, status: row.status, poNo: row.poNo });
  } catch (e) {
    if (e instanceof BomNotApprovedError || e instanceof PrLockedError || e instanceof PrBackwardsError)
      return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: "Process 변경 실패" }, { status: 409 });
  }
}
