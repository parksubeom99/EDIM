import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { runApprovedForSession } from "@/app/lib/macro/run";
import type { SlotValues } from "@/app/lib/rccs";

const KINDS = new Set(["bom", "edim", "ebom", "cost"]);

/**
 * Action Bar run endpoints (p62). M2: `edim` runs the node's approved macro
 * deterministically (no LLM at runtime). bom/ebom/cost stay stubbed until M3.
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
