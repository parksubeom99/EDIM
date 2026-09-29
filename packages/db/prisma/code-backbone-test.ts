/**
 * code-backbone-test.ts — P1 DB 검증 (pnpm --filter @edim/db backbone:test).
 * RLS 격리 · FK(등록 안 된 child 거부, 쓰이는 child 삭제 거부) · 스냅샷 append-only · 시드 수량.
 */
import { withTenant } from "../src/tenant";
import { appPrisma, adminPrisma } from "../src/client";
import { loadCatalogRows, addRelationship, upsertProductCode, saveBomCodeRun, listBomCodeRuns } from "../src/code-catalog";
import { IDS } from "./seed";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}
async function throws(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

async function main(): Promise<void> {
  const a = await withTenant(IDS.tenantA, (tx) => loadCatalogRows(tx));
  check("seed: 19 sub codes (18 + ccmd K 샘플 SPF)", a.subCodes.length === 19, String(a.subCodes.length));
  check("seed: 20 product codes (16 + ccmd K 샘플 SPF · SCS 1 · SFN 1 · SMT 1)", a.productCodes.length === 20, String(a.productCodes.length));
  check("seed: 42 relationships (39 + ccmd K 샘플 SPF 3)", a.relationships.length === 42, String(a.relationships.length));

  const b = await withTenant(IDS.tenantB, (tx) => loadCatalogRows(tx));
  check("RLS: tenant B sees no tenant-A catalog", b.subCodes.length + b.productCodes.length + b.relationships.length === 0);

  check("FK: relationship to an unregistered child is refused", await throws(() =>
    withTenant(IDS.tenantA, (tx) => addRelationship(tx, { parentCode: "EU", childCode: "NOPE 9", section: "Fan", qty: { lit: 1 }, unitCost: { lit: 1 }, createdBy: IDS.ownerA }))));
  check("FK: a child code in use cannot be deleted", await throws(() =>
    withTenant(IDS.tenantA, (tx) => tx.productCode.delete({ where: { tenantId_code: { tenantId: IDS.tenantA, code: "KFP 1" } } }))));
  check("CHECK: a code cannot be its own child", await throws(() =>
    withTenant(IDS.tenantA, (tx) => addRelationship(tx, { parentCode: "EU", childCode: "EU", section: "Fan", qty: { lit: 1 }, unitCost: { lit: 1 }, createdBy: IDS.ownerA }))));

  const before = await withTenant(IDS.tenantA, (tx) => tx.productCode.findUniqueOrThrow({ where: { tenantId_code: { tenantId: IDS.tenantA, code: "PVF 1" } } }));
  const up = await withTenant(IDS.tenantA, (tx) => upsertProductCode(tx, { code: "PVF 1", name: before.name, kind: "purchase", category: before.category, unit: before.unit, specTemplate: before.specTemplate, materialTemplate: before.materialTemplate, tables: before.tables as object, createdBy: IDS.ownerA }));
  check("upsert keeps one row per code", up.id === before.id);

  const run = await withTenant(IDS.tenantA, (tx) => saveBomCodeRun(tx, { stableId: IDS.a_proj, code: "EU-10-0480", slots: { A: "EU", B: "10", C: "0480" }, parentCode: "EU", catalogFp: "test", lines: [], cost: {}, source: "backbone-test", createdBy: IDS.ownerA }));
  const listed = await withTenant(IDS.tenantA, (tx) => listBomCodeRuns(tx, IDS.a_proj));
  check("snapshot saved and listed", listed.some((r) => r.id === run.id));
  const listedB = await withTenant(IDS.tenantB, (tx) => listBomCodeRuns(tx, IDS.a_proj));
  check("RLS: tenant B cannot read tenant-A snapshots", listedB.length === 0);
  check("append-only: app role cannot UPDATE a snapshot", await throws(() =>
    withTenant(IDS.tenantA, (tx) => tx.bomCodeRun.update({ where: { id: run.id }, data: { code: "tampered" } }))));
  check("append-only: app role cannot DELETE a snapshot", await throws(() =>
    withTenant(IDS.tenantA, (tx) => tx.bomCodeRun.delete({ where: { id: run.id } }))));
  const audit = await withTenant(IDS.tenantA, (tx) => tx.auditLog.count({ where: { entity: "bom_code_run", entityId: run.id } }));
  check("audit: run is logged", audit === 1);

  // 2026-09-23 수리: 구획 없는 코드를 저장해도 sections 가 `{}` 로 남지 않는다(카탈로그 탈락 원인).
  await withTenant(IDS.tenantA, (tx) =>
    upsertProductCode(tx, { code: "TST-BUY", name: "테스트 구매품", kind: "purchase", category: "t", unit: "ea", specTemplate: "", materialTemplate: "", tables: {}, createdBy: IDS.ownerA }),
  );
  const saved = await adminPrisma.productCode.findFirst({ where: { code: "TST-BUY" }, select: { sections: true } });
  check("구획 없는 코드의 sections 는 빈 배열이다 (`{}` 가 아니다 — 카탈로그 탈락 방지)", Array.isArray(saved?.sections) && (saved!.sections as unknown[]).length === 0);
  await adminPrisma.productCode.deleteMany({ where: { code: "TST-BUY" } });

  console.log(fail === 0 ? `\nALL PASS (${pass})` : `\n${fail} FAILED / ${pass} passed`);
  await appPrisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
