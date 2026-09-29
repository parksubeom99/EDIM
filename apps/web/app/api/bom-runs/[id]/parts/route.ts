import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getBomRun, getDrawing } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { resolveNotes } from "@/app/lib/drawing-template";
import { partInfoOf, type PartSnapLine } from "@/app/lib/part-info";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ccmd K · KC-4 · p28 · p38 — 조립도 Item 표 · 풍선번호 더블클릭 = 부품의 정보(스냅샷 기준).
 * GET ?drawing=<도면 id>(선택) → { items: [...] } — 코드 · 사양 · 수량 · 공급처(스냅샷에 박힌 값) · 단가 출처(그때 단가 이력 행)
 *   · 코드에 첨부한 DWG(p28 Sub Item DWG) · 조립순서(분해도 순서 = 구획 순서) · 주의사항(도면에 박힌 목록, 도면 없으면 지금 템플릿) · 세부 치수(KC-1).
 * 단가를 나중에 바꿔도 패널은 스냅샷 값이다(단가 출처는 그때 행 id 로 찾는다). viewer 403(단가가 들어 있다) · 다른 회사 404.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const dq = req.nextUrl.searchParams.get("drawing");
  if (dq !== null && !UUID.test(dq)) return NextResponse.json({ error: "drawing id 형식이 아닙니다" }, { status: 400 });
  const out = await withTenant(s.tenantId, async (tx) => {
    const run = await getBomRun(tx, id);
    if (!run) return null;
    const lines = (Array.isArray(run.lines) ? run.lines : []) as PartSnapLine[];
    const codes = [...new Set(lines.map((l) => (typeof l.childCode === "string" ? l.childCode : "")).filter(Boolean))];
    const priceIds = [...new Set(lines.map((l) => l.priceSource?.priceId).filter((x): x is string => typeof x === "string"))];
    const [prices, att, drawing, tpl] = await Promise.all([
      priceIds.length ? tx.priceHistory.findMany({ where: { id: { in: priceIds } } }) : Promise.resolve([]),
      codes.length ? tx.attachment.findMany({ where: { ownerKind: "product_code", ownerKey: { in: codes } } }) : Promise.resolve([]),
      dq ? getDrawing(tx, dq) : Promise.resolve(null),
      tx.drawingTemplateItem.findMany({ where: { productCode: run.parentCode } }),
    ]);
    if (dq && (!drawing || drawing.bomRunId !== run.id)) return { badDrawing: true as const };
    return { run, lines, prices, att, drawing, tpl };
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ("badDrawing" in out) return NextResponse.json({ error: "그 도면은 이 BOM 스냅샷에서 뜬 도면이 아닙니다" }, { status: 404 });
  const { run, lines, prices, att, drawing, tpl } = out;
  const meta = (drawing?.meta ?? null) as { notes?: unknown } | null;
  const notes = drawing && Array.isArray(meta?.notes)
    ? { list: (meta!.notes as unknown[]).map(String), source: "drawing" as const }
    : { list: resolveNotes(tpl), source: "template" as const };
  const items = partInfoOf({
    lines,
    dims: (run.dims ?? null) as Record<string, unknown> | null,
    prices: prices.map((p) => ({ id: p.id, code: p.code, item: p.item, price: Number(p.price), currency: p.currency, supplier: p.supplier, effectiveFrom: p.effectiveFrom })),
    attachments: att.map((a) => ({ id: a.id, ownerKey: a.ownerKey, name: a.name, kind: a.kind, uploadedAt: a.uploadedAt })),
    notes: notes.list,
  });
  return NextResponse.json({ runId: run.id, code: run.code, drawingId: drawing?.id ?? null, notesSource: notes.source, items });
}
