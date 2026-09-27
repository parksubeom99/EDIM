import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@edim/db";
import { getFile } from "@/app/lib/storage";
import { guard, UUID } from "../../../setup/_guard";

/** 첨부 내려받기 — 행은 RLS 로(다른 회사 id 는 404), 파일은 그 회사 폴더에서만 읽는다(0014 와 같은 저장소). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const row = await withTenant(g.session.tenantId, (tx) => tx.attachment.findFirst({ where: { id } }));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const bytes = await getFile(g.session.tenantId, row.fileRef);
  if (!bytes) return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": row.fileMime ?? "application/octet-stream", "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}` },
  });
}
