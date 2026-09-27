import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { guard, str, dbError } from "../_guard";
import { parsePoints } from "@/app/lib/output-template";

/**
 * H6 · p47 그래프 전용 data + 그래프(0029). H8 그래프 마법사도 이 입구를 쓴다.
 * GET → { rows } · POST { name, chart: "bar"|"line", xLabel?, yLabel?, points: [{x,y}] (1~50), markerKey? }
 *   markerKey = Output 항목 key(그 값을 표시선으로) — 없는 항목 400 · 이름 중복 409 · 점 형식 400.
 *   삭제 = ./[id]. Tech Data 를 만들 때 점·표시선 값이 문서 body 에 박힌다.
 */
export async function GET() {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const rows = await withTenant(g.session.tenantId, (tx) => tx.graphDef.findMany({ where: { docType: "techdata" }, orderBy: [{ seq: "asc" }, { createdAt: "asc" }] }));
  return NextResponse.json({ rows: rows.map((r) => ({ id: r.id, name: r.name, chart: r.chart, xLabel: r.xLabel, yLabel: r.yLabel, points: r.points, markerKey: r.markerKey })) });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(b.name, 60);
  if (!name) return NextResponse.json({ error: "그래프 이름 필수" }, { status: 400 });
  if (b.chart !== "bar" && b.chart !== "line") return NextResponse.json({ error: "그래프 모양은 bar · line" }, { status: 400 });
  const chart = b.chart;
  const p = parsePoints(b.points);
  if (!p.ok) return NextResponse.json({ error: `그래프 전용 data: ${p.error}` }, { status: 400 });
  const markerKey = str(b.markerKey, 31) || null;
  try {
    const out = await withTenant(g.session.tenantId, async (tx) => {
      if (markerKey && !(await tx.outputItem.findFirst({ where: { docType: "techdata", key: markerKey } }))) return { bad: `표시선 Output 항목 없음: ${markerKey}` };
      if (await tx.graphDef.findFirst({ where: { docType: "techdata", name } })) return { dup: true as const };
      const tenantId = await requireTenant(tx);
      const seq = ((await tx.graphDef.aggregate({ where: { docType: "techdata" }, _max: { seq: true } }))._max.seq ?? 0) + 1;
      const row = await tx.graphDef.create({ data: { tenantId, docType: "techdata", seq, name, chart, xLabel: str(b.xLabel, 40), yLabel: str(b.yLabel, 40), points: p.points.map((q) => ({ x: q.x, y: q.y })), markerKey, createdBy: g.session.userId } });
      await writeAudit(tx, g.session.userId, "create", "graph_def", row.id, null, { name, chart, points: p.points.length, markerKey });
      return { id: row.id };
    });
    if ("bad" in out) return NextResponse.json({ error: out.bad }, { status: 400 });
    if ("dup" in out) return NextResponse.json({ error: `이미 있는 그래프: ${name}` }, { status: 409 });
    return NextResponse.json({ ok: true, id: out.id });
  } catch (e) { return dbError(e); }
}
