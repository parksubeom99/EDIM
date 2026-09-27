import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { guard, str, dbError } from "../_guard";

/**
 * ⑧ Company DB (청사진 p64 [ERP Set-up] · p67 Supplier) — 고객 · 공급처.
 * GET  ?kind=customer|supplier → { rows }  (회사 것만 — RLS)
 * POST { kind, code, name, contact?, nation?, remarks? } → 등록 (같은 kind 안에서 code 중복 409)
 * 프로젝트(client_id)·단가 이력(supplier_id)은 이 목록을 가리킨다. 수정·삭제·사용 중지 = ./[id] (0024). 아직 없음: Warehouse · Inventory · Bank.
 */
const PARTNER_KINDS =["customer", "supplier"] as const;
const isKind = (v: unknown): v is (typeof PARTNER_KINDS)[number] => typeof v === "string" && (PARTNER_KINDS as readonly string[]).includes(v);

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind && !isKind(kind)) return NextResponse.json({ error: "kind 는 customer · supplier" }, { status: 400 });
  const rows = await withTenant(g.session.tenantId, (tx) =>
    tx.partner.findMany({ where: kind ? { kind } : {}, orderBy: [{ kind: "asc" }, { code: "asc" }] }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, kind: r.kind, code: r.code, name: r.name, contact: r.contact, nation: r.nation, remarks: r.remarks, active: r.active })) });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = str(b.code, 40), name = str(b.name, 120);
  if (!isKind(b.kind)) return NextResponse.json({ error: "kind 는 customer · supplier" }, { status: 400 });
  if (!code || !name) return NextResponse.json({ error: "code · name 필수" }, { status: 400 });
  const kind = b.kind;
  try {
    const id = await withTenant(g.session.tenantId, async (tx) => {
      if (await tx.partner.findFirst({ where: { kind, code } })) return null;
      const tenantId = await requireTenant(tx);
      const row = await tx.partner.create({ data: { tenantId, kind, code, name, contact: str(b.contact, 200), nation: str(b.nation, 40), remarks: str(b.remarks, 200), createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "partner", row.id, null, { kind, code, name });
      return row.id;
    });
    if (!id) return NextResponse.json({ error: `이미 있는 ${kind === "customer" ? "고객" : "공급처"} 코드: ${code}` }, { status: 409 });
    return NextResponse.json({ ok: true, id });
  } catch (e) { return dbError(e); }
}
