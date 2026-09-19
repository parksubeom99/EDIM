import { NextResponse, type NextRequest } from "next/server";
import { withTenant, upsertProductCode } from "@edim/db";
import { parseTables, parseSections } from "@/app/lib/catalog";
import { guard, str, dbError } from "../_guard";

/**
 * p33 Product Code Registration — POST upserts by `code`. The "Edit Table" of
 * p32/p33 is the `tables` field: { name: { by: slot, default, rows: { slotValue: { col: cell } } } }.
 * Shape is validated here; a bad shape is refused (400), never stored.
 */
export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = str(b.code, 40), name = str(b.name, 120), kind = str(b.kind, 10);
  if (!code || !name || !["product", "part", "purchase"].includes(kind))
    return NextResponse.json({ error: "code · name · kind(product|part|purchase) 필수" }, { status: 400 });
  const tables = parseTables(b.tables);
  if (tables === "invalid") return NextResponse.json({ error: "tables 형식 오류" }, { status: 400 });
  const sections = parseSections(b.sections);
  if (sections === "invalid") return NextResponse.json({ error: "sections 형식 오류" }, { status: 400 });
  try {
    const row = await withTenant(g.session.tenantId, (tx) =>
      upsertProductCode(tx, {
        code, name, kind: kind as "product" | "part" | "purchase", category: str(b.category, 120), unit: str(b.unit, 12) || "ea",
        specTemplate: str(b.specTemplate, 400), materialTemplate: str(b.materialTemplate, 120),
        tables: tables as unknown as object, sections: sections ? (sections as unknown as object[]) : null, createdBy: g.session.userId,
      }),
    );
    return NextResponse.json({ ok: true, id: row.id, code: row.code });
  } catch (e) { return dbError(e); }
}
