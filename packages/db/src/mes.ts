/**
 * ccmd L · LA-2 · LA-3 — 생산 · 창고 · 품질(p43 · p44) · 모바일 공지 · QR(p69). 0038 · 0039.
 *
 * 규칙(DB 가 1차로 지키고 여기서 이유 있는 오류로 바꾼다):
 *   - 입출고 · 공정 진행 · 검수 · 하자 상태 기록은 **추가만**(edim_app 에 UPDATE · DELETE 권한 없음).
 *   - 현재고 = stock_move 합. 음수 재고가 되는 이동은 DB 트리거가 거부 → StockNegativeError(409).
 *   - 작업지시 = BOM 스냅샷 + 공정 순서 **사본**(지시 순간). 앞 공정 미완료면 다음 착수 409 · 지시 상태에서만 착수 ·
 *     마지막 공정 완료에는 완성품 검수 합격이 있어야 한다.
 *   - 원가 계산은 이 표들을 읽지 않는다(원가의 제조비는 mfg_rate 만).
 */
import { randomBytes } from "node:crypto";
import type { TenantClient } from "./tenant";
import { requireTenant } from "./tenant";

export class MesRuleError extends Error {
  constructor(message: string, public status = 409) { super(message); this.name = "MesRuleError"; }
}
export class StockNegativeError extends MesRuleError {
  constructor(public itemCode: string, public onHand: number, public move: number) {
    super(`재고가 모자랍니다 — ${itemCode} 현재고 ${onHand} · 이동 ${move}(음수 재고 불가)`, 409);
    this.name = "StockNegativeError";
  }
}

const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const d10 = (v: Date | null): string | null => (v ? v.toISOString().slice(0, 10) : null);
export const MES_SKILL = /^[A-Z][0-9]$/;
export const MES_CODE = /^[A-Za-z0-9_-]{1,20}$/;

// ───────── 기준정보(p43) ─────────
export async function mesMaster(tx: TenantClient) {
  const [workCenters, machines, workers, warehouses, items, routes] = await Promise.all([
    tx.workCenter.findMany({ orderBy: { code: "asc" } }),
    tx.machine.findMany({ orderBy: { code: "asc" } }),
    tx.worker.findMany({ orderBy: { code: "asc" } }),
    tx.warehouse.findMany({ orderBy: { code: "asc" } }),
    tx.itemMaterial.findMany({ orderBy: { itemCode: "asc" } }),
    tx.processRoute.findMany({ orderBy: [{ itemCode: "asc" }, { seq: "asc" }] }),
  ]);
  return {
    workCenters: workCenters.map((w) => ({ id: w.id, code: w.code, name: w.name, hoursPerDay: n(w.hoursPerDay), isSample: w.isSample })),
    machines: machines.map((m) => ({ id: m.id, code: m.code, kind: m.kind, workCenterId: m.workCenterId })),
    workers: workers.map((w) => ({ id: w.id, code: w.code, displayName: w.displayName, skillGrade: w.skillGrade })),
    warehouses: warehouses.map((w) => ({ id: w.id, code: w.code, name: w.name, location: w.location })),
    items: items.map((i) => ({ id: i.id, itemCode: i.itemCode, warehouseId: i.warehouseId, minStack: n(i.minStack), supplier: i.supplier, makeBuy: i.makeBuy as "make" | "buy", leadDays: i.leadDays, unit: i.unit })),
    routes: routes.map((r) => ({ id: r.id, itemCode: r.itemCode, seq: r.seq, name: r.name, workCenterId: r.workCenterId, persons: r.persons, skill: r.skill, hours: n(r.hours), prevSeq: r.prevSeq })),
  };
}
export type MesMaster = Awaited<ReturnType<typeof mesMaster>>;

export async function saveWorkCenter(tx: TenantClient, r: { code: string; name: string; hoursPerDay: number; isSample?: boolean }) {
  const tenantId = await requireTenant(tx);
  return tx.workCenter.upsert({
    where: { tenantId_code: { tenantId, code: r.code } },
    create: { tenantId, code: r.code, name: r.name, hoursPerDay: r.hoursPerDay, isSample: r.isSample ?? false },
    update: { name: r.name, hoursPerDay: r.hoursPerDay },
  });
}
export async function saveMachine(tx: TenantClient, r: { code: string; kind: string; workCenterId: string }) {
  const tenantId = await requireTenant(tx);
  return tx.machine.upsert({ where: { tenantId_code: { tenantId, code: r.code } }, create: { tenantId, ...r }, update: { kind: r.kind, workCenterId: r.workCenterId } });
}
export async function saveWorker(tx: TenantClient, r: { code: string; displayName: string; skillGrade: string }) {
  const tenantId = await requireTenant(tx);
  return tx.worker.upsert({ where: { tenantId_code: { tenantId, code: r.code } }, create: { tenantId, ...r }, update: { displayName: r.displayName, skillGrade: r.skillGrade } });
}
export async function saveWarehouse(tx: TenantClient, r: { code: string; name: string; location: string }) {
  const tenantId = await requireTenant(tx);
  return tx.warehouse.upsert({ where: { tenantId_code: { tenantId, code: r.code } }, create: { tenantId, ...r }, update: { name: r.name, location: r.location } });
}
export async function saveItemMaterial(tx: TenantClient, r: { itemCode: string; warehouseId: string; minStack: number; supplier: string | null; makeBuy: "make" | "buy"; leadDays: number; unit: string }) {
  const tenantId = await requireTenant(tx);
  return tx.itemMaterial.upsert({ where: { tenantId_itemCode: { tenantId, itemCode: r.itemCode } }, create: { tenantId, ...r }, update: { ...r } });
}
/** 한 품목의 공정 순서를 통째로 바꾼다(이미 낸 작업지시는 사본이라 영향 없음). */
export async function saveRoute(tx: TenantClient, itemCode: string, steps: { seq: number; name: string; workCenterId: string; persons: number; skill: string; hours: number; prevSeq: number | null }[]) {
  const tenantId = await requireTenant(tx);
  await tx.processRoute.deleteMany({ where: { itemCode } });
  for (const s of steps) await tx.processRoute.create({ data: { tenantId, itemCode, ...s } });
  return tx.processRoute.findMany({ where: { itemCode }, orderBy: { seq: "asc" } });
}

// ───────── 창고 · 재고(p44-4) ─────────
export type StockReason = "receipt" | "issue" | "wo_consume" | "inspection_return";
export async function addStockMove(tx: TenantClient, m: { itemCode: string; warehouseId: string; qty: number; unitPrice?: number | null; reason: StockReason; refKind?: "purchase_request" | "work_order" | "inspection" | null; refId?: string | null; createdBy: string }) {
  const tenantId = await requireTenant(tx);
  // 창고는 이 회사에 보여야 한다(RLS) — DB 트리거도 막지만 이유 있는 404 로 먼저 돌려준다
  if (!(await tx.warehouse.findUnique({ where: { id: m.warehouseId } }))) throw new MesRuleError("창고를 찾을 수 없습니다", 404);
  try {
    // SAVEPOINT — 트리거 거부가 바깥 트랜잭션을 죽이지 않게(같은 요청 안에서 이유를 돌려주려고)
    await tx.$executeRawUnsafe(`SAVEPOINT stock_move_sp`);
    const row = await tx.stockMove.create({
      data: { tenantId, itemCode: m.itemCode, warehouseId: m.warehouseId, qty: m.qty, unitPrice: m.unitPrice ?? null, reason: m.reason, refKind: m.refKind ?? null, refId: m.refId ?? null, createdBy: m.createdBy },
    });
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT stock_move_sp`);
    return row;
  } catch (e) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT stock_move_sp`);
    const msg = e instanceof Error ? e.message : String(e);
    const hit = /insufficient stock: .* on hand (-?[\d.]+), move (-?[\d.]+)/.exec(msg);
    if (hit) throw new StockNegativeError(m.itemCode, Number(hit[1]), Number(hit[2]));
    if (/warehouse .* not found in this tenant|Foreign key constraint/i.test(msg)) throw new MesRuleError("창고를 찾을 수 없습니다", 404);
    throw e;
  }
}

export interface StockRow {
  itemCode: string; warehouseId: string; warehouseCode: string; onHand: number; unit: string; minStack: number; warn: boolean;
  price: { max: number | null; min: number | null; avg: number | null; latest: number | null };
}
/** 품목 × 창고 현재고 · 재고 단가 4종(입고 단가 기준: 최고 · 최저 · 평균(수량 가중) · 최근) · Min Stack 경고 */
export async function stockBalances(tx: TenantClient): Promise<StockRow[]> {
  const [moves, whs, items] = await Promise.all([
    tx.stockMove.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    tx.warehouse.findMany(), tx.itemMaterial.findMany(),
  ]);
  const whCode = new Map(whs.map((w) => [w.id, w.code]));
  const itemOf = new Map(items.map((i) => [i.itemCode, i]));
  const acc = new Map<string, { itemCode: string; warehouseId: string; onHand: number; rq: number; rv: number; max: number | null; min: number | null; latest: number | null }>();
  const key = (i: string, w: string) => `${i}|${w}`;
  for (const i of items) acc.set(key(i.itemCode, i.warehouseId), { itemCode: i.itemCode, warehouseId: i.warehouseId, onHand: 0, rq: 0, rv: 0, max: null, min: null, latest: null });
  for (const m of moves) {
    const k = key(m.itemCode, m.warehouseId);
    const a = acc.get(k) ?? { itemCode: m.itemCode, warehouseId: m.warehouseId, onHand: 0, rq: 0, rv: 0, max: null, min: null, latest: null };
    a.onHand += n(m.qty);
    if (m.reason === "receipt" && m.unitPrice !== null) {
      const p = n(m.unitPrice);
      a.rq += n(m.qty); a.rv += n(m.qty) * p; a.latest = p;
      a.max = a.max === null ? p : Math.max(a.max, p); a.min = a.min === null ? p : Math.min(a.min, p);
    }
    acc.set(k, a);
  }
  return [...acc.values()].sort((x, y) => x.itemCode.localeCompare(y.itemCode) || (whCode.get(x.warehouseId) ?? "").localeCompare(whCode.get(y.warehouseId) ?? "")).map((a) => {
    const it = itemOf.get(a.itemCode);
    const minStack = it && it.warehouseId === a.warehouseId ? n(it.minStack) : 0;
    return {
      itemCode: a.itemCode, warehouseId: a.warehouseId, warehouseCode: whCode.get(a.warehouseId) ?? "?", onHand: a.onHand, unit: it?.unit ?? "ea", minStack,
      warn: minStack > 0 && a.onHand < minStack,
      price: { max: a.max, min: a.min, avg: a.rq > 0 ? Math.round((a.rv / a.rq) * 100) / 100 : null, latest: a.latest },
    };
  });
}
export async function listStockMoves(tx: TenantClient, take = 50) {
  const rows = await tx.stockMove.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take });
  return rows.map((m) => ({ id: m.id, itemCode: m.itemCode, warehouseId: m.warehouseId, qty: n(m.qty), unitPrice: m.unitPrice === null ? null : n(m.unitPrice), reason: m.reason, refKind: m.refKind, refId: m.refId, createdAt: m.createdAt.toISOString() }));
}

/** MRP 입력 — 현재고(품목 합) · 입고 예정(발주된 구매 요청 줄 − 그 구매 요청으로 들어온 입고) */
export async function mrpInputs(tx: TenantClient) {
  const [moves, prs] = await Promise.all([
    tx.stockMove.findMany({ select: { itemCode: true, qty: true, reason: true, refKind: true, refId: true } }),
    tx.purchaseRequest.findMany({ where: { status: "ordered" }, select: { id: true, lines: { select: { childCode: true, qty: true } } } }),
  ]);
  const onHand: Record<string, number> = {}; const incoming: Record<string, number> = {};
  for (const m of moves) onHand[m.itemCode] = (onHand[m.itemCode] ?? 0) + n(m.qty);
  for (const pr of prs) for (const l of pr.lines) {
    const got = moves.filter((m) => m.reason === "receipt" && m.refKind === "purchase_request" && m.refId === pr.id && m.itemCode === l.childCode).reduce((a, m) => a + n(m.qty), 0);
    incoming[l.childCode] = (incoming[l.childCode] ?? 0) + Math.max(0, l.qty - got);
  }
  return { onHand, incoming, stockSum: Object.values(onHand).reduce((a, v) => a + v, 0) };
}

// ───────── 작업지시 · 공정 진행(p44-2 · 3) ─────────
export async function createWorkOrder(tx: TenantClient, w: { projectId: string; projectNo: string; bomRunId: string; itemCode: string; qty: number; dueDate: Date | null; createdBy: string }) {
  const tenantId = await requireTenant(tx);
  const route = await tx.processRoute.findMany({ where: { itemCode: w.itemCode }, orderBy: { seq: "asc" } });
  if (route.length === 0) throw new MesRuleError(`${w.itemCode} 의 공정 순서가 없습니다 — Set-Up ▸ Work Process 에서 등록하세요`, 422);
  const head = `WO-${w.projectNo}-`;
  const prior = await tx.workOrder.findMany({ where: { woNo: { startsWith: head } }, select: { woNo: true } });
  const woNo = `${head}${String(prior.reduce((mx, r) => Math.max(mx, Number(r.woNo.slice(head.length)) || 0), 0) + 1).padStart(2, "0")}`;
  const wo = await tx.workOrder.create({ data: { tenantId, woNo, projectId: w.projectId, bomRunId: w.bomRunId, itemCode: w.itemCode, qty: w.qty, dueDate: w.dueDate, createdBy: w.createdBy } });
  for (const r of route) await tx.workOrderStep.create({ data: { tenantId, workOrderId: wo.id, seq: r.seq, name: r.name, workCenterId: r.workCenterId, persons: r.persons, skill: r.skill, hours: r.hours, prevSeq: r.prevSeq } });
  return wo;
}

async function lockWo(tx: TenantClient, id: string) {
  const rows = await tx.$queryRaw<{ id: string; status: string }[]>`SELECT id, status FROM "work_order" WHERE id = ${id}::uuid FOR UPDATE`;
  if (!rows[0]) throw new MesRuleError("작업지시를 찾을 수 없습니다", 404);
  return rows[0];
}

export async function workOrderDetail(tx: TenantClient, id: string) {
  const wo = await tx.workOrder.findUnique({ where: { id } });
  if (!wo) return null;
  const [steps, logs, insp, centers] = await Promise.all([
    tx.workOrderStep.findMany({ where: { workOrderId: id }, orderBy: { seq: "asc" } }),
    tx.workStepLog.findMany({ where: { workOrderId: id }, orderBy: { createdAt: "asc" } }),
    tx.inspection.findMany({ where: { refId: id }, orderBy: { createdAt: "asc" } }),
    tx.workCenter.findMany(),
  ]);
  const cName = new Map(centers.map((c) => [c.id, `${c.code} · ${c.name}`]));
  return {
    id: wo.id, woNo: wo.woNo, projectId: wo.projectId, bomRunId: wo.bomRunId, itemCode: wo.itemCode, qty: n(wo.qty), dueDate: d10(wo.dueDate), status: wo.status, createdAt: wo.createdAt.toISOString(),
    steps: steps.map((s) => {
      const st = logs.find((l) => l.stepSeq === s.seq && l.event === "start"); const fi = logs.find((l) => l.stepSeq === s.seq && l.event === "finish");
      return { seq: s.seq, name: s.name, workCenterId: s.workCenterId, workCenter: cName.get(s.workCenterId) ?? "?", persons: s.persons, skill: s.skill, hours: n(s.hours), prevSeq: s.prevSeq,
        startedAt: st?.createdAt.toISOString() ?? null, finishedAt: fi?.createdAt.toISOString() ?? null, workerId: st?.workerId ?? fi?.workerId ?? null, actualHours: fi?.actualHours === undefined || fi?.actualHours === null ? null : n(fi.actualHours) };
    }),
    inspections: insp.map((i) => ({ id: i.id, target: i.target, result: i.result, memo: i.memo, createdAt: i.createdAt.toISOString() })),
  };
}
export async function listWorkOrders(tx: TenantClient) {
  const rows = await tx.workOrder.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((w) => ({ id: w.id, woNo: w.woNo, projectId: w.projectId, bomRunId: w.bomRunId, itemCode: w.itemCode, qty: n(w.qty), dueDate: d10(w.dueDate), status: w.status, createdAt: w.createdAt.toISOString() }));
}

export async function releaseWorkOrder(tx: TenantClient, id: string) {
  const wo = await lockWo(tx, id);
  if (wo.status !== "draft") throw new MesRuleError(`초안만 지시할 수 있습니다(지금 ${wo.status})`);
  return tx.workOrder.update({ where: { id }, data: { status: "released", updatedAt: new Date() } });
}

/** 공정 착수 · 완료 — 추가만 되는 기록. 완료된 단계 되돌리기 없음(정정은 새 기록). */
export async function stepEvent(tx: TenantClient, e: { workOrderId: string; seq: number; event: "start" | "finish"; workerId: string | null; actualHours: number | null; createdBy: string }) {
  const tenantId = await requireTenant(tx);
  const wo = await lockWo(tx, e.workOrderId);
  if (wo.status !== "released" && wo.status !== "in_progress") throw new MesRuleError(`지시 상태에서만 공정을 진행합니다(지금 ${wo.status})`);
  const steps = await tx.workOrderStep.findMany({ where: { workOrderId: e.workOrderId }, orderBy: { seq: "asc" } });
  const step = steps.find((s) => s.seq === e.seq);
  if (!step) throw new MesRuleError(`공정 ${e.seq} 이 없습니다`, 404);
  const logs = await tx.workStepLog.findMany({ where: { workOrderId: e.workOrderId } });
  const has = (seq: number, ev: string) => logs.some((l) => l.stepSeq === seq && l.event === ev);
  if (e.event === "start") {
    if (has(e.seq, "start")) throw new MesRuleError(`공정 ${e.seq} 은 이미 착수했습니다`);
    if (step.prevSeq !== null && !has(step.prevSeq, "finish")) throw new MesRuleError(`앞 공정(${step.prevSeq})이 완료되지 않았습니다 — 다음 공정을 착수할 수 없습니다`);
  } else {
    if (!has(e.seq, "start")) throw new MesRuleError(`공정 ${e.seq} 은 착수 전입니다`);
    if (has(e.seq, "finish")) throw new MesRuleError(`공정 ${e.seq} 은 이미 완료했습니다 — 되돌리기 없음(정정은 새 기록)`);
    const last = steps[steps.length - 1]!.seq === e.seq;
    if (last) {
      const ok = await tx.inspection.findFirst({ where: { target: "product", refId: e.workOrderId, result: "pass" } });
      if (!ok) throw new MesRuleError("완성품 검수 합격이 필요합니다 — 품질(검수)에서 이 작업지시의 완성품 검수를 먼저 기록하세요");
    }
  }
  if (e.workerId) {
    const w = await tx.worker.findUnique({ where: { id: e.workerId } });
    if (!w) throw new MesRuleError("작업자를 찾을 수 없습니다", 404);
  }
  const row = await tx.workStepLog.create({ data: { tenantId, workOrderId: e.workOrderId, stepSeq: e.seq, event: e.event, workerId: e.workerId, actualHours: e.actualHours, createdBy: e.createdBy } });
  const allDone = e.event === "finish" && steps.every((s) => s.seq === e.seq || has(s.seq, "finish"));
  const next = allDone ? "done" : wo.status === "released" ? "in_progress" : wo.status;
  if (next !== wo.status) await tx.workOrder.update({ where: { id: e.workOrderId }, data: { status: next, updatedAt: new Date() } });
  return { log: row, status: next, done: allDone };
}

// ───────── 품질(p44-5) · A/S(p69-5) ─────────
export async function addInspection(tx: TenantClient, i: { target: "material" | "product" | "install"; refId: string; itemCode: string | null; result: "pass" | "fail"; memo: string; createdBy: string }) {
  const tenantId = await requireTenant(tx);
  let returned: { id: string; qty: number } | null = null;
  if (i.target === "material") {
    const mv = await tx.stockMove.findUnique({ where: { id: i.refId } });
    if (!mv || mv.reason !== "receipt") throw new MesRuleError("자재 입고 검수는 입고 기록을 가리켜야 합니다", 404);
  } else if (i.target === "product") {
    const wo = await tx.workOrder.findUnique({ where: { id: i.refId } });
    if (!wo) throw new MesRuleError("작업지시를 찾을 수 없습니다", 404);
  } else {
    const p = await tx.project.findUnique({ where: { id: i.refId } });
    if (!p) throw new MesRuleError("프로젝트를 찾을 수 없습니다", 404);
  }
  const row = await tx.inspection.create({ data: { tenantId, target: i.target, refId: i.refId, itemCode: i.itemCode, result: i.result, memo: i.memo, createdBy: i.createdBy } });
  let defect: { id: string } | null = null;
  if (i.result === "fail") {
    if (i.target === "material") {
      const mv = (await tx.stockMove.findUnique({ where: { id: i.refId } }))!;
      const r = await addStockMove(tx, { itemCode: mv.itemCode, warehouseId: mv.warehouseId, qty: -n(mv.qty), reason: "inspection_return", refKind: "inspection", refId: row.id, createdBy: i.createdBy });
      returned = { id: r.id, qty: n(r.qty) };
    }
    defect = await openDefect(tx, { kind: "defect", inspectionId: row.id, refId: i.refId, title: `검수 불합격 · ${i.target === "material" ? "자재" : i.target === "product" ? "완성품" : "설치완료"}${i.itemCode ? ` · ${i.itemCode}` : ""}${i.memo ? ` — ${i.memo}` : ""}`.slice(0, 120), createdBy: i.createdBy });
    void tenantId;
  }
  return { inspection: row, returned, defect };
}
export async function openDefect(tx: TenantClient, d: { kind: "defect" | "as"; inspectionId: string | null; refId: string | null; title: string; createdBy: string }) {
  const tenantId = await requireTenant(tx);
  const row = await tx.defect.create({ data: { tenantId, kind: d.kind, inspectionId: d.inspectionId, refId: d.refId, title: d.title, createdBy: d.createdBy } });
  await tx.defectLog.create({ data: { tenantId, defectId: row.id, status: "open", note: d.kind === "as" ? "A/S 접수" : "검수 불합격", createdBy: d.createdBy } });
  return row;
}
const FLOW: Record<string, string> = { open: "action", action: "closed" };
/** 하자 상태는 앞으로만(열림 → 조치 → 닫힘) · 변경마다 로그(추가만) */
export async function advanceDefect(tx: TenantClient, id: string, to: string, note: string, by: string) {
  const tenantId = await requireTenant(tx);
  const rows = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM "defect" WHERE id = ${id}::uuid FOR UPDATE`;
  if (!rows[0]) throw new MesRuleError("하자 건을 찾을 수 없습니다", 404);
  if (FLOW[rows[0].status] !== to) throw new MesRuleError(`하자 상태는 열림 → 조치 → 닫힘 순서로만 바뀝니다(지금 ${rows[0].status} → ${to} 불가)`);
  await tx.defect.update({ where: { id }, data: { status: to, updatedAt: new Date() } });
  await tx.defectLog.create({ data: { tenantId, defectId: id, status: to, note, createdBy: by } });
  return { id, status: to };
}
export async function listQuality(tx: TenantClient) {
  const [insp, defects, logs] = await Promise.all([
    tx.inspection.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    tx.defect.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    tx.defectLog.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return {
    inspections: insp.map((i) => ({ id: i.id, target: i.target, refId: i.refId, itemCode: i.itemCode, result: i.result, memo: i.memo, createdAt: i.createdAt.toISOString() })),
    defects: defects.map((d) => ({ id: d.id, kind: d.kind, inspectionId: d.inspectionId, refId: d.refId, title: d.title, status: d.status, createdAt: d.createdAt.toISOString(),
      log: logs.filter((l) => l.defectId === d.id).map((l) => ({ status: l.status, note: l.note, at: l.createdAt.toISOString() })) })),
  };
}

// ───────── 공지 · QR(p69) ─────────
export async function addNotice(tx: TenantClient, a: { title: string; body: string; createdBy: string }) {
  const tenantId = await requireTenant(tx);
  return tx.notice.create({ data: { tenantId, ...a } });
}
export async function listNotices(tx: TenantClient) {
  const rows = await tx.notice.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((r) => ({ id: r.id, title: r.title, body: r.body, createdAt: r.createdAt.toISOString() }));
}
export type QrKind = "project" | "work_order" | "drawing";
/** 대상마다 살아 있는 토큰 하나 — 있으면 그대로(인쇄본마다 QR 이 바뀌지 않게) */
export async function qrTokenFor(tx: TenantClient, kind: QrKind, targetId: string, by: string) {
  const tenantId = await requireTenant(tx);
  const cur = await tx.qrToken.findFirst({ where: { targetKind: kind, targetId, revokedAt: null }, orderBy: { createdAt: "asc" } });
  if (cur) return cur;
  return tx.qrToken.create({ data: { tenantId, token: randomBytes(32).toString("base64url"), targetKind: kind, targetId, createdBy: by } });
}
export async function findQrToken(tx: TenantClient, token: string) {
  return tx.qrToken.findUnique({ where: { token } });
}
export async function revokeQrToken(tx: TenantClient, id: string) {
  return tx.qrToken.update({ where: { id }, data: { revokedAt: new Date() } });
}
