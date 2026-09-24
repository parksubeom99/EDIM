import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { addAttachment, getProject, listAttachments } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { MAX_UPLOAD_BYTES, putFile } from "@/app/lib/storage";
import { isUuid } from "@/app/lib/project-input";

/**
 * p12·p50 접수 자료 등록(File) · Data Up-Load(Department · Type · Name · Description).
 * GET ?projectId= → 목록. POST 는 두 형식:
 *   multipart/form-data (0014) — 실제 파일. 10MB 초과 413, 프로젝트가 이 테넌트에 없으면 404.
 *   application/json (예전 형식) — 메타데이터만(file_ref '(pending)'). 기존 호출 보존.
 */
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId") ?? "";
  if (!isUuid(projectId)) return NextResponse.json({ error: "projectId 필수" }, { status: 400 });
  const rows = await withTenantSession(session, (tx) => listAttachments(tx, projectId));
  return NextResponse.json({
    rows: rows.map((a) => ({ id: a.id, department: a.department, docType: a.docType, name: a.name, description: a.description,
      hasFile: a.fileRef.startsWith("local:"), fileMime: a.fileMime, fileSize: a.fileSize, uploadedAt: a.uploadedAt })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return NextResponse.json({ error: "형식 오류" }, { status: 400 });
    const file = fd.get("file");
    const projectId = str(fd.get("projectId"), 36);
    const department = str(fd.get("department"), 40);
    const docType = str(fd.get("docType"), 20);
    if (!isUuid(projectId) || !department || !docType || !(file instanceof File) || file.size === 0)
      return NextResponse.json({ error: "projectId · department · docType · file 필수" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "10MB 를 넘는 파일은 받지 않습니다" }, { status: 413 });
    const name = str(fd.get("name"), 120) ?? file.name.slice(0, 120);
    const bytes = Buffer.from(await file.arrayBuffer());
    const out = await withTenantSession(session, async (tx) => {
      if (!(await getProject(tx, projectId))) return null;       // RLS: 다른 테넌트 프로젝트는 안 보인다
      const fileRef = await putFile(session.tenantId, randomUUID(), bytes);
      return addAttachment(tx, { projectId, department, docType, name, description: str(fd.get("description"), 500),
        fileRef, fileMime: (file.type || "application/octet-stream").slice(0, 100), fileSize: file.size, uploadedBy: session.userId });
    });
    if (!out) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    return NextResponse.json({ ok: true, id: out });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = b.projectId, department = b.department, docType = b.docType, name = b.name;
  if (typeof projectId !== "string" || typeof department !== "string" || typeof docType !== "string" || typeof name !== "string")
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  await withTenantSession(session, (tx) =>
    addAttachment(tx, { projectId, department, docType, name,
      description: typeof b.description === "string" ? b.description : null,
      fileRef: typeof b.fileRef === "string" && !b.fileRef.startsWith("local:") ? b.fileRef : "(pending)",
      uploadedBy: session.userId }),
  );
  return NextResponse.json({ ok: true });
}
