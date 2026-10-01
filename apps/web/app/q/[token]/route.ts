import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { qrPage, esc } from "@/app/lib/mes-run";

/**
 * ccmd L · LA7 · p69 — QR 을 찍으면 오는 곳. 로그인 없으면 로그인 → 돌아옴 · 다른 회사 404(RLS 로 토큰이 안 보인다) · 폐기 410.
 * 보여 주는 것 = p69 "QR Code 정보" 5가지: 도면(발행본) · 각종 서류 · Project History · Project 정보 · 처리해야 할 업무. 폭 390 우선.
 */
const page = (status: number, title: string, body: string) =>
  new NextResponse(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:system-ui,"Noto Sans KR",sans-serif;margin:0;padding:12px;max-width:560px;color:#111;font-size:14px}h1{font-size:18px;margin:4px 0 10px}h2{font-size:14px;margin:14px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}ul{margin:0;padding-left:18px}li{margin:3px 0}.muted{color:#5B6675;font-size:12px}a{color:#0f766e}</style></head>
<body>${body}</body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return page(404, "없음", `<h1 data-testid="qr-404">404 — 이 QR 은 없습니다</h1>`);
  const s = await getServerSession();
  // 상대 Location — 운영 킷(HOSTNAME=0.0.0.0)에서 절대 주소를 만들면 http://0.0.0.0:3000 으로 보내 버린다(ccmd N 킷 e2e 실측)
  if (!s) return new NextResponse(null, { status: 307, headers: { location: `/login?next=${encodeURIComponent(`/q/${token}`)}` } });
  const d = await qrPage(s.tenantId, token);
  if (d.status === 404) return page(404, "없음", `<h1 data-testid="qr-404">404 — 이 QR 은 없거나 이 회사 것이 아닙니다</h1>`);
  if (d.status === 410) return page(410, "폐기됨", `<h1 data-testid="qr-410">410 — 폐기된 QR 입니다</h1><p class="muted">새로 인쇄한 QR 을 쓰십시오.</p>`);
  const p = d.project;
  const li = (xs: string[], empty: string) => (xs.length ? `<ul>${xs.join("")}</ul>` : `<p class="muted">${esc(empty)}</p>`);
  const body = `<div data-testid="qr-page" data-kind="${esc(d.kind)}">
<p class="muted">QR · ${esc(d.kind === "project" ? "프로젝트" : d.kind === "work_order" ? "작업지시" : "도면")}${d.wo ? ` · ${esc(d.wo.woNo)}` : ""}</p>
<h1>${p ? `${esc(p.projectNo)} · ${esc(p.name)}` : "프로젝트 정보 없음"}</h1>
<h2>Project 정보</h2><div data-testid="qr-project">${p ? `고객 ${esc(p.clientName ?? "—")} · 영업 단계 ${esc(p.salesStage)} · 수량 ${p.qty} · 납기 ${esc(p.due ?? "—")}` : "—"}</div>
<h2>도면(발행본)</h2><div data-testid="qr-drawings">${li(d.drawings.map((x) => `<li><a href="/api/drawings/${esc(x.id)}/sheet">${esc(x.drawingNo)} Rev ${esc(x.currentRev)}</a> · ${esc(x.drawingType)}</li>`), "발행된 도면 없음")}</div>
<h2>각종 서류</h2><div data-testid="qr-docs">${li(d.docs.map((x) => `<li><a href="/api/documents/${esc(x.id)}/print">${esc(x.docNo)} Rev ${esc(x.rev)}</a> · ${esc(x.docType)} · ${esc(x.status)}</li>`), "서류 없음")}</div>
<h2>Project History</h2><div data-testid="qr-history">${li(d.history.map((h) => `<li>${esc(h.date)} · ${esc(h.kind)} — ${esc(h.content)}</li>`), "기록 없음")}</div>
<h2>처리해야 할 업무</h2><div data-testid="qr-todo">${li([
    ...d.todo.approvals.map((x) => `<li>승인 대기 · ${esc(x.code ?? "—")}</li>`),
    ...d.todo.steps.map((x) => `<li>공정 · ${esc(x)}</li>`),
    ...d.todo.defects.map((x) => `<li>${x.kind === "as" ? "A/S" : "하자"} · ${esc(x.title)} (${esc(x.status)})</li>`)], "할 일 없음")}</div>
<p class="muted" style="margin-top:14px"><a href="/mobile">모바일 업무로</a> · 증강 현실(p69-6) — 확장 단계 · 아직 없음</p></div>`;
  return page(200, p ? `${p.projectNo} QR` : "QR", body);
}
