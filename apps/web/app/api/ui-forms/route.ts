import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit } from "@edim/db";
import { guard, str, UUID } from "../setup/_guard";
import { designSpec, parseSpec, SCOPES } from "@/app/lib/ui-form";

/**
 * p25·p26 사용자 UI Form. GET = 목록(Templet 포함). POST = 새 폼 — fromTemplet 을 주면 그 Templet 을 복사해
 * 시작한다(Sample Templet 호출하여 Customizing). 쓰기는 카탈로그 편집 역할(owner · engineer).
 * ccmd M · p25 [UI 개발 AI] — design 을 주면(용도 · 항목 · 필요 DB Table · 설명) 서버가 폼을 설계해 만든다.
 *   지금은 결정론 설계기(designSpec — AI 키 없음 → D-6 결정론 폴백). engine 으로 그 사실을 돌려준다.
 */
export async function GET() {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const rows = await withTenant(g.session.tenantId, (tx) => tx.uiForm.findMany({ orderBy: [{ isTemplet: "desc" }, { name: "asc" }] }));
  return NextResponse.json({ rows, scopes: SCOPES });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(b.name, 60), scope = str(b.scope, 40) || SCOPES[0];
  if (!name) return NextResponse.json({ error: "이름이 필요합니다" }, { status: 400 });
  const from = typeof b.fromTemplet === "string" && UUID.test(b.fromTemplet) ? b.fromTemplet : null;
  const design = b.design && typeof b.design === "object" ? (b.design as Record<string, unknown>) : null;
  let notes: string[] | undefined;
  const out = await withTenant(g.session.tenantId, async (tx) => {
    if (await tx.uiForm.findFirst({ where: { name } })) return { dup: true as const };
    let spec: unknown = { widgets: [] };
    if (design) {
      const tRaw = design.table as { code?: unknown; table?: unknown } | null | undefined;
      let table: { code: string; table: string; cols: string[] } | null = null;
      if (tRaw && typeof tRaw.code === "string" && typeof tRaw.table === "string") {
        const pc = await tx.productCode.findFirst({ where: { code: tRaw.code } });
        const tt = (pc?.tables as Record<string, { cols?: { key: string }[] }> | undefined)?.[tRaw.table];
        if (!tt) return { bad: `필요 DB Table 이 없습니다: ${tRaw.code}.${tRaw.table}` };
        table = { code: tRaw.code, table: tRaw.table, cols: (tt.cols ?? []).map((c) => c.key) };
      }
      const items = Array.isArray(design.items) ? design.items.filter((x): x is string => typeof x === "string") : [];
      const d = designSpec({ purpose: str(design.purpose, 40) || scope, items, table, text: str(design.text, 400) });
      spec = d.spec; notes = d.notes;
    } else if (from) {
      const t = await tx.uiForm.findFirst({ where: { id: from, isTemplet: true } });
      if (!t) return { noTemplet: true as const };
      spec = t.spec;
    }
    const p = parseSpec(spec);
    if (!p.ok) return { bad: p.reason };
    const tenantId = g.session.tenantId;
    const row = await tx.uiForm.create({ data: { tenantId, name, scope, isTemplet: false, spec: p.spec as unknown as object, updatedBy: g.session.userId } });
    await writeAudit(tx, g.session.userId, "create", "ui_form", row.id, null, { name, scope, fromTemplet: from, ...(design ? { design: "deterministic" } : {}) });
    return { id: row.id };
  });
  if ("dup" in out) return NextResponse.json({ error: `이미 있는 이름: ${name}` }, { status: 409 });
  if ("noTemplet" in out) return NextResponse.json({ error: "Templet 을 찾을 수 없습니다" }, { status: 404 });
  if ("bad" in out) return NextResponse.json({ error: out.bad }, { status: 400 });
  return NextResponse.json({ ok: true, id: out.id, ...(notes ? { notes, engine: "결정론 설계기 · AI 키 없음(D-6)" } : {}) });
}
