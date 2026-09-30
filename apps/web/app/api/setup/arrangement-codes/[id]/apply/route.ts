import { NextResponse, NextRequest } from "next/server";
import { withTenant } from "@edim/db";
import { guard, UUID } from "../../../_guard";
import { POST as saveArrangement } from "../../../arrangement/route";

/**
 * 승인된 Arrangement Code 를 그 제품 코드에 적용한다. 새 저장 로직을 만들지 않고 기존 Arrangement 저장(POST /api/setup/arrangement)을
 * 그대로 부른다 — 구획 이름 중복 · BOM 관계가 걸린 구획 삭제 금지(409) · 부품은 그 구획의 BOM 자식만 같은 규칙이 여기에도 걸린다.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const row = await withTenant(g.session.tenantId, (tx) => tx.arrangementCode.findFirst({ where: { id } }));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.status !== "approved") return NextResponse.json({ error: `승인된 코드만 적용할 수 있습니다 (지금: ${row.status})` }, { status: 409 });
  // ccmd M · p36 — 구동 방식(install)도 등록된 배치 그대로 옮긴다
  const sections = (row.sections as { name: string; len?: number; dir?: string; install?: string; components?: unknown[] }[]).map((s) => ({
    name: s.name, ...(s.len != null ? { len: s.len } : {}), ...(s.dir ? { dir: s.dir } : {}), ...(s.install ? { install: s.install } : {}), components: s.components ?? [],
  }));
  const inner = new NextRequest(new URL("/api/setup/arrangement", req.url), {
    method: "POST", headers: { "content-type": "application/json", cookie: req.headers.get("cookie") ?? "" },
    body: JSON.stringify({ code: row.productCode, sections }),
  });
  const res = await saveArrangement(inner);
  if (!res.ok) return res;   // 기존 규칙의 거부(400·409)를 그대로 돌려준다
  return NextResponse.json({ ok: true, applied: row.code, productCode: row.productCode });
}
