import { NextResponse } from "next/server";
import { withTenant } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { buildCodingList } from "@/app/lib/coding-list";

/**
 * H7 · p47 Coding List — GET → { rows } : 노드마다 승인 매크로(개정 · 원문 · 승인 검증 여부) · 초안/반려/밀려난 수 · 마지막 BOM 스냅샷의 매크로 개정.
 * 읽기 전용(모든 역할). 이 회사 노드만(RLS). 매크로를 만들고 승인하는 곳은 그대로 작업대 Macro 탭 한 곳이다.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await withTenant(session.tenantId, async (tx) => {
    const nodes = await tx.hierarchyNode.findMany({ where: { isCurrent: true }, select: { stableId: true, parentStable: true, kind: true, label: true, position: true } });
    const macros = await tx.macroRegistry.findMany({ select: { id: true, stableId: true, status: true, revision: true, dsl: true, approvedAt: true, verifiedAtApproval: true } });
    const runs = await tx.bomCodeRun.findMany({ where: { hierarchyStable: { not: null } }, orderBy: { createdAt: "desc" }, distinct: ["hierarchyStable"], select: { hierarchyStable: true, macroRevision: true, createdAt: true } });
    return buildCodingList(nodes, macros, runs.map((r) => ({ stableId: r.hierarchyStable, macroRevision: r.macroRevision, createdAt: r.createdAt })));
  });
  return NextResponse.json({ rows });
}
