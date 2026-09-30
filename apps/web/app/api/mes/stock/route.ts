import { NextResponse, type NextRequest } from "next/server";
import { withTenant, stockBalances, listStockMoves, addStockMove } from "@edim/db";
import { sessionOr401, editorOr403, mesError, num, str } from "../_util";
import { UUID_RE } from "@/app/lib/mes-run";

/** ccmd L · LA4 · p44-4 — 창고 · 재고. GET 현재고 · 재고 단가 4종 · Min Stack 경고 · 최근 이동. POST 입고 · 출고(추가만 · 음수 재고 409). */
export async function GET() {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  const out = await withTenant(a.s.tenantId, async (tx) => ({ rows: await stockBalances(tx), moves: await listStockMoves(tx) }));
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const item = str(b.itemCode, 40), qty = num(b.qty), price = b.unitPrice === undefined || b.unitPrice === null || b.unitPrice === "" ? null : num(b.unitPrice);
  const kind = b.kind === "receipt" || b.kind === "issue" ? b.kind : null;
  if (!item || !kind || qty === null || qty <= 0 || typeof b.warehouseId !== "string" || !UUID_RE.test(b.warehouseId))
    return NextResponse.json({ error: "itemCode · warehouseId · kind(receipt|issue) · qty > 0" }, { status: 400 });
  if (kind === "receipt" && (price === null || price < 0)) return NextResponse.json({ error: "입고에는 단가(0 이상)가 필요합니다 — 재고 단가 4종의 근거" }, { status: 400 });
  const refId = typeof b.refId === "string" && UUID_RE.test(b.refId) ? b.refId : null;
  try {
    const row = await withTenant(a.s.tenantId, async (tx) => {
      if (refId && !(await tx.purchaseRequest.findUnique({ where: { id: refId } }))) return null;
      return addStockMove(tx, { itemCode: item, warehouseId: b.warehouseId as string, qty: kind === "receipt" ? qty : -qty, unitPrice: kind === "receipt" ? price : null, reason: kind,
        refKind: refId ? "purchase_request" : null, refId, createdBy: a.s.userId });
    });
    if (!row) return NextResponse.json({ error: "구매 요청을 찾을 수 없습니다" }, { status: 404 });
    return NextResponse.json({ ok: true, id: row.id, qty: Number(row.qty) });
  } catch (e) { return mesError(e); }
}

const noEdit = () => NextResponse.json({ error: "입출고는 추가만 되는 기록입니다 — 고치기 · 지우기 없음(정정은 새 이동)" }, { status: 405 });
export const PATCH = noEdit;
export const DELETE = noEdit;
