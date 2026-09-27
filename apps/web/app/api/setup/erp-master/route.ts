import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { guard, str, dbError } from "../_guard";
import { isErpKind, normalizeAttrs, ERP_DEF, type ErpAttrs } from "@/app/lib/erp-master";
import { checkRefs } from "@/app/lib/erp-master-db";

/**
 * H4 · p64 [ERP Set-up] 기준정보 6종(0027) — Department Std. · Warehouse · Inventory · Bank · Employee · Nation.
 * GET  ?kind= → { rows }  (회사 것만 — RLS · 읽기는 모든 역할)
 * POST { kind, code, name, attrs?, remarks? } → 등록 (같은 kind 안 code 중복 409 · 가리키는 칸이 없거나 사용 중지면 400)
 * 수정·사용 중지·삭제 = ./[id]. 값은 회사가 채운다.
 */
export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind && !isErpKind(kind)) return NextResponse.json({ error: "모르는 종류" }, { status: 400 });
  const rows = await withTenant(g.session.tenantId, (tx) =>
    tx.erpMaster.findMany({ where: kind ? { kind } : {}, orderBy: [{ kind: "asc" }, { code: "asc" }] }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, kind: r.kind, code: r.code, name: r.name, attrs: r.attrs as ErpAttrs, remarks: r.remarks, active: r.active })) });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isErpKind(b.kind)) return NextResponse.json({ error: "모르는 종류" }, { status: 400 });
  const kind = b.kind;
  const code = str(b.code, 40), name = str(b.name, 120);
  if (!code || !name) return NextResponse.json({ error: "code · name 필수" }, { status: 400 });
  const a = normalizeAttrs(kind, b.attrs);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: 400 });
  try {
    const out = await withTenant(g.session.tenantId, async (tx) => {
      if (await tx.erpMaster.findFirst({ where: { kind, code } })) return { dup: true as const };
      const bad = await checkRefs(tx, kind, code, a.attrs);
      if (bad) return { bad };
      const tenantId = await requireTenant(tx);
      const row = await tx.erpMaster.create({ data: { tenantId, kind, code, name, attrs: a.attrs, remarks: str(b.remarks, 200), createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "erp_master", row.id, null, { kind, code, name, attrs: a.attrs });
      return { id: row.id };
    });
    if ("dup" in out) return NextResponse.json({ error: `이미 있는 ${ERP_DEF[kind].label} 코드: ${code}` }, { status: 409 });
    if ("bad" in out) return NextResponse.json({ error: out.bad }, { status: 400 });
    return NextResponse.json({ ok: true, id: out.id });
  } catch (e) { return dbError(e); }
}
