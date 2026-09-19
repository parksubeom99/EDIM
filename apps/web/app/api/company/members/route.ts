import { NextResponse, type NextRequest } from "next/server";
import { withTenant, listMembers, setMemberRole, LastOwnerError } from "@edim/db";
import { isRole } from "@edim/core-ontology";
import { getServerSession } from "@/app/lib/session";

/**
 * p54 "2. User Management" — 회사 관리자(owner)가 하부 사용자의 역할을 바꾼다.
 * GET 은 로그인한 사람 누구나(자기 회사 구성원 목록), PATCH 는 owner 전용.
 * 마지막 owner 강등은 DB 도메인 규칙이 거부한다(409).
 */
export async function GET() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await withTenant(session.tenantId, (tx) => listMembers(tx));
  return NextResponse.json({ rows, me: session.userId, myRole: session.role });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "owner")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = typeof b.userId === "string" ? b.userId : "";
  const role = typeof b.role === "string" ? b.role : "";
  if (!userId || !isRole(role))
    return NextResponse.json({ error: "userId · role 필수" }, { status: 400 });

  try {
    const row = await withTenant(session.tenantId, (tx) =>
      setMemberRole(tx, { userId, role, actorId: session.userId }),
    );
    return NextResponse.json({ ok: true, role: row.role });
  } catch (e) {
    if (e instanceof LastOwnerError)
      return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: "변경 실패" }, { status: 409 });
  }
}
