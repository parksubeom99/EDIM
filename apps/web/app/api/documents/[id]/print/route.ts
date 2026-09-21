import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getDocument } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { renderDocumentHtml } from "@/app/lib/output/document";

/** 인쇄본(흰 A4). 저장된 body 만 읽는다 — 여기서 다시 계산하는 숫자는 없다. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await withTenant(session.tenantId, (tx) => getDocument(tx, id)).catch(() => null);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(renderDocumentHtml(row), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
