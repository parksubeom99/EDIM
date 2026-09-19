import { NextResponse, type NextRequest } from "next/server";
import { withTenant, addSubCode, deleteSubCode } from "@edim/db";
import { guard, str, UUID, dbError } from "../_guard";

/** p31 Sub Code Registration — POST adds one sub item · DELETE ?id= removes it. */
export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const groupName = str(b.group, 80), itemKey = str(b.itemKey, 1), itemName = str(b.itemName, 80), value = str(b.value, 40);
  if (!groupName || !/^[A-F]$/.test(itemKey) || !itemName || !value)
    return NextResponse.json({ error: "group · itemKey(A~F) · itemName · value 필수" }, { status: 400 });
  try {
    const row = await withTenant(g.session.tenantId, (tx) => addSubCode(tx, { groupName, itemKey, itemName, value, description: str(b.description), createdBy: g.session.userId }));
    return NextResponse.json({ ok: true, id: row.id, seq: row.seq });
  } catch (e) { return dbError(e); }
}

export async function DELETE(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await withTenant(g.session.tenantId, (tx) => deleteSubCode(tx, id, g.session.userId));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
