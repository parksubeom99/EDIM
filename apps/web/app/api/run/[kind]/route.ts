import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

const KINDS = new Set(["bom", "edim", "ebom", "cost"]);

/**
 * Action Bar run endpoints (p62). M1 = interface fixed, execution stubbed.
 * M2 (Toolbox execution loop) replaces the body with the deterministic runner.
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
  };
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
