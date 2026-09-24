import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { getProject, updateProject, type UpdateProjectPatch } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { isUuid, ownerOk, projectType, txt } from "@/app/lib/project-input";

/**
 * p12 헤더 수정 — Project Type · Client · Client 담당자 정보 · 담당자 · Item · Remarks · Description · Name.
 * 보낸 필드만 바꾼다(빈 문자열 = 비움). 영업 단계는 따로 /stage 에서(기존 규칙 그대로). 감사 로그는 DB 함수가 남긴다.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const type = projectType(b.type);
  if (type === false) return NextResponse.json({ error: "Project Type 은 client · internal" }, { status: 400 });
  const name = txt(b.name, 120);
  if (name === null) return NextResponse.json({ error: "Name 은 비울 수 없습니다" }, { status: 400 });
  const out = await withTenantSession(session, async (tx) => {
    if (!(await getProject(tx, id))) return "missing" as const;
    const owner = await ownerOk(tx, b.ownerId);
    if (owner === false) return "badOwner" as const;
    const patch: UpdateProjectPatch = {
      ...(name !== undefined ? { name } : {}), ...(type ? { type } : {}),
      ...(b.clientName !== undefined ? { clientName: txt(b.clientName, 120) ?? null } : {}),
      ...(b.clientContact !== undefined ? { clientContact: txt(b.clientContact, 200) ?? null } : {}),
      ...(b.itemType !== undefined ? { itemType: txt(b.itemType, 40) ?? null } : {}),
      ...(owner !== undefined ? { ownerId: owner } : {}),
      ...(b.remarks !== undefined ? { remarks: txt(b.remarks, 500) ?? null } : {}),
      ...(b.description !== undefined ? { description: txt(b.description, 2000) ?? null } : {}),
    };
    await updateProject(tx, id, patch, session.userId);
    return "ok" as const;
  });
  if (out === "missing") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (out === "badOwner") return NextResponse.json({ error: "담당자는 이 회사 구성원이어야 합니다" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
