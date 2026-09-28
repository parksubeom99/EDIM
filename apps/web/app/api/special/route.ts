import { NextResponse } from "next/server";
import { withTenant, listSpecialGrants, listSpecialRuns } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { parseSpec } from "@/app/lib/ui-form";
import { businessToday, businessDateOf } from "@/app/lib/today";

/**
 * C · 회사가 쓸 수 있는 Special — 부여(grant) 목록 · 그 입력 폼(회사가 Toolbox UI Form 으로 만든 폼 그대로) · 오늘 사용량.
 * grant 가 없으면 빈 목록(버튼이 생기지 않는다). 읽기는 viewer 도.
 */
export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out = await withTenant(s.tenantId, async (tx) => {
    const grants = await listSpecialGrants(tx);
    const today = businessToday();
    return Promise.all(grants.map(async (g) => {
      const form = g.formId ? await tx.uiForm.findFirst({ where: { id: g.formId } }) : null;
      const spec = form ? parseSpec(form.spec) : null;
      const runs = await listSpecialRuns(tx, g.programKey);
      const todays = runs.filter((r) => businessDateOf(r.createdAt) === today);
      return {
        programKey: g.programKey, title: g.title, version: g.version, pricePerRun: g.pricePerRun, currency: g.currency, binding: g.binding,
        form: form && spec?.ok ? { id: form.id, name: form.name, spec: spec.spec } : null,
        usage: { today: todays.length, todayAmount: todays.reduce((a, r) => a + r.price, 0), total: runs.length },
        recent: runs.slice(0, 5).map((r) => ({ id: r.id, input: r.input, result: r.result, source: r.bindingSource, price: r.price, at: r.createdAt })),
      };
    }));
  });
  return NextResponse.json({ grants: out });
}

