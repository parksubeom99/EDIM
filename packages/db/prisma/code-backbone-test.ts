/**
 * code-backbone-test.ts — P1 DB 검증 (pnpm --filter @edim/db backbone:test).
 * RLS 격리 · FK(등록 안 된 child 거부, 쓰이는 child 삭제 거부) · 스냅샷 append-only · 시드 수량.
 */
import { withTenant } from "../src/tenant";
import { appPrisma } from "../src/client";
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
  check("seed: 18 sub codes", a.subCodes.length === 18, String(a.subCodes.length));
  check("seed: 16 product codes", a.productCodes.length === 16, String(a.productCodes.length));
  check("seed: 39 relationships", a.relationships.length === 39, String(a.relationships.length));

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

  console.log(fail === 0 ? `\nALL PASS (${pass})` : `\n${fail} FAILED / ${pass} passed`);
  await appPrisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
