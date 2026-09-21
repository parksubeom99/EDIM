import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { decideApproval, ApprovalBindingError } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canDecideApproval } from "@/app/lib/project-perms";

/** Approve/reject — the tightest gate (owner/engineer only). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canDecideApproval(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    decision?: unknown;
    note?: unknown;
  };
  if (body.decision !== "approved" && body.decision !== "rejected")
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note : null;

  try {
  await withTenantSession(session, (tx) =>
    decideApproval(
      tx,
      id,
      body.decision as "approved" | "rejected",
      session.userId,
      note,
    ),
  );
  } catch (e) {
    if (e instanceof ApprovalBindingError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
