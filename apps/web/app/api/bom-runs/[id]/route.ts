import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getBomRun, specialRunsForBomRun } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ccmd K — BOM 스냅샷 한 장을 **저장된 그대로** 읽는다(다시 계산하지 않는다).
 *   dims(치수 · 구획 · 검증 판정 · special 선정 결과) · 줄 · 원가 합계 · 이 스냅샷에서 나온 Special 사용 기록(과금).
 * viewer 403(편집 역할만 — 사용 기록 금액이 들어 있다) · 다른 회사 스냅샷은 RLS 로 404.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenant(s.tenantId, async (tx) => {
    const run = await getBomRun(tx, id);
    if (!run) return null;
    return { run, specialRuns: await specialRunsForBomRun(tx, id) };
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { run, specialRuns } = out;
  const dims = (run.dims ?? null) as Record<string, unknown> | null;
  const cost = run.cost as { total?: number; material?: number } | null;
  return NextResponse.json({
    id: run.id, code: run.code, parentCode: run.parentCode, catalogFp: run.catalogFp, createdAt: run.createdAt,
    dims, special: dims && "special" in dims ? dims.special : null,
    lines: Array.isArray(run.lines) ? run.lines : [], costTotal: cost?.total ?? null, material: cost?.material ?? null,
    specialRuns,
  });
}
