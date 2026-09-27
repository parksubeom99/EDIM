import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@edim/db";
import { loadCatalog } from "@/app/lib/catalog";
import { buildCodingList } from "@/app/lib/coding-list";
import { guard } from "../_guard";

/**
 * H8 · p57 Data Management — [EDIM Information Call] Directory · Type of source(Table · Chart · Formula) 목록(읽기 전용).
 *   Table   = 제품 코드의 등록 표(카탈로그)          → Directory "Product/<코드>"
 *   Chart   = 그래프 전용 data + 그래프(0029)        → Directory "Document/Tech Data"
 *   Formula = 노드에 붙은 승인 매크로(Coding List)   → Directory = 노드 경로
 * GET ?type=table|chart|formula (없으면 전부) → { rows: [{ type, directory, name, detail, href }] }. 새로 만드는 곳은 각 화면 그대로.
 * 아직 없음: Enterprise DB(AI 학습 자료) — 필요한 입력: 회사 자료 · AI 연결 결정.
 */
const TYPES = ["table", "chart", "formula"] as const;
type SrcType = (typeof TYPES)[number];

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const tq = new URL(req.url).searchParams.get("type");
  if (tq && !(TYPES as readonly string[]).includes(tq)) return NextResponse.json({ error: "type 은 table · chart · formula" }, { status: 400 });
  const want = (t: SrcType) => !tq || tq === t;
  const rows: { type: SrcType; directory: string; name: string; detail: string; href: string }[] = [];
  if (want("table")) {
    const { catalog } = await loadCatalog(g.session.tenantId);
    for (const p of catalog.productCodes.filter((x) => x.kind === "product"))
      for (const [name, t] of Object.entries(p.tables))
        rows.push({ type: "table", directory: `Product/${p.code}`, name: `${name} (Table${t.no})`, detail: `${t.role ?? "tech"} · ${t.rows.length}행 × ${t.cols.length}열`, href: "/setup" });
  }
  await withTenant(g.session.tenantId, async (tx) => {
    if (want("chart")) {
      for (const gd of await tx.graphDef.findMany({ orderBy: [{ seq: "asc" }, { createdAt: "asc" }] }))
        rows.push({ type: "chart", directory: "Document/Tech Data", name: gd.name, detail: `${gd.chart === "bar" ? "막대" : "선"} · 점 ${Array.isArray(gd.points) ? gd.points.length : 0}${gd.markerKey ? ` · 표시선 ${gd.markerKey}` : ""}`, href: "/setup/document" });
    }
    if (want("formula")) {
      const nodes = await tx.hierarchyNode.findMany({ where: { isCurrent: true }, select: { stableId: true, parentStable: true, kind: true, label: true, position: true } });
      const macros = await tx.macroRegistry.findMany({ where: { status: "approved" }, select: { id: true, stableId: true, status: true, revision: true, dsl: true, approvedAt: true, verifiedAtApproval: true } });
      for (const r of buildCodingList(nodes, macros, []).filter((x) => x.approved))
        rows.push({ type: "formula", directory: r.path, name: `r${r.approved!.revision}`, detail: r.approved!.dsl, href: `/workbench?node=${r.stableId}` });
    }
  });
  return NextResponse.json({ rows });
}
