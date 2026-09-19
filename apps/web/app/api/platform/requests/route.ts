import { NextResponse, type NextRequest } from "next/server";
import { listPlatformRequests, decidePlatformRequest } from "@edim/db";
import { getPlatformSession } from "@/app/lib/platform-session";

/**
 * 플랫폼 요청 대기열. GET = 목록 · POST = 결정(승인/반려).
 * 테넌트 세션으로는 절대 열리지 않는다 — 플랫폼 세션만 통과한다(401).
 * 결정은 edim_platform 역할로 나가고, 그 역할은 state·decided_* 컬럼에만
 * UPDATE 권한이 있다.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const session = await getPlatformSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const state = req.nextUrl.searchParams.get("state") ?? undefined;
  const rows = await listPlatformRequests(
    state && ["requested", "approved", "rejected"].includes(state)
      ? state
      : undefined,
  );
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getPlatformSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : "";
  const state = b.state === "approved" || b.state === "rejected" ? b.state : null;
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 500) : "";
  if (!UUID.test(id) || !state)
    return NextResponse.json(
      { error: "id · state(approved|rejected) 필수" },
      { status: 400 },
    );

  const n = await decidePlatformRequest({
    id,
    state,
    decidedBy: session.userId,
    note,
  });
  if (n === 0)
    return NextResponse.json(
      { error: "이미 결정된 요청이거나 존재하지 않습니다" },
      { status: 409 },
    );
  return NextResponse.json({ ok: true, state });
}
