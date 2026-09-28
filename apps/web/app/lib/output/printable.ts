import { withTenant, getDocument, getPrintSetup, isPrintDocType } from "@edim/db";
import type { PrintLayoutUse, PrintLook } from "./document";
import { validateElements } from "../print-layout";
import { dxfToSvg } from "./dxf-svg";

/**
 * 인쇄본 · Office 내보내기가 같이 쓰는 읽기 — 문서 행(스냅샷 body) + Print Set-up 모양 + 인쇄 양식.
 * 양식: 발행된 문서는 발행 순간 박힌 버전, 발행 전은 최신 버전(H9 · 0030). 없으면 null(=404).
 */
export async function loadPrintable(tenantId: string, id: string, opts: { drawing?: boolean } = {}) {
  return withTenant(tenantId, async (tx) => {
    const row = await getDocument(tx, id);
    if (!row) return null;
    const look: PrintLook | undefined = isPrintDocType(row.docType) ? (await getPrintSetup(tx, row.docType)).settings : undefined;
    const pinned = row.printLayoutId ? await tx.printLayout.findFirst({ where: { id: row.printLayoutId } }) : null;
    const lay = pinned ?? (row.status === "issued" ? null : await tx.printLayout.findFirst({ where: { docType: row.docType }, orderBy: { version: "desc" } }));
    let layout: PrintLayoutUse | undefined;
    if (lay) {
      const v = validateElements(lay.elements);
      if (v.ok) {
        const drw = opts.drawing !== false && v.elements.some((e) => e.kind === "drawing") ? await tx.drawing.findFirst({ where: { bomRunId: row.bomRunId }, orderBy: { createdAt: "desc" } }) : null;
        layout = { version: lay.version, elements: v.elements, pinned: !!pinned, drawingSvg: drw ? dxfToSvg(drw.dxf).svg : null };
      }
    }
    return { row, look, layout };
  }).catch(() => null);
}
