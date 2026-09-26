import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str, UUID } from "../../../_guard";

/**
 * p35 Approve > Registration — 대기 중인 Arrangement Code 를 승인하거나 반려한다.
 * 결정은 owner 만, 한 번만(이미 결정된 것은 409). 한 회사에 편집자가 한 명뿐일 수 있어 요청자 본인 결정을 막지는 않는다(감사 로그에 둘 다 남는다).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  if (g.session.role !== "owner") return NextResponse.json({ error: "승인·반려는 owner 만 합니다" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = b.decision === "approve" ? "approved" : b.decision === "reject" ? "rejected" : null;
  if (!status) return NextResponse.json({ error: "decision 은 approve · reject" }, { status: 400 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const row = await tx.arrangementCode.findFirst({ where: { id } });
    if (!row) return "missing" as const;
    if (row.status !== "pending") return "decided" as const;
    await tx.arrangementCode.update({ where: { id }, data: { status, decidedBy: g.session.userId, decidedAt: new Date(), decisionNote: str(b.note, 200) || null } });
    await writeAudit(tx, g.session.userId, "update", "arrangement_code", id, { status: "pending" }, { status, note: str(b.note, 200) });
    return "ok" as const;
  });
  if (out === "missing") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (out === "decided") return NextResponse.json({ error: "이미 결정된 코드입니다" }, { status: 409 });
  return NextResponse.json({ ok: true, status });
}
