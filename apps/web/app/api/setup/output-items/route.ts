import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { guard, str, dbError } from "../_guard";
import { isOutputRef, OUTPUT_REFS } from "@/app/lib/output-template";

/**
 * H6 · p16 · p47 Output Data 템플릿(0029) — Tech Data 의 출력 항목.
 * GET → { rows, refs } · POST { key, label, unit?, source: "macro" | "snapshot", ref? }
 *   source=macro → 승인 매크로 결과(ref 없음) · source=snapshot → ref 는 refs 중 하나. 새 계산식은 받지 않는다.
 *   key 형식 400 · 중복 409. 삭제 = ./[id] (이미 만든 문서는 body 에 값을 갖고 있어 그대로).
 */
const KEY = /^[a-z][a-z0-9_]{0,30}$/;

export async function GET() {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const rows = await withTenant(g.session.tenantId, (tx) => tx.outputItem.findMany({ where: { docType: "techdata" }, orderBy: [{ seq: "asc" }, { createdAt: "asc" }] }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, key: r.key, label: r.label, unit: r.unit, source: r.source, ref: r.ref })), refs: OUTPUT_REFS });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = str(b.key, 31), label = str(b.label, 60), unit = str(b.unit, 20);
  if (!KEY.test(key)) return NextResponse.json({ error: "key 는 영소문자로 시작하는 영소문자·숫자·_ (31자까지)" }, { status: 400 });
  if (!label) return NextResponse.json({ error: "이름 필수" }, { status: 400 });
  if (b.source !== "macro" && b.source !== "snapshot") return NextResponse.json({ error: "출처는 macro(승인 매크로 결과) · snapshot(스냅샷 값)" }, { status: 400 });
  const source = b.source;
  const ref = source === "snapshot" ? (isOutputRef(b.ref) ? b.ref : null) : null;
  if (source === "snapshot" && !ref) return NextResponse.json({ error: `스냅샷 값 경로가 아닙니다: ${String(b.ref ?? "")} (${Object.keys(OUTPUT_REFS).join(" · ")})` }, { status: 400 });
  try {
    const id = await withTenant(g.session.tenantId, async (tx) => {
      if (await tx.outputItem.findFirst({ where: { docType: "techdata", key } })) return null;
      const tenantId = await requireTenant(tx);
      const seq = ((await tx.outputItem.aggregate({ where: { docType: "techdata" }, _max: { seq: true } }))._max.seq ?? 0) + 1;
      const row = await tx.outputItem.create({ data: { tenantId, docType: "techdata", seq, key, label, unit, source, ref, createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "output_item", row.id, null, { key, label, unit, source, ref });
      return row.id;
    });
    if (!id) return NextResponse.json({ error: `이미 있는 Output 항목: ${key}` }, { status: 409 });
    return NextResponse.json({ ok: true, id });
  } catch (e) { return dbError(e); }
}
