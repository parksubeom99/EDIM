import { NextResponse, type NextRequest } from "next/server";
import { withTenant, saveDrawing, listDrawings, isDrawingPurpose } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { dxfSourceFromRun } from "@/app/lib/output/drawing-source";
import { buildView, isDrawingView } from "@/app/lib/output/dxf";
import { resolveSubDrawings, resolveNotes, type DwgLike } from "@/app/lib/drawing-template";

/**
 * GET = 도면 목록(?purpose=approval|manufacturing|quotation|none 으로 거른다) · POST = BOM 스냅샷에서 도면을 떠서 남긴다(p24).
 * 0020 · 용도(purpose): 승인도·제작도·견적도. 용도가 있으면 도면번호 끝에 붙여(-APV·-MFG·-QTN) 같은 뷰라도 용도별로 번호·개정이 따로 간다.
 */
const PURPOSE_NO: Record<string, string> = { approval: "APV", manufacturing: "MFG", quotation: "QTN" };
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const node = req.nextUrl.searchParams.get("node");
  const pq = req.nextUrl.searchParams.get("purpose");
  if (pq && pq !== "none" && !isDrawingPurpose(pq)) return NextResponse.json({ error: `도면 용도가 아닙니다: ${pq}` }, { status: 400 });
  const purpose = pq === "none" ? "none" : isDrawingPurpose(pq) ? pq : null;
  const rows = await withTenant(session.tenantId, (tx) => listDrawings(tx, node, purpose));
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const runId = typeof b.runId === "string" ? b.runId : "";
  // 3각법(0012): plan=Top · front · right · assembly. 모르는 값은 평면으로 떨어뜨리지 않고 400 으로 막는다.
  if (b.type !== undefined && !isDrawingView(b.type))
    return NextResponse.json({ error: `도면 종류가 아닙니다: ${String(b.type)}` }, { status: 400 });
  const type = isDrawingView(b.type) ? b.type : "plan";
  if (b.purpose !== undefined && b.purpose !== null && b.purpose !== "" && !isDrawingPurpose(b.purpose))
    return NextResponse.json({ error: `도면 용도가 아닙니다: ${String(b.purpose)} (approval|manufacturing|quotation)` }, { status: 400 });
  const purpose = isDrawingPurpose(b.purpose) ? b.purpose : null;
  if (!runId) return NextResponse.json({ error: "runId 필요" }, { status: 400 });

  const src = await dxfSourceFromRun(session.tenantId, runId);
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });

  const { dxf, meta } = buildView(type, src.input);
  // H5 · p39 · p40 — 제품 도면 템플릿의 하부 도면(Sub Drawing) 호출 · Detail Design 주의사항을 **지금** 풀어 도면 meta 에 박는다.
  // 스냅샷 줄에 있는 하위 코드만 · 설계 우선순위 순 · 각 코드의 등록 DWG(F4) 를 가리킨다. 도면 계산(DXF)은 그대로.
  const tpl = await withTenant(session.tenantId, async (tx) => {
    const items = await tx.drawingTemplateItem.findMany({ where: { productCode: src.run.parentCode } });
    const codes = [...new Set(items.filter((t) => t.kind === "sub" && t.childCode).map((t) => t.childCode!))];
    const att = codes.length ? await tx.attachment.findMany({ where: { ownerKind: "product_code", ownerKey: { in: codes } } }) : [];
    const byCode = new Map<string, DwgLike[]>();
    for (const a of att) byCode.set(a.ownerKey, [...(byCode.get(a.ownerKey) ?? []), { id: a.id, name: a.name, kind: a.kind, uploadedAt: a.uploadedAt }]);
    return { subDrawings: resolveSubDrawings(src.input.items ?? [], items, byCode), notes: resolveNotes(items), templateOf: src.run.parentCode };
  });
  // 도면번호 = 코드 + 종류. 같은 번호를 다시 뜨면 개정(A→B)이 붙는다.
  const NO: Record<string, string> = { plan: "PLN", assembly: "ASM", front: "FRT", right: "RHT", iso: "ISO", exploded: "EXP" };
  const drawingNo = `${src.run.code}-${NO[type]}${purpose ? `-${PURPOSE_NO[purpose]}` : ""}`;
  const row = await withTenant(session.tenantId, (tx) =>
    saveDrawing(tx, {
      stableId: src.run.stableId,
      bomRunId: runId,
      drawingNo,
      drawingType: type,
      purpose,
      code: src.run.code,
      dxf,
      meta: { ...meta, ...tpl } as unknown as object,
      createdBy: session.userId,
    }),
  );
  return NextResponse.json({
    ok: true, id: row.id, drawingNo: row.drawingNo, rev: row.currentRev, status: row.status, purpose: row.purpose,
    meta: { ...meta, ...tpl }, message: `도면 ${row.drawingNo} Rev ${row.currentRev} 생성 · 치수 ${meta.dimItem} (W${meta.widthMm}×L${meta.lengthMm})`,
  });
}
