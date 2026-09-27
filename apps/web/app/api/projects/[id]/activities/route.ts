import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { isUuid } from "@/app/lib/project-input";
import { activityInput } from "@/app/lib/project-contact";
import { dateOnly } from "@/app/lib/today";

/**
 * p12 · p50 — 영업 활동 이력(0023). GET 목록(최근 먼저) · POST 추가. **쌓기만** — 수정·삭제 API 는 없고(405),
 * DB 도 앱 역할의 UPDATE/DELETE 권한을 뺐다.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenantSession(session, async (tx) => {
    if (!(await tx.project.findFirst({ where: { id } }))) return null;
    return tx.projectActivity.findMany({ where: { projectId: id }, orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }] });
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ rows: out.map((a) => ({ id: a.id, date: dateOnly(a.activityDate), kind: a.kind, content: a.content, createdAt: a.createdAt })) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const v = activityInput((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const out = await withTenantSession(session, async (tx) => {
    const p = await tx.project.findFirst({ where: { id } });
    if (!p) return null;
    const a = await tx.projectActivity.create({ data: { tenantId: p.tenantId, projectId: id, activityDate: new Date(v.date + "T00:00:00Z"), kind: v.kind, content: v.content, createdBy: session.userId } });
    return a.id;
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: out });
}

const noEdit = () => NextResponse.json({ error: "영업 활동 이력은 쌓기만 합니다 — 수정·삭제 없음" }, { status: 405 });
export const PATCH = noEdit;
export const DELETE = noEdit;
