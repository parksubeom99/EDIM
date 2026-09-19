import { NextResponse, type NextRequest } from "next/server";
import {
  withTenant,
  createPlatformRequest,
  listPlatformRequestsForTenant,
} from "@edim/db";
import { getServerSession } from "@/app/lib/session";

/**
 * 회사 → 플랫폼 요청 통로(회사 쪽). GET = 자기 테넌트 요청 목록 · POST = 제출.
 * Q1 = 좁게(회장님 결정): 올라가는 것은 Special 의뢰/문의뿐이다. 회사가 자기
 * 코드·표·Macro 를 고치는 일은 여기로 올라오지 않는다.
 * 제출은 회사 관리자(owner)만 — 서버에서 막는다(버튼 숨김이 아니라).
 */
export async function GET() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await withTenant(session.tenantId, (tx) =>
    listPlatformRequestsForTenant(tx),
  );
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "owner")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = b.kind === "question" ? "question" : "special";
  const subject =
    typeof b.subject === "string" ? b.subject.trim().slice(0, 200) : "";
  const detail =
    typeof b.detail === "string" ? b.detail.trim().slice(0, 2000) : "";
  if (!subject)
    return NextResponse.json({ error: "subject 필수" }, { status: 400 });

  const row = await withTenant(session.tenantId, (tx) =>
    createPlatformRequest(tx, {
      kind,
      subject,
      payload: { detail },
      requestedBy: session.userId,
    }),
  );
  return NextResponse.json({ ok: true, id: row.id, state: row.state });
}
