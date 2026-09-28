import { NextResponse, type NextRequest } from "next/server";
import { platformListPrograms, platformGrantsWithBilling, listPlatformRequests, decidePlatformRequest, platformGrantSpecial } from "@edim/db";
import { requirePlatform, UUID } from "../learning/_auth";

/** C · 플랫폼 콘솔 'Special' — 프로그램(단가 샘플) · 들어온 Special 의뢰 · 부여와 과금 합계. POST = 의뢰 승인 + 부여(한 번에). */
export async function GET() {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const [programs, grants, requests] = await Promise.all([platformListPrograms(), platformGrantsWithBilling(), listPlatformRequests()]);
  return NextResponse.json({ programs, grants, requests: requests.filter((r) => r.kind === "special") });
}

export async function POST(req: NextRequest) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const b = (await req.json().catch(() => ({}))) as { requestId?: unknown; programKey?: unknown; note?: unknown };
  const requestId = typeof b.requestId === "string" && UUID.test(b.requestId) ? b.requestId : null;
  const programKey = typeof b.programKey === "string" ? b.programKey : "fan-select";
  if (!requestId) return NextResponse.json({ error: "requestId 필요" }, { status: 400 });
  const r = (await listPlatformRequests()).find((x) => x.id === requestId);
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (r.kind !== "special") return NextResponse.json({ error: "Special 의뢰가 아닙니다" }, { status: 409 });
  if (r.state === "requested") await decidePlatformRequest({ id: requestId, state: "approved", decidedBy: a.userId, note: typeof b.note === "string" ? b.note.slice(0, 200) : `Special ${programKey} 부여` });
  else if (r.state !== "approved") return NextResponse.json({ error: "반려된 의뢰입니다" }, { status: 409 });
  try {
    const gid = await platformGrantSpecial(requestId, programKey, a.userId);
    return NextResponse.json({ ok: true, grantId: gid });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).split("\n").slice(-1)[0]!;
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: /not active|not found/.test(msg) ? 404 : 409 });
  }
}
