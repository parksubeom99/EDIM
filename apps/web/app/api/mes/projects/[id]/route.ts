import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@edim/db";
import { editorOr403, num, ymd } from "../../_util";
import { UUID_RE } from "@/app/lib/mes-run";

/** ccmd L · LA2 — MRP 입력: 프로젝트 수량(1~9999) · 납기(YYYY-MM-DD 또는 null). 0038 에서 더한 두 칸만 바꾼다. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const qty = num(b.qty), due = ymd(b.dueDate);
  if (qty === null || !Number.isInteger(qty) || qty < 1 || qty > 9999 || due === undefined) return NextResponse.json({ error: "qty(1~9999 정수) · dueDate(YYYY-MM-DD | null)" }, { status: 400 });
  const out = await withTenant(a.s.tenantId, async (tx) => {
    if (!(await tx.project.findUnique({ where: { id } }))) return null;
    return tx.project.update({ where: { id }, data: { qty, dueDate: due } });
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, qty: out.qty, dueDate: out.dueDate ? out.dueDate.toISOString().slice(0, 10) : null });
}
