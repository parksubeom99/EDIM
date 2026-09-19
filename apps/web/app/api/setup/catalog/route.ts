import { NextResponse } from "next/server";
import { loadCatalog, canEditCatalog } from "@/app/lib/catalog";
import { catalogFingerprint } from "@edim/bom-code";
import { guard } from "../_guard";

/** GET — the tenant's whole BOM Code Set-Up (p31 · p33 · p34) with row ids for editing. */
export async function GET() {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const { catalog, rejected, rows } = await loadCatalog(g.session.tenantId);
  return NextResponse.json({
    canEdit: canEditCatalog(g.session.role),
    fingerprint: catalogFingerprint(catalog),
    rejected,
    subCodes: rows.subCodes.map((s) => ({ id: s.id, group: s.groupName, itemKey: s.itemKey, itemName: s.itemName, seq: s.seq, value: s.value, description: s.description })),
    productCodes: catalog.productCodes,
    relationships: rows.relationships.map((r) => ({ id: r.id, parent: r.parentCode, child: r.childCode, seq: r.seq, section: r.section, qty: r.qty, unitCost: r.unitCost, when: r.whenCond, remarks: r.remarks })),
  });
}
