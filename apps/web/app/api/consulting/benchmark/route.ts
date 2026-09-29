import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canUseConsulting, benchmark } from "@/app/lib/consulting-run";

/**
 * ccmd K · KB-2 — 컨설팅 트랙 2 "업계 안 우리 위치"(익명 · 집계). GET → { rows: [{ metric, n, p25, p50, p75, mine, percentile, suppressed }] }.
 * DB 함수 benchmark_metrics 가 **집계 숫자만** 준다 — 다른 회사 id · 이름 · 행 값은 이 응답에 없다. 표본 3곳 미만이면 분포를 숨긴다.
 * 부르는 회사 = 세션의 회사(인자로 바꿀 수 없다) · owner · engineer 만(viewer 403).
 */
export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseConsulting(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ rows: await benchmark(s.tenantId), kMin: 3, sample: "표본에 샘플 회사 값이 들어 있습니다" });
}
