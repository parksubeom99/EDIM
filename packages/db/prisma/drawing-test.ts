/**
 * drawing-test.ts — P4-a DB 검증 (pnpm --filter @edim/db drawing:test).
 *
 * 확인하는 것:
 *  1. BOM 스냅샷에 **어느 코드 개정으로 돌렸는지**가 박힌다 (연결 장부 약함 #3)
 *  2. 도면은 스냅샷을 참조한다 — 근거를 못 대는 도면은 없다 (약함 #2)
 *  3. 같은 도면번호를 다시 뜨면 개정이 붙고, 앞 개정은 남는다
 *  4. 상태는 작성중→검토→승인→발행 한 방향, 발행은 잠긴다 — **DB 트리거가** 막는다
 *  5. 테넌트 경계(RLS)
 */
import { withTenant } from "../src/tenant";
import { appPrisma, adminPrisma } from "../src/client";
import { saveBomCodeRun } from "../src/code-catalog";
import {
  saveDrawing, listDrawings, setDrawingStatus, latestRevisionId,
  DrawingLockedError, DrawingStatusBackwardsError,
} from "../src/drawing";
import { IDS } from "./seed";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}
async function throws(fn: () => Promise<unknown>): Promise<unknown> {
  try { await fn(); return null; } catch (e) { return e; }
}

const NODE = "a0000000-0000-4000-8000-000000000004";

async function main(): Promise<void> {
  // --- 1) 스냅샷에 코드 개정이 박힌다 ---------------------------------------
  const revId = await withTenant(IDS.tenantA, (tx) => latestRevisionId(tx, NODE));
  const run = await withTenant(IDS.tenantA, (tx) =>
    saveBomCodeRun(tx, {
      stableId: NODE, code: "EU-55-2123-630SS", slots: { A: "EU", B: "55" },
      macroValue: 455.4, parentCode: "EU", catalogFp: "test",
      lines: [{ no: 1, section: "Casing", part: "Panel", qty: 20, unit: "ea", childCode: "EP-PNL" }],
      cost: { total: 1000, currency: "KRW" },
      codeRevisionId: revId, createdBy: IDS.ownerA,
    }),
  );
  check("BOM 스냅샷이 저장된다", !!run.id);
  check(
    "스냅샷에 코드 개정 id 가 박힌다 (약함 #3)",
    revId === null ? run.codeRevisionId === null : run.codeRevisionId === revId,
    `rev=${String(revId)} snap=${String(run.codeRevisionId)}`,
  );

  // --- 2·3) 도면은 스냅샷에서 나오고, 다시 뜨면 개정이 붙는다 ---------------
  const d1 = await withTenant(IDS.tenantA, (tx) =>
    saveDrawing(tx, {
      stableId: NODE, bomRunId: run.id, drawingNo: "TEST-PLN", drawingType: "plan",
      code: run.code, dxf: "0\nSECTION\n", meta: { widthMm: 2472 }, createdBy: IDS.ownerA,
    }),
  );
  check("도면이 BOM 스냅샷을 참조한다 (약함 #2)", d1.bomRunId === run.id);
  check("첫 도면은 Rev A", d1.currentRev === "A", d1.currentRev);

  const d2 = await withTenant(IDS.tenantA, (tx) =>
    saveDrawing(tx, {
      stableId: NODE, bomRunId: run.id, drawingNo: "TEST-PLN", drawingType: "plan",
      code: run.code, dxf: "0\nSECTION\nW=2600\n", meta: { widthMm: 2600 }, createdBy: IDS.ownerA,
    }),
  );
  check("다시 뜨면 Rev B 가 붙는다", d2.currentRev === "B", d2.currentRev);
  const both = await withTenant(IDS.tenantA, (tx) => listDrawings(tx, NODE));
  check("앞 개정이 남아 전후 비교가 된다", both.filter((d) => d.drawingNo === "TEST-PLN").length === 2);

  // --- 4) 상태 전이와 발행 잠금 ---------------------------------------------
  await withTenant(IDS.tenantA, (tx) => setDrawingStatus(tx, { id: d1.id, status: "review", actorId: IDS.ownerA }));
  await withTenant(IDS.tenantA, (tx) => setDrawingStatus(tx, { id: d1.id, status: "approved", actorId: IDS.ownerA }));
  const back = await throws(() =>
    withTenant(IDS.tenantA, (tx) => setDrawingStatus(tx, { id: d1.id, status: "draft", actorId: IDS.ownerA })),
  );
  check("상태는 되돌릴 수 없다", back instanceof DrawingStatusBackwardsError);

  const issued = await withTenant(IDS.tenantA, (tx) => setDrawingStatus(tx, { id: d1.id, status: "issued", actorId: IDS.ownerA }));
  check("발행까지 올라간다", issued.status === "issued");

  const locked = await throws(() =>
    withTenant(IDS.tenantA, (tx) => setDrawingStatus(tx, { id: d1.id, status: "issued", actorId: IDS.ownerA })),
  );
  check("발행된 도면은 도메인 규칙이 막는다", locked instanceof DrawingLockedError);

  // 앱을 우회해 직접 UPDATE 해도 DB 트리거가 막는다 — 이게 진짜 잠금이다.
  const raw = await throws(() =>
    withTenant(IDS.tenantA, (tx) => tx.drawing.update({ where: { id: d1.id }, data: { scale: "1:100" } })),
  );
  check("앱을 우회한 직접 수정도 DB 가 거부한다", raw !== null && /issued/.test(String(raw)));
  const del = await throws(() =>
    withTenant(IDS.tenantA, (tx) => tx.drawing.delete({ where: { id: d1.id } })),
  );
  check("발행된 도면은 삭제도 거부된다", del !== null && /issued/.test(String(del)));

  // --- 5) 테넌트 경계 --------------------------------------------------------
  const seenByB = await withTenant(IDS.tenantB, (tx) => listDrawings(tx));
  check("RLS: 테넌트 B 는 A 의 도면을 못 본다", !seenByB.some((d) => d.id === d1.id));

  // 정리 (발행 잠금 때문에 트리거를 내리고 지운다 — 검증용 잔재만)
  await adminPrisma.$executeRawUnsafe(`ALTER TABLE "drawing" DISABLE TRIGGER USER`);
  await adminPrisma.drawing.deleteMany({ where: { drawingNo: "TEST-PLN" } });
  await adminPrisma.$executeRawUnsafe(`ALTER TABLE "drawing" ENABLE TRIGGER USER`);
  await adminPrisma.bomCodeRun.deleteMany({ where: { catalogFp: "test" } });

  console.log(fail === 0 ? `\nALL PASS (${pass})` : `\n${fail} FAILED / ${pass} passed`);
  await appPrisma.$disconnect();
  await adminPrisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
