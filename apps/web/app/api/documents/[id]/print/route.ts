import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getDocument, getPrintSetup, isPrintDocType } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { renderDocumentHtml, type PrintLayoutUse } from "@/app/lib/output/document";
import { validateElements } from "@/app/lib/print-layout";
import { dxfToSvg } from "@/app/lib/output/dxf-svg";

/**
 * 인쇄본. 저장된 body 만 읽는다 — 여기서 다시 계산하는 숫자는 없다.
 * p48: 회사의 Print Set-up(그 문서 종류의 양식)을 입혀 그린다. 모양만 바뀐다.
 * H9 · 0030: 인쇄 양식(요소 배치)이 있으면 그 배치로 그린다 — 발행된 문서는 발행 순간 박힌 버전, 발행 전은 최신 버전.
 *   도면 요소 = 이 문서와 같은 BOM 스냅샷으로 뜬 최신 도면(저장된 DXF → SVG · 새 계산 없음).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const out = await withTenant(session.tenantId, async (tx) => {
    const row = await getDocument(tx, id);
    if (!row) return null;
    const look = isPrintDocType(row.docType) ? (await getPrintSetup(tx, row.docType)).settings : undefined;
    const pinned = row.printLayoutId ? await tx.printLayout.findFirst({ where: { id: row.printLayoutId } }) : null;
    const lay = pinned ?? (row.status === "issued" ? null : await tx.printLayout.findFirst({ where: { docType: row.docType }, orderBy: { version: "desc" } }));
    let layout: PrintLayoutUse | undefined;
    if (lay) {
      const v = validateElements(lay.elements);
      if (v.ok) {
        const drw = v.elements.some((e) => e.kind === "drawing") ? await tx.drawing.findFirst({ where: { bomRunId: row.bomRunId }, orderBy: { createdAt: "desc" } }) : null;
        layout = { version: lay.version, elements: v.elements, pinned: !!pinned, drawingSvg: drw ? dxfToSvg(drw.dxf).svg : null };
      }
    }
    return { row, look, layout };
  }).catch(() => null);
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(renderDocumentHtml(out.row, out.look, out.layout), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
