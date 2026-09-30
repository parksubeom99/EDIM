import { NextResponse, type NextRequest } from "next/server";
import { withTenant, workOrderDetail, releaseWorkOrder, stepEvent, openDefect, addStockMove } from "@edim/db";
import { sessionOr401, editorOr403, mesError, num, str } from "../../_util";
import { UUID_RE } from "@/app/lib/mes-run";

/**
 * ccmd L · LA3 · p44-2 · 3 — 작업지시 한 건. GET 상세(공정 사본 · 착수/완료 · 검수).
 * POST {action: "release"} 지시 · {action: "start" | "finish", seq, workerId?, actualHours?} 공정 진행(추가만) ·
 * {action: "as", title} 완료된 작업지시에 A/S 건(p69-5 · 하자 종류 'as' 재사용).
 * 규칙 위반(앞 공정 미완료 · 지시 전 착수 · 완성품 검수 없음) = 409.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const d = await withTenant(a.s.tenantId, (tx) => workOrderDetail(tx, id));
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(d);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const out = await withTenant(a.s.tenantId, async (tx) => {
      const wo = await workOrderDetail(tx, id);
      if (!wo) return { status: 404, body: { error: "not found" } };
      if (b.action === "release") { const w = await releaseWorkOrder(tx, id); return { status: 200, body: { ok: true, status: w.status } }; }
      if (b.action === "as") {
        if (wo.status !== "done") return { status: 409, body: { error: "A/S 건은 완료된 작업지시에만 엽니다" } };
        const t = str(b.title, 100);
        if (!t) return { status: 400, body: { error: "title 이 필요합니다" } };
        const d = await openDefect(tx, { kind: "as", inspectionId: null, refId: id, title: `A/S · ${wo.woNo} — ${t}`, createdBy: a.s.userId });
        return { status: 200, body: { ok: true, defectId: d.id } };
      }
      if (b.action === "start" || b.action === "finish") {
        const seq = num(b.seq), hrs = b.actualHours === undefined || b.actualHours === null || b.actualHours === "" ? null : num(b.actualHours);
        if (seq === null || !Number.isInteger(seq) || (hrs !== null && (hrs < 0 || hrs > 1000))) return { status: 400, body: { error: "seq(정수) · actualHours(0~1000)" } };
        const wk = typeof b.workerId === "string" && UUID_RE.test(b.workerId) ? b.workerId : null;
        const r = await stepEvent(tx, { workOrderId: id, seq, event: b.action, workerId: wk, actualHours: b.action === "finish" ? hrs : null, createdBy: a.s.userId });
        // 제품 작업지시가 끝나면 스냅샷의 구매 품목(자재 정보가 있는 것)을 수량만큼 소모 기록 — 재고가 모자라면 409(완료도 함께 되돌린다)
        const consumed: { itemCode: string; qty: number }[] = [];
        if (r.done) {
          const run = await tx.bomCodeRun.findUnique({ where: { id: wo.bomRunId }, select: { parentCode: true, lines: true } });
          if (run && run.parentCode === wo.itemCode) {
            const reg = new Map((await tx.itemMaterial.findMany({ where: { makeBuy: "buy" } })).map((i) => [i.itemCode, i]));
            for (const l of (Array.isArray(run.lines) ? run.lines : []) as Record<string, unknown>[]) {
              const it = reg.get(String(l.childCode));
              if (!it) continue;
              const q = Number(l.qty) * wo.qty;
              await addStockMove(tx, { itemCode: it.itemCode, warehouseId: it.warehouseId, qty: -q, reason: "wo_consume", refKind: "work_order", refId: id, createdBy: a.s.userId });
              consumed.push({ itemCode: it.itemCode, qty: q });
            }
          }
        }
        return { status: 200, body: { ok: true, status: r.status, done: r.done, consumed } };
      }
      return { status: 400, body: { error: "action = release | start | finish | as" } };
    });
    return NextResponse.json(out.body, { status: out.status });
  } catch (e) { return mesError(e); }
}
