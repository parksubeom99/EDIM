import Link from "next/link";
import type { CSSProperties } from "react";
import { withTenant } from "@edim/db";
import { priorityRowsOf } from "@edim/bom-code";
import { getServerSession } from "@/app/lib/session";
import { loadCatalog } from "@/app/lib/catalog";

/**
 * ccmd L · LA6 · p42 — 설계 우선순위 · 기준점 · 오류 체크(Dim · 설계 우선순위 · 상위설계 우선자료 · 설계 기준점 설정 · 설계 오류 체크 · Remarks).
 * 표는 제품 코드의 role=priority 표(Set-Up 제품 코드 표로 고친다 · 이 화면은 p42 모양으로 보여 준다). 오류 체크 식은 BOM Run 에서 기존 설계 검증으로 판정된다.
 * Material management 3칸 = 기존 화면 링크 · 3D 2D CAD Mapping = 아직 없음. 샘플 = SPF 샘플 제품에만.
 */
const cell: CSSProperties = { border: "1px solid var(--line)", padding: "4px 8px", fontSize: 13, textAlign: "left" };
type Pv = { rows: number; violated: number; candidates: { target: string; priority: number; check: string }[]; keep: { target: string; priority: number; note: string }[]; unreadable: { target: string; check: string }[] };

export default async function DesignPriorityPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const s = (await getServerSession())!;
  const { catalog } = await loadCatalog(s.tenantId);
  const withTable = catalog.productCodes.filter((p) => p.kind === "product" && priorityRowsOf(p).length > 0);
  const want = (await searchParams).code;
  const p = withTable.find((x) => x.code === want) ?? withTable[0] ?? null;
  const rows = p ? priorityRowsOf(p) : [];
  const last = p ? await withTenant(s.tenantId, (tx) => tx.bomCodeRun.findFirst({ where: { parentCode: p.code }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, dims: true, createdAt: true } })) : null;
  const pv = ((last?.dims ?? {}) as { priority?: Pv }).priority ?? null;
  const children = p ? [...new Set((p.sections ?? []).flatMap((x) => (x.components ?? []).map((c) => c.code)))] : [];
  return (
    <main data-testid="design-priority" style={{ maxWidth: 1100, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup/map" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up 지도</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Material management · 설계 우선순위 (p42)</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>
        오류 체크 식은 BOM Run 에서 <b>기존 설계 검증 규칙으로</b> 판정된다(새 판정기 없음). 위반이 여럿이면 우선순위가 낮은(숫자가 큰) 치수부터 “바꿀 후보” · 상위설계 우선자료는 “바꾸지 말 것”.
        표는 Set-Up 제품 코드의 <code>priority</code> 표에서 고친다. <span data-testid="dp-sample" style={{ fontSize: 11, fontWeight: 700, color: "#b45309", border: "1px solid #b45309", borderRadius: 3, padding: "0 4px" }}>샘플</span> SPF 샘플 제품에만(EU 시연 제품 없음).
      </p>
      <nav style={{ display: "flex", gap: 6, margin: "8px 0" }}>{withTable.map((x) => <Link key={x.code} href={`/setup/design-priority?code=${encodeURIComponent(x.code)}`} style={{ fontWeight: x.code === p?.code ? 700 : 400 }}>{x.code}</Link>)}</nav>
      {!p ? <p data-testid="dp-none">설계 우선순위 표가 있는 제품 코드가 없습니다 — 필요한 입력: 제품 코드에 priority 표.</p> : <>
        <table data-testid="dp-table" data-code={p.code} style={{ borderCollapse: "collapse" }}>
          <thead><tr>{["Dim", "설계 우선순위", "상위설계 우선자료", "설계 기준점 설정", "설계 오류 체크", "Remarks"].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={`${r.target}-${r.priority}`} data-target={r.target}><td style={cell}>{r.target}</td><td style={{ ...cell, textAlign: "right" }}>{r.priority}</td><td style={cell}>{r.upper ? "예" : "아니오"}</td><td style={cell}>{r.datum}</td><td style={{ ...cell, fontFamily: "var(--font-mono)" }}>{r.check}</td><td style={cell}>{r.remarks}</td></tr>)}</tbody>
        </table>
        <h2 style={{ fontSize: 15 }}>최신 BOM 스냅샷 판정</h2>
        {!pv ? <p data-testid="dp-verdict-none">이 제품의 BOM 스냅샷이 아직 없습니다 — 먼저 BOM Run.</p> :
          <div data-testid="dp-verdict" data-violated={pv.violated} data-candidates={pv.candidates.map((c) => c.target).join(",")} data-keep={pv.keep.map((c) => c.target).join(",")} style={{ fontSize: 13 }}>
            스냅샷 <span style={{ fontFamily: "var(--font-mono)" }}>{last!.id.slice(0, 8)}</span> · 우선순위 {pv.rows}행 · 위반 {pv.violated}
            {pv.candidates.length > 0 && <p>바꿀 후보(우선순위 낮은 치수부터): {pv.candidates.map((c) => `${c.target}(${c.priority} · ${c.check})`).join(" → ")}</p>}
            {pv.keep.length > 0 && <p style={{ color: "#b91c1c" }}>바꾸지 말 것(상위설계 우선자료): {pv.keep.map((c) => `${c.target}(${c.priority})`).join(", ")}</p>}
            {pv.unreadable.length > 0 && <p>읽을 수 없는 오류 체크 식: {pv.unreadable.map((c) => `${c.target} ${c.check}`).join(", ")}</p>}
          </div>}
        <h2 style={{ fontSize: 15 }}>Material management</h2>
        <ul data-testid="dp-material" style={{ fontSize: 13 }}>
          <li>1. Sub Material List — BOM 자식: {children.length ? children.join(" · ") : "—"} · <Link data-kind="link" href="/setup/material">자재 코드(Sub code Material)</Link></li>
          <li>2. Variant List — 카탈로그 선택지: <Link data-kind="link" href="/setup">제품 코드 · 슬롯(Code Builder 선택지)</Link></li>
          <li>3. Inventory Management — <Link data-kind="link" href={`/m/warehouse?item=${encodeURIComponent(children[0] ?? "")}`}>창고 · 재고(이 제품 자식 품목)</Link></li>
          <li data-testid="dp-cad-none">3D 2D CAD Mapping — 아직 없음 — 필요한 입력: 3D 모델 · CAD 규칙(M4)</li>
        </ul>
      </>}
    </main>
  );
}
