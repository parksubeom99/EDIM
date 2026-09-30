import { NextResponse } from "next/server";
import { sessionOr401 } from "../_util";
import { capacityFor } from "@/app/lib/mes-run";

/** ccmd L · LA3 · p44-3 — Capacity: 작업장별 · 날짜별 부하(지시된 단계 시간 × 수량 × 인원) vs 가용 시간 → 초과 표시 */
export async function GET() {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  return NextResponse.json(await capacityFor(a.s.tenantId));
}
