import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { isUuid } from "@/app/lib/project-input";
import { contactInput } from "@/app/lib/project-contact";

/**
 * p12 · p50 — Client 담당자 여러 명(0023). GET 목록(주담당 먼저) · POST 추가.
 * isPrimary=true 로 추가하면 기존 주담당은 풀린다(프로젝트당 주담당 1명 — DB 부분 unique 가 한 번 더 막는다).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenantSession(session, async (tx) => {
    if (!(await tx.project.findFirst({ where: { id } }))) return null;
    return tx.projectContact.findMany({ where: { projectId: id }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] });
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ rows: out.map((c) => ({ id: c.id, name: c.name, department: c.department, contact: c.contact, isPrimary: c.isPrimary })) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const v = contactInput((await req.json().catch(() => ({}))) as Record<string, unknown>, true);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const out = await withTenantSession(session, async (tx) => {
    const p = await tx.project.findFirst({ where: { id } });
    if (!p) return null;
    const first = (await tx.projectContact.count({ where: { projectId: id } })) === 0;
    const isPrimary = v.isPrimary ?? first;   // 첫 담당자는 주담당
    if (isPrimary) await tx.projectContact.updateMany({ where: { projectId: id, isPrimary: true }, data: { isPrimary: false } });
    const c = await tx.projectContact.create({ data: { tenantId: p.tenantId, projectId: id, name: v.name!, department: v.department ?? "", contact: v.contact ?? "", isPrimary, createdBy: session.userId } });
    return c.id;
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: out });
}
