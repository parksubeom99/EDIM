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

  // 0036 · ccmd K · KC-3 — 설계 심볼 배치: 발행 전에는 놓인다 · 다른 회사 도면 · 심볼을 가리키면 DB 가 막는다
  const symA = await withTenant(IDS.tenantA, (tx) => tx.designSymbol.findFirst({ where: { key: "fan" } }));
  check("0036: 샘플 심볼(팬)이 회사 A 라이브러리에 있다", !!symA && symA.isSample);
  const placed = await withTenant(IDS.tenantA, (tx) =>
    tx.drawingSymbol.create({ data: { tenantId: IDS.tenantA, drawingId: d1.id, symbolId: symA!.id, x: 100, y: 200, createdBy: IDS.ownerA } }));
  check("0036: 발행 전 도면에는 심볼이 놓인다", !!placed.id);
  const crossB = await throws(() => withTenant(IDS.tenantB, async (tx) => {
    const sb = await tx.designSymbol.findFirst({ where: { key: "fan" } });
    return tx.drawingSymbol.create({ data: { tenantId: IDS.tenantB, drawingId: d1.id, symbolId: sb!.id, x: 0, y: 0, createdBy: IDS.ownerB } });
  }));
  // 외래 키 검사(FORCE RLS 아래)나 트리거 중 먼저 걸리는 쪽이 막는다 — 어느 쪽이든 행은 생기지 않는다
  check("0036: 회사 B 는 A 의 도면에 심볼을 놓지 못한다(외래 키 · 트리거)", crossB !== null && /not found in this tenant|Foreign key constraint/i.test(String(crossB)), String(crossB).slice(-200));
  const symB = await adminPrisma.designSymbol.findFirst({ where: { tenantId: IDS.tenantB, key: "fan" } });
  const crossSym = await throws(() => withTenant(IDS.tenantA, (tx) =>
    tx.drawingSymbol.create({ data: { tenantId: IDS.tenantA, drawingId: d1.id, symbolId: symB!.id, x: 0, y: 0, createdBy: IDS.ownerA } })));
  check("0036: 다른 회사 심볼 id 로는 놓지 못한다", crossSym !== null && /not found in this tenant/.test(String(crossSym)), String(crossSym).slice(0, 120));
  const libWrite = await throws(() => withTenant(IDS.tenantA, (tx) => tx.designSymbol.update({ where: { id: symA!.id }, data: { name: "x" } })));
  check("0036: 앱 역할은 심볼 라이브러리를 고치지 못한다(SELECT 만)", libWrite !== null && /permission denied/i.test(String(libWrite)), String(libWrite).slice(0, 120));

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
  const symIns = await throws(() => withTenant(IDS.tenantA, (tx) =>
    tx.drawingSymbol.create({ data: { tenantId: IDS.tenantA, drawingId: d1.id, symbolId: symA!.id, x: 1, y: 1, createdBy: IDS.ownerA } })));
  const symUpd = await throws(() => withTenant(IDS.tenantA, (tx) => tx.drawingSymbol.update({ where: { id: placed.id }, data: { x: 999 } })));
  const symDel = await throws(() => withTenant(IDS.tenantA, (tx) => tx.drawingSymbol.delete({ where: { id: placed.id } })));
  check("0036: 발행된 도면의 심볼은 놓기 · 옮기기 · 지우기 모두 DB 가 거부한다(앱 우회)", [symIns, symUpd, symDel].every((e) => e !== null && /issued/.test(String(e))));
  const seenSymB = await withTenant(IDS.tenantB, (tx) => tx.drawingSymbol.count({ where: { drawingId: d1.id } }));
  check("0036: RLS — 회사 B 에게 A 도면의 심볼은 0건", seenSymB === 0);

  // --- 5) 테넌트 경계 --------------------------------------------------------
  const seenByB = await withTenant(IDS.tenantB, (tx) => listDrawings(tx));
  check("RLS: 테넌트 B 는 A 의 도면을 못 본다", !seenByB.some((d) => d.id === d1.id));

  // 0011: 치수는 스냅샷에 박힌다 — 저장한 값이 그대로 읽히고, 없으면(0011 이전) null 이다.
  const withDims = await withTenant(IDS.tenantA, (tx) =>
    saveBomCodeRun(tx, { stableId: IDS.a_proj, code: "EU-55-TEST", slots: { A: "EU", B: "55" }, macroValue: null, parentCode: "EU", catalogFp: "fp-dims", lines: [], cost: { total: 0 }, dims: { W: 2472, H: 2472, L: 900, item: "55", tableName: "dim" }, createdBy: IDS.ownerA }),
  );
  const rd = await withTenant(IDS.tenantA, (tx) => tx.bomCodeRun.findFirst({ where: { id: withDims.id } }));
  const dm = (rd?.dims ?? null) as { W?: number; item?: string } | null;
  check("0011: 스냅샷에 치수가 박힌다 (W=2472 · item 55)", dm?.W === 2472 && dm?.item === "55");
  const noDims = await withTenant(IDS.tenantA, (tx) =>
    saveBomCodeRun(tx, { stableId: IDS.a_proj, code: "EU-55-TEST2", slots: { A: "EU", B: "55" }, macroValue: null, parentCode: "EU", catalogFp: "fp-dims", lines: [], cost: { total: 0 }, createdBy: IDS.ownerA }),
  );
  const rn = await withTenant(IDS.tenantA, (tx) => tx.bomCodeRun.findFirst({ where: { id: noDims.id } }));
  check("0011: 치수 없이 뜬 스냅샷은 dims 가 null (도면 입구가 422 로 거부할 근거)", rn?.dims === null);

  // 0012: 3각법 — front·right 는 DB 가 받아들이고, 목록 밖 값은 CHECK 가 막는다.
  const front = await withTenant(IDS.tenantA, (tx) =>
    saveDrawing(tx, { stableId: IDS.a_proj, bomRunId: withDims.id, drawingNo: "TEST-FRT", drawingType: "front", code: "EU-55-TEST", dxf: "0\nEOF\n", meta: { type: "front" }, createdBy: IDS.ownerA }),
  );
  check("0012: 정면도(front) 가 저장된다", front.drawingType === "front");
  const right = await withTenant(IDS.tenantA, (tx) =>
    saveDrawing(tx, { stableId: IDS.a_proj, bomRunId: withDims.id, drawingNo: "TEST-RHT", drawingType: "right", code: "EU-55-TEST", dxf: "0\nEOF\n", meta: { type: "right" }, createdBy: IDS.ownerA }),
  );
  check("0012: 우측면도(right) 가 저장된다", right.drawingType === "right");
  for (const t of ["iso", "exploded"] as const) {
    const row = await withTenant(IDS.tenantA, (tx) =>
      saveDrawing(tx, { stableId: IDS.a_proj, bomRunId: withDims.id, drawingNo: `TEST-${t.toUpperCase()}`, drawingType: t, code: "EU-55-TEST", dxf: "0\nEOF\n", meta: { type: t }, createdBy: IDS.ownerA }),
    );
    check(`0013: 3D 투영 ${t} 가 저장된다`, row.drawingType === t);
  }
  let badBlocked = false;
  try {
    await adminPrisma.$executeRawUnsafe(
      `INSERT INTO "drawing" (tenant_id, bom_run_id, drawing_no, drawing_type, code, dxf, created_by)
       VALUES ('${IDS.tenantA}','${withDims.id}','TEST-BAD','gltf_3d','EU-55-TEST','0\nEOF\n','${IDS.ownerA}')`,
    );
  } catch { badBlocked = true; }
  check("0013: 목록 밖 종류(gltf_3d · 실제 형상 모델은 미착수)는 DB 가 거부한다 — 앱을 우회해도", badBlocked);

  // 정리 (발행 잠금 때문에 트리거를 내리고 지운다 — 검증용 잔재만)
  await adminPrisma.$executeRawUnsafe(`ALTER TABLE "drawing" DISABLE TRIGGER USER`);
  await adminPrisma.$executeRawUnsafe(`ALTER TABLE "drawing_symbol" DISABLE TRIGGER USER`);
  await adminPrisma.drawingSymbol.deleteMany({ where: { drawingId: d1.id } });
  await adminPrisma.$executeRawUnsafe(`ALTER TABLE "drawing_symbol" ENABLE TRIGGER USER`);
  await adminPrisma.drawing.deleteMany({ where: { drawingNo: { in: ["TEST-PLN", "TEST-FRT", "TEST-RHT", "TEST-ISO", "TEST-EXPLODED"] } } });
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
