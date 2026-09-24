import { NextResponse, type NextRequest } from "next/server";
import { withTenantSession } from "@edim/auth";
import { getServerSession } from "@/app/lib/session";
import { getFile } from "@/app/lib/storage";
import { isUuid } from "@/app/lib/project-input";

/** 접수 자료 내려받기 — 행은 RLS 로(다른 테넌트 id 는 404), 파일은 그 테넌트 폴더에서만 읽는다. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const row = await withTenantSession(session, (tx) => tx.projectAttachment.findFirst({ where: { id } }));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const bytes = await getFile(session.tenantId, row.fileRef);
  if (!bytes) return NextResponse.json({ error: "파일 없이 메타데이터만 등록된 자료입니다" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": row.fileMime ?? "application/octet-stream",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    },
  });
}
