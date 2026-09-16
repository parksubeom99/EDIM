import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { approveMacro, rejectMacro } from "@/app/lib/macro/registry";

/** POST {decision:'approve'|'reject'} — owner/engineer only (canApprove/canReject). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { decision?: unknown };
  if (body.decision !== "approve" && body.decision !== "reject")
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });
  const out = body.decision === "approve" ? await approveMacro(id) : await rejectMacro(id);
  if (!out) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(out, { status: out.ok ? 200 : 409 });
}
