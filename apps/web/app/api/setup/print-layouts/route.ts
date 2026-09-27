import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { guard, dbError } from "../_guard";
import { validateElements, defaultLayout } from "@/app/lib/print-layout";

/**
 * H9 · p48 인쇄 양식 편집기(0030) — 문서 종류마다 요소 배치의 버전.
 * GET ?docType=quotation|techdata → { latest: { version, elements } | null, versions: [{ version, createdAt, count, issued }], default }
 * POST { docType, elements } → 새 버전(고치지 않고 쌓는다) · 요소 모양 400. 발행된 문서는 발행 순간의 버전을 계속 따른다.
 */
const TYPES = ["quotation", "techdata"] as const;
const isType = (v: unknown): v is (typeof TYPES)[number] => typeof v === "string" && (TYPES as readonly string[]).includes(v);

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const docType = new URL(req.url).searchParams.get("docType");
  if (!isType(docType)) return NextResponse.json({ error: "docType 은 quotation · techdata" }, { status: 400 });
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const rows = await tx.printLayout.findMany({ where: { docType }, orderBy: { version: "desc" } });
    const pinned = rows.length ? await tx.document.groupBy({ by: ["printLayoutId"], where: { printLayoutId: { in: rows.map((r) => r.id) } }, _count: { _all: true } }) : [];
    return { rows, pinned };
  });
  const issued = new Map(out.pinned.map((p) => [p.printLayoutId, p._count._all]));
  const latest = out.rows[0];
  return NextResponse.json({
    latest: latest ? { version: latest.version, elements: latest.elements } : null,
    versions: out.rows.map((r) => ({ version: r.version, createdAt: r.createdAt.toISOString(), count: Array.isArray(r.elements) ? r.elements.length : 0, issued: issued.get(r.id) ?? 0 })),
    default: defaultLayout(docType),
  });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isType(b.docType)) return NextResponse.json({ error: "docType 은 quotation · techdata" }, { status: 400 });
  const docType = b.docType;
  const v = validateElements(b.elements);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try {
    const version = await withTenant(g.session.tenantId, async (tx) => {
      const tenantId = await requireTenant(tx);
      const next = ((await tx.printLayout.aggregate({ where: { docType }, _max: { version: true } }))._max.version ?? 0) + 1;
      const row = await tx.printLayout.create({ data: { tenantId, docType, version: next, elements: v.elements.map((e) => ({ ...e })), createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "print_layout", row.id, null, { docType, version: next, elements: v.elements.length });
      return next;
    });
    return NextResponse.json({ ok: true, version });
  } catch (e) { return dbError(e); }
}
