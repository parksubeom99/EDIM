import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { compileMacroForSession } from "@/app/lib/macro/compile";

/**
 * p27 Prompt → Macro. Build-time only: the model PROPOSES a DSL line, compile()
 * parses + statically verifies it, and nothing is stored or run here — the user
 * still has to Verify → Save draft → get it approved. Without ANTHROPIC_API_KEY
 * this says so plainly (no canned answer pretending to be the model).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { request?: unknown };
  const request = typeof body.request === "string" ? body.request.trim().slice(0, 1000) : "";
  if (!request) return NextResponse.json({ error: "request required" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ ok: false, llm: false, message: "번역 모델이 연결되지 않았습니다 (.env ANTHROPIC_API_KEY). Macro 칸에 직접 입력하면 검증·역번역·승인·실행은 그대로 동작합니다." });
  const r = await compileMacroForSession(request);
  if (!r) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: r.dsl !== null, llm: true, dsl: r.dsl, verified: r.verified, diagnostics: r.diagnostics, attempts: r.attempts });
}
