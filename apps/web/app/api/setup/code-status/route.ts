import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str } from "../_guard";

/**
 * p32 자재·구매 코드별 Approval Status(0025). POST { code, status: draft|approved|retired }
 * 한 방향만: (미지정) → 작성중 → 승인 → 사용중지. 역행은 409 — DB 트리거(product_code_status_guard)가 한 번 더 막는다.
 * 사용중지 코드에는 새 단가·새 도면을 붙이지 않는다(409). 이미 뜬 BOM 스냅샷은 그대로.
 */
const ORDER = ["draft", "approved", "retired"] as const;
const CODE_STATUS_LABEL: Record<string, string> = { draft: "작성중", approved: "승인", retired: "사용중지" };

/** GET ?code= → { status: draft|approved|retired|null } */
export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const code = str(new URL(req.url).searchParams.get("code") ?? "", 40);
  const p = code ? await withTenant(g.session.tenantId, (tx) => tx.productCode.findFirst({ where: { code } })) : null;
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ code, status: p.approvalStatus });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = str(b.code, 40), status = str(b.status, 10);
  if (!code || !(ORDER as readonly string[]).includes(status)) return NextResponse.json({ error: "code · status(draft|approved|retired) 필수" }, { status: 400 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const p = await tx.productCode.findFirst({ where: { code } });
    if (!p) return { status: 404, error: `코드 ${code} 없음` };
    const from = p.approvalStatus ? ORDER.indexOf(p.approvalStatus as (typeof ORDER)[number]) : -1;
    const to = ORDER.indexOf(status as (typeof ORDER)[number]);
    if (to < from) return { status: 409, error: `상태는 되돌릴 수 없습니다 (${CODE_STATUS_LABEL[p.approvalStatus!]} → ${CODE_STATUS_LABEL[status]})` };
    if (to === from) return { status: 409, error: `이미 ${CODE_STATUS_LABEL[status]} 입니다` };
    await tx.productCode.update({ where: { id: p.id }, data: { approvalStatus: status } });
    await writeAudit(tx, g.session.userId, "update", "product_code", p.id, { approvalStatus: p.approvalStatus }, { approvalStatus: status });
    return { ok: true };
  });
  if (!("ok" in out)) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, status });
}
