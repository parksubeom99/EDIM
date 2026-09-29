import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canUseConsulting, internalReport, benchmark } from "@/app/lib/consulting-run";
import { consultingHtml } from "@/app/lib/consulting-print";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ccmd K · KB-1 — 컨설팅 제안서 인쇄본(A4 · 기존 인쇄본 방식 = HTML → 브라우저 인쇄/PDF). 발치에 스냅샷 id · 분석 날짜 · "샘플 단가 · 샘플 운전시간".
 * 읽기 전용 · owner · engineer 만 · 다른 회사 스냅샷 404.
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseConsulting(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("runId");
  if (q !== null && !UUID.test(q)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const rep = await internalReport(s.tenantId, q);
  if (!rep) return NextResponse.json({ error: "BOM 스냅샷을 찾을 수 없습니다" }, { status: 404 });
  return new NextResponse(consultingHtml(rep, await benchmark(s.tenantId)), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
