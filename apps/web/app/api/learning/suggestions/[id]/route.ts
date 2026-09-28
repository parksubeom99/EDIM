import { NextResponse, type NextRequest } from "next/server";
import { withTenant, listSuggestions, setSuggestionState } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

/**
 * 학습 제안 채택 · 숨기기. 채택은 **기존 매크로 흐름 그대로**(2단 승인): Program Tool 에서 제안 식을 초안으로 저장(검증 통과)한 뒤
 * 그 초안 id 를 여기에 알린다 → 제안은 'adopted' 로, 회사 매크로 등록부의 초안을 가리킨다. 공식 승인은 회사가 Macro 승인으로 한 번 더.
 * viewer 403 · 다른 회사 제안 404 · 식이 다른 초안 409.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { action?: unknown; macroId?: unknown };
  const out = await withTenant(s.tenantId, async (tx) => {
    const row = UUID.test(id) ? (await listSuggestions(tx)).find((r) => r.id === id) : undefined;
    if (!row) return { status: 404, body: { error: "not found" } };
    if (b.action === "dismiss") { await setSuggestionState(tx, id, "dismissed", null); return { status: 200, body: { ok: true, state: "dismissed" } }; }
    if (b.action !== "adopt") return { status: 400, body: { error: "action = adopt | dismiss" } };
    if (typeof b.macroId !== "string" || !UUID.test(b.macroId)) return { status: 400, body: { error: "macroId(매크로 초안) 필요" } };
    const m = await tx.macroRegistry.findFirst({ where: { id: b.macroId } });
    if (!m) return { status: 404, body: { error: "이 회사의 매크로가 아닙니다" } };
    if (!row.expression || m.dsl.replace(/\s+/g, "") !== row.expression.replace(/\s+/g, "")) return { status: 409, body: { error: "초안의 식이 제안의 식과 다릅니다" } };
    await setSuggestionState(tx, id, "adopted", m.id);
    return { status: 200, body: { ok: true, state: "adopted", macroId: m.id } };
  });
  return NextResponse.json(out.body, { status: out.status });
}
