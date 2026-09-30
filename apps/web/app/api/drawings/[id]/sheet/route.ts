import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getDrawing, qrTokenFor } from "@edim/db";
import { qrSvg, canEditMes } from "@/app/lib/mes-run";
import { getServerSession } from "@/app/lib/session";
import { dxfToSvg } from "@/app/lib/output/dxf-svg";
import type { SubDrawingRow } from "@/app/lib/drawing-template";

/**
 * H5 · p39 · p40 — 도면 시트(인쇄): 저장된 DXF 를 SVG 로(F6 와 같은 변환 · 새 계산 없음) + 뜰 때 박힌 **하부 도면(Sub Drawing) 목록**
 * (Item · Description · Q'ty · Remarks · DWG) + **Detail Design 주의사항**. 모두 drawing 행에 저장된 값만 읽는다 — 템플릿을 고쳐도 이 시트는 그대로.
 * 다른 회사 도면 id 는 RLS 로 안 보인다 → 404.
 */
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await withTenant(session.tenantId, (tx) => getDrawing(tx, id)).catch(() => null);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const meta = (row.meta ?? {}) as { subDrawings?: SubDrawingRow[]; notes?: string[]; templateOf?: string };
  const subs = Array.isArray(meta.subDrawings) ? meta.subDrawings : null;
  const notes = Array.isArray(meta.notes) ? meta.notes : null;
  const { svg } = dxfToSvg(row.dxf);
  // ccmd L · LA7 · p69 — 발행 도면 인쇄본에 QR 칸(/q/{토큰}: 도면 · 서류 · 이력 · 할 일). 토큰은 쓰기 역할만 새로 만든다.
  const qrTok = row.status === "issued"
    ? await withTenant(session.tenantId, (tx) => canEditMes(session.role) ? qrTokenFor(tx, "drawing", id, session.userId) : tx.qrToken.findFirst({ where: { targetKind: "drawing", targetId: id, revokedAt: null } }))
    : null;
  const qrHtml = qrTok ? `<div data-testid="sheet-qr" style="float:right;text-align:center;font-size:9px">${qrSvg(`${req.nextUrl.origin}/q/${qrTok.token}`, 3)}<div>QR — 도면 · 서류 · 이력 · 할 일</div></div>` : "";
  const subHtml = subs === null
    ? `<p class="muted" data-testid="sheet-subs-none">이 도면은 도면 템플릿(0028) 이전에 떠서 하부 도면 목록이 없습니다.</p>`
    : subs.length === 0
      ? `<p class="muted" data-testid="sheet-subs-none">이 제품(${esc(meta.templateOf)}) 도면 템플릿에 하부 도면 호출이 없거나, 이 BOM 에 해당 코드가 없습니다.</p>`
      : `<table data-testid="sheet-subs"><tr><th>#</th><th>Item</th><th>Description</th><th class="n">Q'ty</th><th>Remarks</th><th>우선순위</th><th>DWG</th></tr>${subs.map((s) =>
          `<tr data-code="${esc(s.childCode)}"><td>${s.order}</td><td class="mono">${esc(s.childCode)}</td><td>${esc(s.part)}</td><td class="n">${s.qty} ${esc(s.unit)}</td><td>${esc(s.remarks)}</td><td class="n">${s.priority}</td><td>${s.dwg ? `<a href="/api/attachments/${esc(s.dwg.id)}/file">${esc(s.dwg.name)}</a> <small>${s.dwg.kind === "dwg3d" ? "3D" : "2D"}</small>` : `<span class="muted">DWG 없음</span>`}</td></tr>`).join("")}</table>`;
  const noteHtml = notes && notes.length
    ? `<ol data-testid="sheet-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ol>`
    : `<p class="muted" data-testid="sheet-notes-none">주의사항 없음</p>`;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(row.drawingNo)} Rev ${esc(row.currentRev)} · 도면 시트</title>
<style>
body{font-family:system-ui,"Malgun Gothic",sans-serif;background:#fff;color:#111;margin:24px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px}
.muted{color:#666;font-size:12px}.mono{font-family:ui-monospace,Consolas,monospace}
table{border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:3px 8px;text-align:left}.n{text-align:right}
.sheet{border:1px solid #333;padding:8px;max-width:1100px}.sheet svg{width:100%;height:auto;max-height:560px}
ol{font-size:12px;margin:0;padding-left:20px}
@media print{body{margin:8mm}}
</style></head><body data-testid="drawing-sheet-page">
${qrHtml}<h1>${esc(row.drawingNo)} · Rev ${esc(row.currentRev)}</h1>
<p class="muted">종류 ${esc(row.drawingType)} · 상태 ${esc(row.status)}${row.purpose ? ` · 용도 ${esc(row.purpose)}` : ""} · 코드 <span class="mono">${esc(row.code)}</span> · BOM 스냅샷 <span class="mono">${esc(row.bomRunId)}</span></p>
<div class="sheet" data-testid="sheet-svg">${svg}</div>
<h2>Call Sub Drawing · 하부 도면 (p40)</h2>${subHtml}
<h2>Detail Design · 주의사항</h2>${noteHtml}
<p class="muted">이 시트의 도면·목록·주의사항은 도면을 뜬 순간 저장된 값입니다 — 도면 템플릿을 나중에 고쳐도 바뀌지 않습니다.</p>
</body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
