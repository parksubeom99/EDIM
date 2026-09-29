import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canUseConsulting, internalReport } from "@/app/lib/consulting-run";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ccmd K · KB-1 — 컨설팅 트랙 1 "내부 최적안". GET ?runId=(없으면 최신 BOM 스냅샷) → { proposals, totals, … }.
 * 읽기 전용(적용 없음) · 회사 owner · engineer 만(viewer · cad · sales 403) · 다른 회사 스냅샷 404(RLS).
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseConsulting(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("runId");
  if (q !== null && !UUID.test(q)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const rep = await internalReport(s.tenantId, q);
  if (!rep) return NextResponse.json({ error: "BOM 스냅샷을 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json(rep);
}
