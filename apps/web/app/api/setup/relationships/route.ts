import { NextResponse, type NextRequest } from "next/server";
import { withTenant, addRelationship, deleteRelationship } from "@edim/db";
import { parseQty, parseCost, parseCond } from "@/app/lib/catalog";
import { guard, str, UUID, dbError } from "../_guard";

/** p34 Product Code Relationship — POST = Add Child · DELETE ?id= removes a Child Group row. */
export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parentCode = str(b.parent, 40), childCode = str(b.child, 40), section = str(b.section, 40);
  const qty = parseQty(b.qty), unitCost = parseCost(b.unitCost), when = parseCond(b.when);
  if (!parentCode || !childCode || !section) return NextResponse.json({ error: "parent · child · section 필수" }, { status: 400 });
  if (qty === "invalid" || unitCost === "invalid" || when === "invalid")
    return NextResponse.json({ error: "qty/unitCost = {lit:n} 또는 {ref:'table.col'} · when = {slot,eq} 또는 {macro:true}" }, { status: 400 });
  const seq = typeof b.seq === "number" && Number.isInteger(b.seq) && b.seq > 0 ? b.seq : undefined;
  try {
    const row = await withTenant(g.session.tenantId, (tx) =>
      addRelationship(tx, { parentCode, childCode, seq, section, qty: qty as object, unitCost: unitCost as object, whenCond: when ? (when as object) : null, remarks: str(b.remarks) || null, createdBy: g.session.userId }),
    );
    return NextResponse.json({ ok: true, id: row.id, seq: row.seq });
  } catch (e) { return dbError(e); }
}

export async function DELETE(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await withTenant(g.session.tenantId, (tx) => deleteRelationship(tx, id, g.session.userId));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
