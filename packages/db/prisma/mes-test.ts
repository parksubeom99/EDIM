/**
 * mes-test.ts — 0038 · 0039 · ccmd L 생산 · 창고 · 품질 · QR DB 검증 (pnpm --filter @edim/db mes:test).
 *   1. 다른 회사(B)는 A 의 기준정보 · 입출고 · 작업지시 · 검수 · 공지 · QR 을 0건으로 본다(RLS)
 *   2. edim_app 은 추가만 표(stock_move · work_step_log · inspection · defect_log · work_order_step · notice)를 UPDATE · DELETE 못 한다
 *   3. edim_platform 은 새 표를 읽지 못한다(DB① ↔ DB② 경계 유지)
 *   4. 음수 재고가 되는 출고는 거부 · 동시 출고 경합에서도 합이 음수가 되지 않는다
 *   5. 재고 단가 4종(최고 · 최저 · 평균(수량 가중) · 최근)
 *   6. 작업지시: 앞 공정 미완료면 다음 착수 거부 · 마지막 공정 완료에는 완성품 검수 합격 필요 · 완료 단계 되돌리기 없음
 *   7. 다른 회사 창고 id 를 가리키는 입출고는 거부(외래 키는 RLS 를 보지 않으므로 트리거가 막는다)
 */
import { withTenant } from "../src/tenant";
import { adminPrisma, platformDb } from "../src/client";
import { addStockMove, stockBalances, createWorkOrder, releaseWorkOrder, stepEvent, addInspection, addNotice, qrTokenFor, StockNegativeError, MesRuleError } from "../src/mes";
import { saveBomCodeRun } from "../src/code-catalog";
import { IDS } from "./seed";
import { resetMes, seedMes } from "./seed-mes";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}
async function err(fn: () => Promise<unknown>): Promise<unknown> {
  try { await fn(); return null; } catch (e) { return e; }
}
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const A = IDS.tenantA, B = IDS.tenantB;

async function main(): Promise<void> {
  await resetMes(A); await seedMes(A);
  const wh = await withTenant(A, (tx) => tx.warehouse.findFirst({ where: { code: "WH-1" } }));
  const WH = wh!.id;
  const item = "T-MES-1";

  // 5 · 4 — 입고 3건(단가 100 · 300 · 200) → 단가 4종 · 음수 출고 거부
  await withTenant(A, async (tx) => {
    await addStockMove(tx, { itemCode: item, warehouseId: WH, qty: 2, unitPrice: 100, reason: "receipt", createdBy: IDS.ownerA });
    await addStockMove(tx, { itemCode: item, warehouseId: WH, qty: 1, unitPrice: 300, reason: "receipt", createdBy: IDS.ownerA });
    await addStockMove(tx, { itemCode: item, warehouseId: WH, qty: 1, unitPrice: 200, reason: "receipt", createdBy: IDS.ownerA });
  });
  const bal = (await withTenant(A, (tx) => stockBalances(tx))).find((r) => r.itemCode === item)!;
  check("현재고 = 기록 합(2 + 1 + 1 = 4)", bal.onHand === 4, JSON.stringify(bal));
  check("재고 단가 4종 — 최고 300 · 최저 100 · 평균(수량 가중) 175 · 최근 200", bal.price.max === 300 && bal.price.min === 100 && bal.price.avg === 175 && bal.price.latest === 200, JSON.stringify(bal.price));
  const neg = await err(() => withTenant(A, (tx) => addStockMove(tx, { itemCode: item, warehouseId: WH, qty: -5, reason: "issue", createdBy: IDS.ownerA })));
  check("현재고 4 에서 5 출고 → 거부(음수 재고 불가)", neg instanceof StockNegativeError, msg(neg));

  // 4 — 동시 출고 경합: 현재고 4 에서 3씩 두 번 동시에 → 하나만 성공 · 합 ≥ 0
  const race = await Promise.allSettled([1, 2].map(() => withTenant(A, (tx) => addStockMove(tx, { itemCode: item, warehouseId: WH, qty: -3, reason: "issue", createdBy: IDS.ownerA }))));
  const after = (await withTenant(A, (tx) => stockBalances(tx))).find((r) => r.itemCode === item)!.onHand;
  check("동시 출고 경합(3 + 3 > 4) — 하나만 성공 · 현재고 1 · 음수 0", race.filter((r) => r.status === "fulfilled").length === 1 && after === 1, `${race.map((r) => r.status)} · ${after}`);

  // 7 — 다른 회사 창고 id
  const whB = await adminPrisma.warehouse.create({ data: { tenantId: B, code: "WH-B", name: "B 창고(시험)", location: "" } });
  const cross = await err(() => withTenant(A, (tx) => addStockMove(tx, { itemCode: item, warehouseId: whB.id, qty: 1, unitPrice: 1, reason: "receipt", createdBy: IDS.ownerA })));
  check("A 가 B 의 창고 id 로 입고 → 거부(창고가 이 회사에 없음)", cross instanceof MesRuleError && cross.status === 404, msg(cross));
  await adminPrisma.warehouse.delete({ where: { id: whB.id } });

  // 6 — 작업지시 규칙(SPF 공정 3단: 조립 → 도장 → 검사)
  const proj = await adminPrisma.project.findFirst({ where: { tenantId: A } });
  const run = await withTenant(A, (tx) => saveBomCodeRun(tx, { stableId: proj!.hierarchyStable, code: "SPF-MES-TEST", slots: { A: "SPF" }, macroValue: null, parentCode: "SPF", catalogFp: "mes-test",
    lines: [{ no: 1, childCode: "SMT 1", qty: 1, kind: "purchase", part: "Motor", unit: "ea", unitCost: 1 }], cost: { total: 1, material: 1, labor: 0, currency: "KRW" }, createdBy: IDS.ownerA }));
  const wo = await withTenant(A, (tx) => createWorkOrder(tx, { projectId: proj!.id, projectNo: proj!.projectNo, bomRunId: run.id, itemCode: "SPF", qty: 1, dueDate: null, createdBy: IDS.ownerA }));
  const early = await err(() => withTenant(A, (tx) => stepEvent(tx, { workOrderId: wo.id, seq: 1, event: "start", workerId: null, actualHours: null, createdBy: IDS.ownerA })));
  check("지시 전(초안) 착수 → 거부", early instanceof MesRuleError && /지시 상태/.test(msg(early)), msg(early));
  await withTenant(A, (tx) => releaseWorkOrder(tx, wo.id));
  const skip = await err(() => withTenant(A, (tx) => stepEvent(tx, { workOrderId: wo.id, seq: 2, event: "start", workerId: null, actualHours: null, createdBy: IDS.ownerA })));
  check("앞 공정(1) 미완료에서 공정 2 착수 → 거부", skip instanceof MesRuleError && /앞 공정/.test(msg(skip)), msg(skip));
  for (const s of [1, 2]) for (const ev of ["start", "finish"] as const) await withTenant(A, (tx) => stepEvent(tx, { workOrderId: wo.id, seq: s, event: ev, workerId: null, actualHours: ev === "finish" ? 1 : null, createdBy: IDS.ownerA }));
  await withTenant(A, (tx) => stepEvent(tx, { workOrderId: wo.id, seq: 3, event: "start", workerId: null, actualHours: null, createdBy: IDS.ownerA }));
  const noQc = await err(() => withTenant(A, (tx) => stepEvent(tx, { workOrderId: wo.id, seq: 3, event: "finish", workerId: null, actualHours: 1, createdBy: IDS.ownerA })));
  check("완성품 검수 없이 마지막 공정 완료 → 거부", noQc instanceof MesRuleError && /완성품 검수/.test(msg(noQc)), msg(noQc));
  await withTenant(A, (tx) => addInspection(tx, { target: "product", refId: wo.id, itemCode: "SPF", result: "pass", memo: "", createdBy: IDS.ownerA }));
  const done = await withTenant(A, (tx) => stepEvent(tx, { workOrderId: wo.id, seq: 3, event: "finish", workerId: null, actualHours: 1, createdBy: IDS.ownerA }));
  check("검수 합격 뒤 마지막 공정 완료 → 작업지시 done", done.done && done.status === "done");
  const again = await err(() => withTenant(A, (tx) => stepEvent(tx, { workOrderId: wo.id, seq: 1, event: "finish", workerId: null, actualHours: 1, createdBy: IDS.ownerA })));
  check("완료된 단계 다시 완료(되돌리기 · 정정) → 거부", again instanceof MesRuleError, msg(again));

  // 2 — 추가만 표: edim_app UPDATE · DELETE 거부
  await withTenant(A, (tx) => addNotice(tx, { title: "시험 공지", body: "", createdBy: IDS.ownerA }));
  for (const t of ["stock_move", "work_step_log", "inspection", "defect_log", "work_order_step", "notice"]) {
    const u = await err(() => withTenant(A, (tx) => tx.$executeRawUnsafe(`UPDATE "${t}" SET tenant_id = tenant_id`)));
    const d = await err(() => withTenant(A, (tx) => tx.$executeRawUnsafe(`DELETE FROM "${t}"`)));
    check(`edim_app 은 ${t} 를 UPDATE · DELETE 못 한다(추가만)`, /permission denied/i.test(msg(u)) && /permission denied/i.test(msg(d)), `${msg(u).slice(-60)} | ${msg(d).slice(-60)}`);
  }
  const woDel = await err(() => withTenant(A, (tx) => tx.$executeRawUnsafe(`DELETE FROM "work_order"`)));
  check("edim_app 은 작업지시를 지우지 못한다", /permission denied/i.test(msg(woDel)), msg(woDel).slice(-80));

  // 1 — 다른 회사 0건
  const tok = await withTenant(A, (tx) => qrTokenFor(tx, "work_order", wo.id, IDS.ownerA));
  const seenB = await withTenant(B, async (tx) => [await tx.workCenter.count(), await tx.stockMove.count(), await tx.workOrder.count(), await tx.inspection.count(), await tx.notice.count(), await tx.qrToken.count({ where: { token: tok.token } })]);
  check("회사 B 는 A 의 작업장 · 입출고 · 작업지시 · 검수 · 공지 · QR 토큰을 0건으로 본다", seenB.every((x) => x === 0), JSON.stringify(seenB));
  check("QR 토큰은 추측 불가 임의값(base64url 43자)", /^[A-Za-z0-9_-]{43}$/.test(tok.token), tok.token);

  // 3 — edim_platform 읽기 거부
  for (const t of ["work_center", "stock_move", "work_order", "inspection", "defect", "notice", "qr_token"]) {
    const p = await err(() => platformDb.$queryRawUnsafe(`SELECT count(*) FROM public."${t}"`));
    check(`edim_platform 은 ${t} 를 읽지 못한다`, /permission denied/i.test(msg(p)), msg(p).slice(-80));
  }

  await resetMes(A); await seedMes(A);
  await adminPrisma.bomCodeRun.deleteMany({ where: { id: run.id } });
  console.log(`\nMES: ${fail === 0 ? "ALL PASS" : "FAIL"} (${pass}/${pass + fail})`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
