import { NextResponse, type NextRequest } from "next/server";
import { runBomCode, catalogFingerprint, type SlotValues } from "@edim/bom-code";
import { loadCatalog } from "@/app/lib/catalog";
import { guard } from "../_guard";

/** p34 "Part List Running Test" — pick slot values → Run. Read-only: no snapshot is written. */
export async function POST(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as { slots?: unknown; macroValue?: unknown };
  const slots = (b.slots && typeof b.slots === "object" ? b.slots : {}) as SlotValues;
  const macroValue = typeof b.macroValue === "number" ? b.macroValue : null;
  const { catalog, rejected } = await loadCatalog(g.session.tenantId);
  const r = runBomCode(catalog, slots, macroValue);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error, rejected }, { status: 422 });
  return NextResponse.json({ ok: true, parent: r.parent, mainCode: r.mainCode, sections: r.sections, lines: r.lines, fingerprint: catalogFingerprint(catalog), rejected });
}
