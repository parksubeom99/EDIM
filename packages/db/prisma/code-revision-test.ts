import { appPrisma } from "../src/client";
import { withTenant } from "../src/tenant";
import { saveRevision, listRevisions, getCurrentRevision, revLabel } from "../src/code-revision";
import { seedAll, IDS } from "./seed";

/**
 * Tier B verification — code_revision: append-only, monotonic rev_no, tenant
 * isolation (RLS), letter labels. Run: pnpm --filter @edim/db revision:test
 */
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  PASS  ${name}`);
  else { console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); failures++; }
}

async function main() {
  await seedAll();
  await appPrisma.$executeRawUnsafe(`DELETE FROM code_revision`).catch(() => undefined);

  check("revLabel 1→A 26→Z 27→AA", revLabel(1) === "A" && revLabel(26) === "Z" && revLabel(27) === "AA");

  const a1 = await withTenant(IDS.tenantA, (tx) => saveRevision(tx, { stableId: IDS.a_proj, code: "EU-55-2123", slots: { A: "EU", B: "55", C: "2123" }, reason: "initial", createdBy: IDS.ownerA }));
  const a2 = await withTenant(IDS.tenantA, (tx) => saveRevision(tx, { stableId: IDS.a_proj, code: "EU-55-2123-630SS", slots: { A: "EU", B: "55", C: "2123", D: "630", E: "SS" }, reason: "add rotor + SS", createdBy: IDS.ownerA }));
  check("rev_no monotonic 1 → 2", a1.revNo === 1 && a2.revNo === 2, `${a1.revNo},${a2.revNo}`);

  const cur = await withTenant(IDS.tenantA, (tx) => getCurrentRevision(tx, IDS.a_proj));
  check("current = highest rev (B, 630SS)", cur?.revNo === 2 && cur.code === "EU-55-2123-630SS");

  const list = await withTenant(IDS.tenantA, (tx) => listRevisions(tx, IDS.a_proj));
  check("history keeps both (desc order)", list.length === 2 && list[0]?.revNo === 2 && list[1]?.revNo === 1);

  const fromB = await withTenant(IDS.tenantB, (tx) => listRevisions(tx, IDS.a_proj));
  check("RLS: tenant B sees 0 of tenant A's revisions", fromB.length === 0, `${fromB.length}`);

  let updateBlocked = false;
  try {
    await withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(`UPDATE code_revision SET code = 'X' WHERE id = '${a1.id}'`));
  } catch { updateBlocked = true; }
  const still = await withTenant(IDS.tenantA, (tx) => getCurrentRevision(tx, IDS.a_proj));
  check("append-only: app role cannot UPDATE (permission denied)", updateBlocked && still?.code === "EU-55-2123-630SS");

  let deleteBlocked = false;
  try { await withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(`DELETE FROM code_revision`)); } catch { deleteBlocked = true; }
  check("append-only: app role cannot DELETE", deleteBlocked);

  const audit = await withTenant(IDS.tenantA, (tx) => tx.auditLog.count({ where: { action: "code.revision" } }));
  check("audit_log has 2 code.revision rows", audit === 2, `${audit}`);

  console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
