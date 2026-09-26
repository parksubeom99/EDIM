import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { createProject, updateProject } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { ownerOk, projectType, txt } from "@/app/lib/project-input";
import { partnerOk } from "@/app/lib/partner";

/**
 * p12·p50 Project Management — 목록(GET)과 등록(POST, Registration Process).
 * 등록은 트리 노드와 프로젝트 행을 함께 만든다(createProject) — 새 프로젝트가 Work Hierarchy 에 바로 뜬다.
 * 노드는 기존 프로젝트들과 같은 부모 아래에 붙는다(없으면 루트).
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await withTenantSession(session, (tx) =>
    tx.project.findMany({ orderBy: { createdAt: "asc" }, include: { owner: { select: { email: true, name: true } } } }),
  );
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const projectNo = txt(b.projectNo, 40), name = txt(b.name, 120), type = projectType(b.type ?? "client");
  if (!projectNo || !name) return NextResponse.json({ error: "Project No · Name 필수" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "Project Type 은 client · internal" }, { status: 400 });
  const out = await withTenantSession(session, async (tx) => {
    if (await tx.project.findFirst({ where: { projectNo } })) return { dup: true as const };
    const owner = await ownerOk(tx, b.ownerId);
    if (owner === false) return { badOwner: true as const };
    // 0021 · 고객을 목록에서 고르면 id 와 글자(client_name)를 함께 채운다
    const client = await partnerOk(tx, b.clientId, "customer");
    if (client === false) return { badClient: true as const };
    const sibling = await tx.hierarchyNode.findFirst({ where: { kind: "project", isCurrent: true }, orderBy: { createdAt: "asc" } });
    const made = await createProject(tx, {
      parentStable: sibling?.parentStable ?? null, projectNo, name, type,
      clientName: txt(b.clientName, 120) ?? client?.name ?? null, clientContact: txt(b.clientContact, 200) ?? null,
      clientId: client?.id ?? null,
      itemType: txt(b.itemType, 40) ?? null, createdBy: session.userId,
    });
    const extra = { ownerId: owner ?? undefined, remarks: txt(b.remarks, 500) ?? undefined, description: txt(b.description, 2000) ?? undefined };
    if (Object.values(extra).some((v) => v !== undefined)) await updateProject(tx, made.id, extra, session.userId);
    return made;
  });
  if ("dup" in out) return NextResponse.json({ error: `이미 있는 Project No: ${projectNo}` }, { status: 409 });
  if ("badOwner" in out) return NextResponse.json({ error: "담당자는 이 회사 구성원이어야 합니다" }, { status: 400 });
  if ("badClient" in out) return NextResponse.json({ error: "고객은 Company DB 의 이 회사 고객이어야 합니다" }, { status: 400 });
  return NextResponse.json({ ok: true, ...out });
}
