import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str, UUID } from "../../../setup/_guard";
import { applyRowWrite, parseSpec, writePlan } from "@/app/lib/ui-form";
import { parseTables } from "@/app/lib/catalog";

/**
 * ccmd M · p25 버튼의 저장 · 삭제 · 등록 — UI Form 이 대상 제품 표의 **한 행**을 쓴다.
 * 판정은 **저장된 폼**으로 한다(화면이 보낸 spec 을 믿지 않는다): 버튼 · 대상 Table · Active Set-up Combo · Number 위젯의 '쓰는 열'.
 * 쓰기 규칙 = Set-Up 표 편집과 같다: 역할 owner · engineer(guard) · 표 검증 parseTables · 감사 기록 · RLS(다른 회사 폼 404).
 * 사용중지(retired) 코드의 표는 쓰지 않는다(409). Item 은 그 표가 기대는 Sub Code 의 등록된 값이어야 한다(400).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const button = str(b.button, 20), item = str(b.item, 40);
  const raw = (b.values && typeof b.values === "object" ? b.values : {}) as Record<string, unknown>;

  const out = await withTenant(g.session.tenantId, async (tx) => {
    const form = await tx.uiForm.findFirst({ where: { id } });
    if (!form) return { status: 404, error: "not found" };
    const ps = parseSpec(form.spec);
    if (!ps.ok) return { status: 409, error: `저장된 폼이 올바르지 않습니다: ${ps.reason}` };
    const plan = writePlan(ps.spec, button);
    if (!plan.ok) return { status: 400, error: plan.reason };
    const pc = await tx.productCode.findFirst({ where: { code: plan.source.code } });
    if (!pc) return { status: 404, error: `제품 코드 ${plan.source.code} 가 없습니다` };
    if (pc.approvalStatus === "retired") return { status: 409, error: `${pc.code} 는 사용중지 코드입니다 — 표를 고치지 않습니다` };
    const tables = (pc.tables ?? {}) as Record<string, { by: string; cols: { key: string }[]; rows: { item: string; cells: Record<string, unknown> }[] } & Record<string, unknown>>;
    const t = tables[plan.source.table];
    if (!t) return { status: 404, error: `표 ${plan.source.code}.${plan.source.table} 가 없습니다` };
    const combo = plan.combo;
    if (combo.source?.kind === "subcode") {
      if (combo.source.itemKey !== t.by) return { status: 400, error: `표 ${plan.source.table} 의 Item 은 Sub Code ${t.by} 인데 Active Set-up 은 Sub Code ${combo.source.itemKey} 입니다` };
      if (item && !(await tx.subCode.findFirst({ where: { itemKey: t.by, value: item } }))) return { status: 400, error: `Sub Code ${t.by} 에 등록되지 않은 값: ${item}` };
    }
    const values: Record<string, number> = {};
    if (plan.action !== "delete") {
      for (const w of plan.numbers) {
        const v = raw[w.id];
        if (v === undefined || v === "") continue;
        const n = typeof v === "number" ? v : Number(String(v).trim());
        if (!Number.isFinite(n)) return { status: 400, error: `${w.id}(열 ${w.col}): 수가 아닙니다` };
        values[w.col!] = n;
      }
      if (!Object.keys(values).length) return { status: 400, error: "쓸 값이 없습니다 — Number 칸에 값을 넣으십시오" };
    }
    const w = applyRowWrite(t, plan.action, item, values);
    if (!w.ok) return { status: w.status, error: w.reason };
    const next = { ...tables, [plan.source.table]: { ...t, rows: w.rows } };
    const parsed = parseTables(next);
    if (parsed === "invalid") return { status: 400, error: "표 형식 검사에 걸렸습니다(Set-Up 표 편집과 같은 검사)" };
    await tx.productCode.update({ where: { id: pc.id }, data: { tables: parsed as unknown as object, updatedAt: new Date() } });
    const before = t.rows.find((r) => r.item === item) ?? null;
    const after = w.rows.find((r) => r.item === item) ?? null;
    await writeAudit(tx, g.session.userId, "update", "product_code", pc.id,
      { table: plan.source.table, item, row: before }, { table: plan.source.table, item, row: after, via: { uiForm: form.id, button, action: plan.action } });
    return { status: 200, rows: w.rows.length };
  });
  if (out.status !== 200) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, rows: out.rows });
}
