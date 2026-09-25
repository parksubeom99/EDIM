import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getDocument, getPrintSetup, isPrintDocType } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { renderDocumentHtml } from "@/app/lib/output/document";

/**
 * 인쇄본. 저장된 body 만 읽는다 — 여기서 다시 계산하는 숫자는 없다.
 * p48: 회사의 Print Set-up(그 문서 종류의 양식)을 입혀 그린다. 모양만 바뀐다.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const out = await withTenant(session.tenantId, async (tx) => {
    const row = await getDocument(tx, id);
    if (!row) return null;
    const look = isPrintDocType(row.docType) ? (await getPrintSetup(tx, row.docType)).settings : undefined;
    return { row, look };
  }).catch(() => null);
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(renderDocumentHtml(out.row, out.look), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
