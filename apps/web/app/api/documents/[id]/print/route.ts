import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { renderDocumentHtml } from "@/app/lib/output/document";
import { loadPrintable } from "@/app/lib/output/printable";

/**
 * 인쇄본. 저장된 body 만 읽는다 — 여기서 다시 계산하는 숫자는 없다.
 * p48: 회사의 Print Set-up(그 문서 종류의 양식)을 입혀 그린다. 모양만 바뀐다.
 * H9 · 0030: 인쇄 양식(요소 배치)이 있으면 그 배치로 그린다 — 발행된 문서는 발행 순간 박힌 버전, 발행 전은 최신 버전.
 *   도면 요소 = 이 문서와 같은 BOM 스냅샷으로 뜬 최신 도면(저장된 DXF → SVG · 새 계산 없음).
 * E7 · p48: 상단 "Word · Excel" 은 같은 body 를 .docx · .xlsx 로 내려받는다(/export).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const out = await loadPrintable(session.tenantId, id);
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(renderDocumentHtml(out.row, out.look, out.layout, session.role !== "viewer" ? { exportId: id } : undefined), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
