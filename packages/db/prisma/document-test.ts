/**
 * document-test.ts — P4-b DB 검증 (pnpm --filter @edim/db document:test).
 *
 * 확인하는 것:
 *  1. 스냅샷에 **어느 승인 매크로 몇 번째 개정**으로 돌렸는지가 박힌다
 *  2. 문서는 스냅샷을 참조하고, 번호 머리 뒤에 순번이 붙고, 다시 뜨면 개정이 붙는다
 *  3. 문서 상태는 한 방향, 발행은 잠긴다 — **DB 트리거가** 막는다(수정·삭제)
 *  4. 구매 요청: 줄이 그대로 들어가고, 한 스냅샷에 하나, Process 한 방향,
 *     발주하면 PO 번호가 붙고 머리·줄이 잠긴다
 *  5. 테넌트 경계(RLS). (플랫폼 역할의 열람 차단은 경계의 SSOT 인 platform:test 가 본다)
 */
import { withTenant } from "../src/tenant";
import { appPrisma, adminPrisma } from "../src/client";
import { saveBomCodeRun } from "../src/code-catalog";
import {
  saveDocument, listDocuments, setDocumentStatus, DocumentLockedError, DocumentStatusBackwardsError,
} from "../src/document";
import {
  createPurchaseRequest, listPurchaseRequests, setPurchaseRequestStatus,
  PrDuplicateError, PrEmptyError, PrLockedError, PrBackwardsError,
} from "../src/purchase";
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
const FP = "test-p4b";
const MACRO = "b0000000-0000-4000-8000-0000000000aa";

const mkRun = (code: string) =>
  withTenant(IDS.tenantA, (tx) =>
    saveBomCodeRun(tx, {
      stableId: NODE, code, slots: { A: "EU", B: "55" }, macroValue: 455.4, parentCode: "EU", catalogFp: FP,
      lines: [{ no: 1, kind: "part", part: "Panel" }, { no: 2, kind: "purchase", part: "Pre filter" }],
      cost: { material: 1000, labor: 180, overhead: 142, total: 1322, currency: "KRW" },
      macroId: MACRO, macroRevision: 2, macroDsl: "=Table1(A,2:2)*82.8", createdBy: IDS.ownerA,
    }),
  );
const LINES = [
  { bomLineNo: 2, childCode: "PFP 1", resolvedCode: "PFP 1-13", part: "Pre filter", spec: "MERV 8", qty: 17, unit: "ea", unitPrice: 18000 },
  { bomLineNo: 9, childCode: "PVF 1", resolvedCode: "PVF 1", part: "Inverter", spec: "11kW VFD", qty: 1, unit: "ea", unitPrice: 541000 },
];

async function cleanup(): Promise<void> {
  for (const t of ["document", "purchase_request", "purchase_request_line"])
    await adminPrisma.$executeRawUnsafe(`ALTER TABLE "${t}" DISABLE TRIGGER USER`);
  const runs = await adminPrisma.bomCodeRun.findMany({ where: { catalogFp: FP }, select: { id: true } });
  const ids = runs.map((r) => r.id);
  await adminPrisma.document.deleteMany({ where: { bomRunId: { in: ids } } });
  await adminPrisma.purchaseRequest.deleteMany({ where: { bomRunId: { in: ids } } });
  for (const t of ["document", "purchase_request", "purchase_request_line"])
    await adminPrisma.$executeRawUnsafe(`ALTER TABLE "${t}" ENABLE TRIGGER USER`);
  await adminPrisma.bomCodeRun.deleteMany({ where: { catalogFp: FP } });
}

async function main(): Promise<void> {
  await cleanup(); // 지난 실행이 중간에 죽었어도 다시 돌 수 있게

  // --- 1) 스냅샷에 매크로 출처 --------------------------------------------------
  const run = await mkRun("TEST-P4B-1");
  check("스냅샷에 매크로 id·개정·원문이 박힌다", run.macroId === MACRO && run.macroRevision === 2 && run.macroDsl === "=Table1(A,2:2)*82.8");

  // --- 2) 문서 번호와 개정 ------------------------------------------------------
  const body = (docNo: string, rev: string) => ({ kind: "quotation", docNo, rev, total: 1322 });
  const mk = (runId: string, code: string, docType: "quotation" | "techdata" = "quotation") =>
    withTenant(IDS.tenantA, (tx) => saveDocument(tx, { stableId: NODE, bomRunId: runId, docType, noPrefix: docType === "quotation" ? "QR-TEST" : "TD-TEST", code, body, createdBy: IDS.ownerA }));
  const q1 = await mk(run.id, run.code);
  check("문서가 BOM 스냅샷을 참조한다", q1.bomRunId === run.id);
  check("첫 견적은 머리-01 · Rev A", q1.docNo === "QR-TEST-01" && q1.currentRev === "A", `${q1.docNo} ${q1.currentRev}`);
  check("본문 안에 정해진 번호·개정이 들어간다", (q1.body as { docNo: string; rev: string }).docNo === "QR-TEST-01" && (q1.body as { rev: string }).rev === "A");
  const q2 = await mk(run.id, run.code);
  check("같은 코드로 다시 뜨면 같은 번호에 Rev B", q2.docNo === "QR-TEST-01" && q2.currentRev === "B", `${q2.docNo} ${q2.currentRev}`);
  const run2 = await mkRun("TEST-P4B-2");
  const q3 = await mk(run2.id, run2.code);
  check("다른 코드는 다음 순번(-02) · Rev A", q3.docNo === "QR-TEST-02" && q3.currentRev === "A", `${q3.docNo} ${q3.currentRev}`);
  const t1 = await mk(run.id, run.code, "techdata");
  check("문서 종류마다 번호 머리가 따로 돈다 (TD-…-01)", t1.docNo === "TD-TEST-01" && t1.currentRev === "A", t1.docNo);
  const listed = await withTenant(IDS.tenantA, (tx) => listDocuments(tx, NODE));
  check("앞 개정이 남는다", listed.filter((d) => d.docNo === "QR-TEST-01").length === 2);

  // --- 3) 상태 전이와 발행 잠금 -------------------------------------------------
  const to = (id: string, status: "draft" | "review" | "approved" | "issued") =>
    withTenant(IDS.tenantA, (tx) => setDocumentStatus(tx, { id, status, actorId: IDS.ownerA }));
  await to(q1.id, "review"); await to(q1.id, "approved");
  check("문서 상태는 되돌릴 수 없다", (await throws(() => to(q1.id, "draft"))) instanceof DocumentStatusBackwardsError);
  check("발행까지 올라간다", (await to(q1.id, "issued")).status === "issued");
  check("발행된 문서는 도메인 규칙이 막는다", (await throws(() => to(q1.id, "issued"))) instanceof DocumentLockedError);
  const raw = await throws(() => withTenant(IDS.tenantA, (tx) => tx.document.update({ where: { id: q1.id }, data: { body: { total: 1 } } })));
  check("앱을 우회해 금액을 고쳐도 DB 가 거부한다", raw !== null && /issued/.test(String(raw)));
  const del = await throws(() => withTenant(IDS.tenantA, (tx) => tx.document.delete({ where: { id: q1.id } })));
  check("발행된 문서는 삭제도 거부된다", del !== null && /issued/.test(String(del)));
  const rawBack = await throws(() => withTenant(IDS.tenantA, (tx) => tx.document.update({ where: { id: q2.id }, data: { status: "review" } }).then(() => tx.document.update({ where: { id: q2.id }, data: { status: "draft" } }))));
  check("앱을 우회한 상태 역행도 DB 가 거부한다", rawBack !== null && /backwards/.test(String(rawBack)));

  // --- 4) 구매 요청 -------------------------------------------------------------
  const prIn = { stableId: NODE, bomRunId: run.id, noCore: "TEST", projectNo: "PS-TEST-1", code: run.code, requiredDate: new Date("2026-10-01T00:00:00Z"), remarks: null, lines: LINES, createdBy: IDS.ownerA };
  const pr = await withTenant(IDS.tenantA, (tx) => createPurchaseRequest(tx, prIn));
  check("구매 요청 번호 PR-머리-1", pr.prNo === "PR-TEST-1", pr.prNo);
  check("줄 수·값이 넣은 그대로다", pr.lines.length === 2 && pr.lines[0]!.qty === 17 && pr.lines[1]!.unitPrice === 541000 && pr.lines[0]!.bomLineNo === 2);
  check("한 스냅샷에 구매 요청은 하나 (도메인)", (await throws(() => withTenant(IDS.tenantA, (tx) => createPurchaseRequest(tx, prIn)))) instanceof PrDuplicateError);
  const rawDup = await throws(() => withTenant(IDS.tenantA, (tx) => tx.purchaseRequest.create({ data: { tenantId: IDS.tenantA, bomRunId: run.id, prNo: "PR-TEST-99", code: "x", createdBy: IDS.ownerA } })));
  check("한 스냅샷에 구매 요청은 하나 (DB unique)", rawDup !== null && /Unique|unique/.test(String(rawDup)));
  check("구매 품목이 없으면 만들지 않는다", (await throws(() => withTenant(IDS.tenantA, (tx) => createPurchaseRequest(tx, { ...prIn, bomRunId: run2.id, lines: [] })))) instanceof PrEmptyError);
  const pr2 = await withTenant(IDS.tenantA, (tx) => createPurchaseRequest(tx, { ...prIn, bomRunId: run2.id }));
  check("다음 구매 요청은 다음 순번", pr2.prNo === "PR-TEST-2", pr2.prNo);

  const ps = (id: string, status: "draft" | "rfq" | "ordered") =>
    withTenant(IDS.tenantA, (tx) => setPurchaseRequestStatus(tx, { id, status, actorId: IDS.ownerA }));
  const rfq = await ps(pr.id, "rfq");
  check("견적 요청 단계에는 PO 번호가 없다", rfq.status === "rfq" && rfq.poNo === null);
  check("Process 는 되돌릴 수 없다", (await throws(() => ps(pr.id, "draft"))) instanceof PrBackwardsError);
  const ord = await ps(pr.id, "ordered");
  check("발주하면 PO 번호가 붙는다", ord.status === "ordered" && ord.poNo === "PO-TEST-1", String(ord.poNo));
  check("발주된 구매 요청은 도메인 규칙이 막는다", (await throws(() => ps(pr.id, "ordered"))) instanceof PrLockedError);
  const rawPr = await throws(() => withTenant(IDS.tenantA, (tx) => tx.purchaseRequest.update({ where: { id: pr.id }, data: { remarks: "x" } })));
  check("발주 후 머리 직접 수정은 DB 가 거부한다", rawPr !== null && /ordered/.test(String(rawPr)));
  const rawLine = await throws(() => withTenant(IDS.tenantA, (tx) => tx.purchaseRequestLine.updateMany({ where: { prId: pr.id }, data: { qty: 999 } })));
  check("발주 후 줄 수량 직접 수정도 DB 가 거부한다", rawLine !== null && /ordered/.test(String(rawLine)));
  const rawPo = await throws(() => withTenant(IDS.tenantA, (tx) => tx.purchaseRequest.update({ where: { id: pr2.id }, data: { poNo: "PO-FAKE-1" } })));
  check("발주 전에 PO 번호만 끼워 넣을 수 없다 (DB check)", rawPo !== null);

  // --- 5) 경계 ------------------------------------------------------------------
  const docsB = await withTenant(IDS.tenantB, (tx) => listDocuments(tx));
  const prsB = await withTenant(IDS.tenantB, (tx) => listPurchaseRequests(tx));
  check("RLS: 테넌트 B 는 A 의 문서·구매 요청을 못 본다", !docsB.some((d) => d.id === q1.id) && !prsB.some((p) => p.id === pr.id));

  await cleanup();
  console.log(fail === 0 ? `\nALL PASS (${pass})` : `\n${fail} FAILED / ${pass} passed`);
  await appPrisma.$disconnect();
  await adminPrisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
