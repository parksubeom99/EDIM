import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { isUuid } from "@/app/lib/project-input";
import { contactInput } from "@/app/lib/project-contact";

/** p12 Client 담당자 수정(PATCH — isPrimary=true 면 다른 주담당을 푼다) · 삭제(DELETE). 행은 RLS 로 — 다른 회사 id 는 404. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const v = contactInput((await req.json().catch(() => ({}))) as Record<string, unknown>, false);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const ok = await withTenantSession(session, async (tx) => {
    const c = await tx.projectContact.findFirst({ where: { id } });
    if (!c) return false;
    if (v.isPrimary) await tx.projectContact.updateMany({ where: { projectId: c.projectId, isPrimary: true, NOT: { id } }, data: { isPrimary: false } });
    await tx.projectContact.update({ where: { id }, data: v });
    return true;
  });
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const n = await withTenantSession(session, (tx) => tx.projectContact.deleteMany({ where: { id } }));
  if (n.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
