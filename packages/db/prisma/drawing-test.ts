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
  saveDrawing, listDrawings, setDrawingStatus, latestRevisionId, revisionIdForSlots,
  DrawingLockedError, DrawingStatusBackwardsError,
} from "../src/drawing";
import { requestApproval, decideApproval } from "../src/project";
import { BomNotApprovedError } from "../src/approval-gate";
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

/** P6: 발행·발주는 승인된 BOM 에서만 → 테스트도 같은 길로 승인을 받는다(요청 → 결정). */
const approveRun = (runId: string) =>
  withTenant(IDS.tenantA, async (tx) => {
    const id = await requestApproval(tx, IDS.projectA, IDS.ownerA, "tier:org · test", runId);
    await decideApproval(tx, id, "approved", IDS.ownerA, "tier:org · approved");
    return id;
  });

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

  // P4-b 에서 고친 규칙: 근거로 박는 개정은 "최신"이 아니라 **그 슬롯으로 저장된** 개정이다.
  const { saveRevision } = await import("../src/code-revision");
  const mkRev = (slots: Record<string, string>, code: string) =>
    withTenant(IDS.tenantA, (tx) => saveRevision(tx, { stableId: NODE, code, slots, reason: "drawing-test", createdBy: IDS.ownerA }));
  const rSS = await mkRev({ A: "EU", B: "12", E: "SS" }, "TEST-EU-12-SS");
  const rAL = await mkRev({ A: "EU", B: "12", E: "AL" }, "TEST-EU-12-AL");
  const forSS = await withTenant(IDS.tenantA, (tx) => revisionIdForSlots(tx, NODE, { A: "EU", B: "12", E: "SS", D: "" }));
  const forNone = await withTenant(IDS.tenantA, (tx) => revisionIdForSlots(tx, NODE, { A: "EU", B: "12", E: "ZZ" }));
  check("최신 개정(AL)이 있어도 SS 로 돌리면 SS 개정이 근거다", forSS === rSS.id && forSS !== rAL.id, `${String(forSS)}`);
  check("저장한 적 없는 조합은 근거 개정이 없다 (null — 최신을 대신 박지 않는다)", forNone === null, String(forNone));

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

  // P6 — 승인되지 않은 BOM 에서 나온 도면은 발행할 수 없다
  const noAp = await throws(() => withTenant(IDS.tenantA, (tx) => setDrawingStatus(tx, { id: d1.id, status: "issued", actorId: IDS.ownerA })));
  check("P6 승인 전에는 발행이 거부된다 (도메인)", noAp instanceof BomNotApprovedError);
  const noApRaw = await throws(() => withTenant(IDS.tenantA, (tx) => tx.drawing.update({ where: { id: d1.id }, data: { status: "issued" } })));
  check("P6 앱을 우회해 발행해도 DB 가 거부한다", noApRaw !== null && /not approved/.test(String(noApRaw)));
  await approveRun(d1.bomRunId);

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
  await adminPrisma.projectApproval.deleteMany({ where: { note: { contains: "· test" } } });
  await adminPrisma.projectApproval.deleteMany({ where: { bomRun: { catalogFp: "test" } } });
  await adminPrisma.bomCodeRun.deleteMany({ where: { catalogFp: "test" } });
  await adminPrisma.codeRevision.deleteMany({ where: { code: { startsWith: "TEST-EU-12-" } } });

  console.log(fail === 0 ? `\nALL PASS (${pass})` : `\n${fail} FAILED / ${pass} passed`);
  await appPrisma.$disconnect();
  await adminPrisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
