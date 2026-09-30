import { NextResponse, type NextRequest } from "next/server";
import { withTenant, createPurchaseRequest, createWorkOrder, PrDuplicateError, PrEmptyError } from "@edim/db";
import { sessionOr401, editorOr403, mesError } from "../_util";
import { mrpFor, UUID_RE } from "@/app/lib/mes-run";
import { noCoreOf } from "@/app/lib/output/document";

/**
 * ccmd L · LA2 · p44-1 — MRP. GET ?project=&run= → 계산 결과(스냅샷 id · 재고 합 · 오늘 날짜를 머리에).
 * POST {project, run?, action: "purchase" | "work-orders"} — 순소요 > 0 인 구매 품목 → **기존 구매 요청 흐름**(초안 · 같은 스냅샷 두 번 409) ·
 * 제조 품목 → 작업지시 초안(공정 순서가 있는 품목만 · 없으면 건너뛴 목록).
 */
function ids(sp: URLSearchParams | Record<string, unknown>) {
  const g = (k: string) => (sp instanceof URLSearchParams ? sp.get(k) : (sp[k] as string | undefined)) ?? null;
  const project = g("project"), run = g("run");
  return { project: project && UUID_RE.test(project) ? project : null, run: run && UUID_RE.test(run) ? run : null };
}

export async function GET(req: NextRequest) {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  const q = ids(req.nextUrl.searchParams);
  if (!q.project) return NextResponse.json({ error: "project 가 필요합니다" }, { status: 400 });
  const r = await mrpFor(a.s.tenantId, q.project, q.run);
  if (r.status !== 200) return NextResponse.json({ error: r.error }, { status: r.status });
  const { unitCost: _u, ...out } = r;
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const q = ids(b);
  if (!q.project || (b.action !== "purchase" && b.action !== "work-orders")) return NextResponse.json({ error: "project · action(purchase | work-orders)" }, { status: 400 });
  const r = await mrpFor(a.s.tenantId, q.project, q.run);
  if (r.status !== 200) return NextResponse.json({ error: r.error }, { status: r.status });
  const due = r.project.due ? new Date(`${r.project.due}T00:00:00Z`) : null;
  try {
    if (b.action === "purchase") {
      const lines = r.rows.filter((x) => x.kind === "buy" && x.net > 0 && r.unitCost[x.item]).map((x) => {
        const l = r.unitCost[x.item]!.line;
        return { bomLineNo: Number(l.no), childCode: x.item, resolvedCode: String(l.resolvedCode ?? x.item), part: x.part, spec: String(l.spec ?? ""), qty: x.net, unit: x.unit, unitPrice: r.unitCost[x.item]!.price,
          supplier: typeof l.supplier === "string" && l.supplier ? l.supplier : null };
      });
      const pr = await withTenant(a.s.tenantId, (tx) => createPurchaseRequest(tx, {
        stableId: r.project.stableId, bomRunId: r.run.id, noCore: noCoreOf(r.project.projectNo), projectNo: r.project.projectNo, code: r.run.code,
        requiredDate: due, remarks: `MRP 순소요(프로젝트 수량 ${r.project.qty})`, lines, createdBy: a.s.userId,
      }));
      return NextResponse.json({ ok: true, prId: pr.id, prNo: pr.prNo, lines: pr.lines.map((l) => ({ childCode: l.childCode, qty: l.qty })) });
    }
    const make = r.rows.filter((x) => x.kind === "make" && x.net > 0);
    const skipped = make.filter((x) => !r.hasRoute.includes(x.item)).map((x) => x.item);
    const made = await withTenant(a.s.tenantId, async (tx) => {
      const out = [];
      for (const x of make.filter((m) => r.hasRoute.includes(m.item)))
        out.push(await createWorkOrder(tx, { projectId: r.project.id, projectNo: r.project.projectNo, bomRunId: r.run.id, itemCode: x.item, qty: x.net, dueDate: due, createdBy: a.s.userId }));
      return out;
    });
    return NextResponse.json({ ok: true, workOrders: made.map((w) => ({ id: w.id, woNo: w.woNo, itemCode: w.itemCode, qty: Number(w.qty), status: w.status })), skipped });
  } catch (e) {
    if (e instanceof PrDuplicateError) return NextResponse.json({ error: e.message, prNo: e.prNo }, { status: 409 });
    if (e instanceof PrEmptyError) return NextResponse.json({ error: "순소요가 있는 구매 품목이 없습니다" }, { status: 422 });
    return mesError(e);
  }
}
