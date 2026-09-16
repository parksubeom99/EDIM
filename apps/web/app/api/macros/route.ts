import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { listMacros } from "@/app/lib/macro/registry";
import { draftDslForSession } from "@/app/lib/macro/run";
import { verifyMacroForSession } from "@/app/lib/macro/verify";

/** GET ?node=<stable> → macros bound to the node. */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const node = req.nextUrl.searchParams.get("node");
  if (!node) return NextResponse.json({ error: "node required" }, { status: 400 });
  const rows = (await listMacros(node)) ?? [];
  return NextResponse.json({
    macros: rows.map((m) => ({
      id: m.id, dsl: m.dsl, status: m.status, revision: m.revision,
      verified: m.verifiedAtApproval, createdAt: m.createdAt.toISOString(),
    })),
  });
}

/** POST {node, dsl, mode:'verify'|'draft'} → diagnostics (+ macroId on draft). */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { node?: unknown; dsl?: unknown; mode?: unknown };
  if (typeof body.dsl !== "string" || typeof body.node !== "string")
    return NextResponse.json({ error: "node + dsl required" }, { status: 400 });
  if (body.mode === "verify") {
    const diagnostics = (await verifyMacroForSession(body.dsl)) ?? [];
    return NextResponse.json({ macroId: null, diagnostics });
  }
  const r = await draftDslForSession(body.node, body.dsl);
  return NextResponse.json(r ?? { macroId: null, diagnostics: [] });
}
