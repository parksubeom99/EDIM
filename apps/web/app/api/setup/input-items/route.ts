import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { guard, str, dbError } from "../_guard";

/**
 * ⑨ Input Data 템플릿 (청사진 p16 · p47). 문서(지금은 Tech Data)의 입력 항목 — 이름 · 단위 · 기본값 · 범위.
 * GET → { rows } · POST { key, label, unit?, defaultValue?, minValue?, maxValue? } → 등록(guard(true)).
 * Tech Data 를 만들 때(POST /api/documents { type: "techdata", inputData }) 값이 body 에 스냅샷으로 들어간다.
 * 아직 없음: 수정·삭제 · Output Data 계산(밀도 등) · 그래프 · Coding List.
 */
const num = (v: unknown): number | null | "bad" => (v === undefined || v === null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : "bad");

export async function GET() {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const rows = await withTenant(g.session.tenantId, (tx) => tx.inputItem.findMany({ where: { docType: "techdata" }, orderBy: [{ seq: "asc" }, { createdAt: "asc" }] }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, key: r.key, label: r.label, unit: r.unit, defaultValue: r.defaultValue, minValue: r.minValue, maxValue: r.maxValue })) });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = str(b.key, 40), label = str(b.label, 60), unit = str(b.unit, 20);
  if (!/^[a-z][a-z0-9_]{0,30}$/.test(key)) return NextResponse.json({ error: "key 는 영문 소문자로 시작 · 소문자·숫자·_" }, { status: 400 });
  if (!label) return NextResponse.json({ error: "label 필수" }, { status: 400 });
  const dv = num(b.defaultValue), mn = num(b.minValue), mx = num(b.maxValue);
  if (dv === "bad" || mn === "bad" || mx === "bad") return NextResponse.json({ error: "기본값·범위는 수" }, { status: 400 });
  if (mn !== null && mx !== null && mn > mx) return NextResponse.json({ error: "최소가 최대보다 큽니다" }, { status: 400 });
  if (dv !== null && ((mn !== null && dv < mn) || (mx !== null && dv > mx))) return NextResponse.json({ error: "기본값이 범위 밖입니다" }, { status: 400 });
  try {
    const id = await withTenant(g.session.tenantId, async (tx) => {
      if (await tx.inputItem.findFirst({ where: { docType: "techdata", key } })) return null;
      const tenantId = await requireTenant(tx);
      const seq = (await tx.inputItem.count({ where: { docType: "techdata" } })) + 1;
      const row = await tx.inputItem.create({ data: { tenantId, docType: "techdata", seq, key, label, unit, defaultValue: dv, minValue: mn, maxValue: mx, createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "input_item", row.id, null, { key, label, unit, defaultValue: dv, minValue: mn, maxValue: mx });
      return row.id;
    });
    if (!id) return NextResponse.json({ error: `이미 있는 항목: ${key}` }, { status: 409 });
    return NextResponse.json({ ok: true, id });
  } catch (e) { return dbError(e); }
}
