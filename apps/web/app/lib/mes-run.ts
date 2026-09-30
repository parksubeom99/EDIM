/**
 * ccmd L · LA-2 · LA-3 — 생산 · 창고 · 품질 · 모바일 · QR 의 서버 조립(DB 읽기 → 결정론 계산 → 화면 · 인쇄본).
 * 권한: 읽기 = 로그인한 회사 사람 전부(viewer 포함) · 쓰기 = owner · engineer · cad · 공지 쓰기 = owner.
 * 샘플 자료(작업장 · 작업자 · 창고 · 재고 · 리드타임)는 화면 · 인쇄본에 '샘플' 표지.
 */
import qrcode from "qrcode-generator";
import type { Role } from "@edim/core-ontology";
import { withTenant, mesMaster, mrpInputs, workOrderDetail, listWorkOrders, findQrToken, listDocuments, listApprovals } from "@edim/db";
import { computeMrp, computeCapacity, type MrpLineIn } from "./mrp";
import { businessToday, businessDateOf } from "./today";

export const MES_EDIT_ROLES: readonly Role[] = ["owner", "engineer", "cad"];
export const canEditMes = (r: Role) => MES_EDIT_ROLES.includes(r);
export const canWriteNotice = (r: Role) => r === "owner";
export const SAMPLE_NOTE = "샘플 — 작업장 · 작업자 · 창고 · 재고 · 리드타임은 샘플 자료(회사 기준정보로 바꾸면 그대로 쓴다)";
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** QR SVG(추측 불가 토큰 URL) — 새 의존성 qrcode-generator(MIT) 한 개 */
export function qrSvg(text: string, cell = 3): string {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: false });
}

/** 프로젝트의 BOM 스냅샷 — 기본 = 프로젝트 노드의 최신 · runId 를 주면 같은 노드의 그 스냅샷만 */
async function projectSnapshot(tenantId: string, projectId: string, runId: string | null) {
  return withTenant(tenantId, async (tx) => {
    const p = await tx.project.findUnique({ where: { id: projectId } });
    if (!p) return { error: 404 as const };
    const run = await tx.bomCodeRun.findFirst({
      where: { hierarchyStable: p.hierarchyStable, ...(runId ? { id: runId } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, parentCode: true, code: true, lines: true, createdAt: true },
    });
    return { p, run };
  });
}

export async function mrpFor(tenantId: string, projectId: string, runId: string | null) {
  const s = await projectSnapshot(tenantId, projectId, runId);
  if ("error" in s) return { status: 404 as const, error: "프로젝트를 찾을 수 없습니다" };
  if (!s.run) return { status: 409 as const, error: "먼저 BOM Run — 이 프로젝트 노드에 BOM 스냅샷이 없습니다(MRP 는 스냅샷을 읽기만 한다)" };
  const [inp, master] = await withTenant(tenantId, async (tx) => [await mrpInputs(tx), await mesMaster(tx)] as const);
  const raw = Array.isArray(s.run.lines) ? (s.run.lines as Record<string, unknown>[]) : [];
  const lines: MrpLineIn[] = raw.map((l) => ({ childCode: String(l.childCode), part: String(l.part ?? ""), qty: Number(l.qty ?? 0), unit: String(l.unit ?? "ea"), kind: String(l.kind ?? "part") }));
  const routeHours: Record<string, number> = {};
  for (const r of master.routes) routeHours[r.itemCode] = (routeHours[r.itemCode] ?? 0) + r.hours;
  const items = Object.fromEntries(master.items.map((i) => [i.itemCode, { makeBuy: i.makeBuy, leadDays: i.leadDays }]));
  const out = computeMrp({
    snapshot: { id: s.run.id, product: s.run.parentCode, lines },
    project: { qty: s.p.qty, due: s.p.dueDate ? s.p.dueDate.toISOString().slice(0, 10) : null },
    onHand: inp.onHand, incoming: inp.incoming, items, routeHours, today: businessToday(),
  });
  const unitCost = Object.fromEntries(raw.map((l) => [String(l.childCode), { price: Number(l.unitCost ?? 0), line: l }]));
  return { status: 200 as const, project: { id: s.p.id, projectNo: s.p.projectNo, name: s.p.name, qty: s.p.qty, due: out.head.due, stableId: s.p.hierarchyStable },
    run: { id: s.run.id, code: s.run.code }, hasRoute: Object.keys(routeHours), unitCost, ...out };
}

export async function capacityFor(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const m = await mesMaster(tx);
    const wos = (await listWorkOrders(tx)).filter((w) => w.status === "released" || w.status === "in_progress");
    const orders = [];
    for (const w of wos) {
      const d = (await workOrderDetail(tx, w.id))!;
      orders.push({ workOrder: w.woNo, start: businessDateOf(w.createdAt), qty: w.qty, steps: d.steps.map((s) => ({ seq: s.seq, workCenterId: s.workCenterId, hours: s.hours, persons: s.persons, done: !!s.finishedAt })) });
    }
    const cells = computeCapacity(orders, Object.fromEntries(m.workCenters.map((c) => [c.id, c.hoursPerDay])));
    return { centers: m.workCenters, cells };
  });
}

export function workOrderHtml(d: NonNullable<Awaited<ReturnType<typeof workOrderDetail>>>, projectNo: string, qrUrl: string | null): string {
  const rows = d.steps.map((s) => `<tr><td>${s.seq}</td><td>${esc(s.name)}</td><td>${esc(s.workCenter)}</td><td class="n">${s.persons}</td><td>${esc(s.skill)}</td><td class="n">${s.hours}</td><td>${s.prevSeq ?? "—"}</td><td>${s.startedAt ? esc(s.startedAt.slice(0, 16).replace("T", " ")) : ""}</td><td>${s.finishedAt ? esc(s.finishedAt.slice(0, 16).replace("T", " ")) : ""}</td><td class="n">${s.actualHours ?? ""}</td></tr>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(d.woNo)} 작업지시서</title>
<style>@page{size:A4;margin:14mm}body{font-family:"Noto Sans KR",sans-serif;font-size:12px;color:#111}h1{font-size:20px;letter-spacing:.3em;margin:0 0 8px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #999;padding:4px 6px;text-align:left}td.n{text-align:right}.head{display:flex;justify-content:space-between;align-items:flex-start}.sample{color:#b45309;font-weight:700;border:1px solid #b45309;border-radius:3px;padding:0 4px;font-size:11px}footer{margin-top:10px;font-size:10px;color:#555;border-top:1px solid #999;padding-top:4px}</style></head>
<body><div class="head"><div><h1>작 업 지 시 서</h1>
<table data-testid="wo-print-head"><tr><th>지시 번호</th><td class="mono">${esc(d.woNo)}</td><th>상태</th><td>${esc(d.status)}</td></tr>
<tr><th>프로젝트</th><td>${esc(projectNo)}</td><th>품목</th><td>${esc(d.itemCode)} × ${d.qty}</td></tr>
<tr><th>납기</th><td>${esc(d.dueDate ?? "—")}</td><th>BOM 스냅샷</th><td class="mono">${esc(d.bomRunId.slice(0, 8))}</td></tr></table></div>
<div data-testid="wo-print-qr" style="text-align:center">${qrUrl ? qrSvg(qrUrl, 3) + `<div style="font-size:9px">QR — 도면 · 서류 · 이력 · 할 일</div>` : "QR 없음"}</div></div>
<table data-testid="wo-print-steps"><tr><th>순번</th><th>공정</th><th>작업장</th><th>인원</th><th>스킬</th><th>시간(h)</th><th>앞 공정</th><th>착수</th><th>완료</th><th>실제(h)</th></tr>${rows}</table>
<p><span class="sample">샘플</span> ${esc(SAMPLE_NOTE)}</p>
<footer>공정 순서는 지시 순간의 사본이다(나중에 공정 순서를 고쳐도 이 지시서는 그대로). 착수 · 완료는 추가만 되는 기록 · 앞 공정 미완료면 다음 공정 착수 불가 · 마지막 공정 완료에는 완성품 검수 합격 필요.</footer>
</body></html>`;
}

/** /q/{토큰} — p69 "QR Code 정보" 5가지: 도면 · 각종 서류 · Project History · Project 정보 · 처리해야 할 업무 */
export async function qrPage(tenantId: string, token: string) {
  return withTenant(tenantId, async (tx) => {
    const t = await findQrToken(tx, token);
    if (!t) return { status: 404 as const };
    if (t.revokedAt) return { status: 410 as const };
    let projectId: string | null = null; let wo: Awaited<ReturnType<typeof workOrderDetail>> = null; let drawingId: string | null = null;
    if (t.targetKind === "project") projectId = t.targetId;
    else if (t.targetKind === "work_order") { wo = await workOrderDetail(tx, t.targetId); projectId = wo?.projectId ?? null; }
    else { const dr = await tx.drawing.findUnique({ where: { id: t.targetId }, select: { id: true, hierarchyStable: true } }); drawingId = dr?.id ?? null;
      if (dr?.hierarchyStable) projectId = (await tx.project.findFirst({ where: { hierarchyStable: dr.hierarchyStable }, select: { id: true } }))?.id ?? null; }
    const p = projectId ? await tx.project.findUnique({ where: { id: projectId } }) : null;
    const drawings = p ? await tx.drawing.findMany({ where: { hierarchyStable: p.hierarchyStable, status: "issued" }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, drawingNo: true, currentRev: true, drawingType: true } }) : [];
    const docs = p ? await listDocuments(tx, p.hierarchyStable) : [];
    const history = p ? await tx.projectActivity.findMany({ where: { projectId: p.id }, orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }], take: 20 }) : [];
    const approvals = p ? (await listApprovals(tx, p.id)).filter((a) => a.state === "requested") : [];
    const wos = p ? (await tx.workOrder.findMany({ where: { projectId: p.id, status: { in: ["released", "in_progress"] } } })) : [];
    const openSteps: string[] = [];
    for (const w of wos) { const d = (await workOrderDetail(tx, w.id))!; const nx = d.steps.find((s) => !s.finishedAt); if (nx) openSteps.push(`${d.woNo} · 공정 ${nx.seq} ${nx.name}${nx.startedAt ? " (진행 중)" : " (착수 전)"}`); }
    const defects = await tx.defect.findMany({ where: { status: { not: "closed" } }, orderBy: { createdAt: "desc" }, take: 20 });
    return { status: 200 as const, kind: t.targetKind, targetId: t.targetId, drawingId, wo,
      project: p ? { id: p.id, projectNo: p.projectNo, name: p.name, clientName: p.clientName, salesStage: p.salesStage, qty: p.qty, due: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null } : null,
      drawings, docs: docs.map((d) => ({ id: d.id, docNo: d.docNo, docType: d.docType, rev: d.currentRev, status: d.status })),
      history: history.map((h) => ({ date: h.activityDate.toISOString().slice(0, 10), kind: h.kind, content: h.content })),
      todo: { approvals: approvals.map((a) => ({ id: a.id, code: a.bomRun?.code ?? null, requestedAt: a.requestedAt.toISOString() })), steps: openSteps, defects: defects.map((d) => ({ id: d.id, title: d.title, status: d.status, kind: d.kind })) } };
  });
}
