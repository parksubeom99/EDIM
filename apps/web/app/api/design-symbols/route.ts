import { NextResponse } from "next/server";
import { withTenant } from "@edim/db";
import { getServerSession } from "@/app/lib/session";

/**
 * ccmd K · KC-3 · p58 설계 심볼 라이브러리 — GET → { rows }(모든 역할 · 읽기만). 그 회사의 심볼만(RLS).
 * 라이브러리는 시드가 넣는다(샘플 5종 · is_sample) — 앱 역할은 이 표에 SELECT 권한만 있다(0036).
 */
export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await withTenant(s.tenantId, (tx) => tx.designSymbol.findMany({ orderBy: { key: "asc" } }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, key: r.key, name: r.name, primitives: r.primitives, isSample: r.isSample })) });
}
