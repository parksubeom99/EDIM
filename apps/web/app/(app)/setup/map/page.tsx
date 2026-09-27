import Link from "next/link";
import type { CSSProperties } from "react";
import { getServerSession } from "@/app/lib/session";

/**
 * F9 · p54 [System Set-Up] 메뉴 지도 — 청사진의 Set-Up 트리를 그대로 옮기고, 이미 있는 화면은 링크,
 * 없는 것은 "아직 없음 — 필요한 입력"으로 적는다(없는 화면을 있는 척하지 않는다).
 */
type Node = { id: string; label: string; href?: string; none?: string };
type Group = { title: string; items: Node[] };
const MAP: { col: string; groups: Group[] }[] = [
  { col: "EDIM System Structure", groups: [{ title: "", items: [
    { id: "e1", label: "1. Main (E-1)", href: "/workbench" },
    { id: "e2", label: "2. Main Work Place (E-2)", href: "/workbench" },
    { id: "e3", label: "3. Key Work Place (E-3)", href: "/workbench" },
    { id: "e4", label: "4. Sub Work Place (E-4)", href: "/workbench" },
  ] }] },
  { col: "EDIM Tool UI Design", groups: [
    { title: "1. UI Design (S-2-1)", items: [
      { id: "s21-cpq", label: "1) CPQ", href: "/setup/ui" },
      { id: "s21-tlm", label: "2) TLM", href: "/setup/ui" },
      { id: "s21-print", label: "3) Print Form", href: "/setup/print" },
      { id: "s21-toolbar", label: "4) Tool Bar", href: "/workbench" },
      { id: "s21-usererp", label: "5) User ERP", href: "/m/project" },
    ] },
    { title: "2. Macro (S-2-2)", items: [{ id: "s22", label: "Macro", href: "/workbench" }] },
  ] },
  { col: "CPQ (Set-Up)", groups: [
    { title: "1. CPQ", items: [
      { id: "s31", label: "1) Selection (S-3-1)", href: "/setup/spec" },
      { id: "s32", label: "2) Technical (S3-2)", href: "/setup/input-data" },
      { id: "s33", label: "3) Document (S3-3)", href: "/techdata" },
      { id: "s34", label: "4) Print Set-up (S3-4)", href: "/setup/print" },
    ] },
    { title: "2. User Management", items: [{ id: "s35", label: "1) User Customizing ERP (S-3-5)", href: "/m/company" }] },
  ] },
  { col: "TLM (Set-Up)", groups: [
    { title: "1. Code", items: [
      { id: "s11", label: "1) Sub code Spec. (S-1-1)", href: "/setup" },
      { id: "s12", label: "2) Sub code Material (S-1-2)", href: "/setup/material" },
      { id: "s13", label: "3) Product Code (S-1-3)", href: "/setup" },
      { id: "s14", label: "4) Code Relationship (S-1-4)", href: "/setup" },
      { id: "s15", label: "5) Arrangement Code (S-1-5)", href: "/setup/arrangement-code" },
      { id: "s16", label: "6) Arrangement Set-up (S1-6)", href: "/workbench" },
    ] },
    { title: "2. Design", items: [{ id: "s411", label: "1) Design (S-4-1-1)", href: "/workbench" }] },
    { title: "3. Work Process", items: [{ id: "s412", label: "1) Work Process (S-4-1-2) · All Department", none: "필요한 입력: 부서별 작업 절차(Work Process) 정의" }] },
  ] },
  { col: "ERP (Set-Up / User)", groups: [
    { title: "Company info.", items: [
      { id: "c-erp", label: "1. ERP System", href: "/m/company" },
      { id: "c-dept", label: "2. Department", none: "필요한 입력: 회사 부서 체계" },
      { id: "c-pcr", label: "3. PCR", href: "/workbench" },
      { id: "c-db", label: "4. Company DB", href: "/setup/company" },
    ] },
    { title: "Sales", items: [
      { id: "sales-project", label: "1. Project", href: "/m/project" },
      { id: "sales-approval", label: "2. Approval", href: "/workbench" },
    ] },
    { title: "그 밖의 ERP", items: [
      { id: "erp-purchasing", label: "Material · 구매", href: "/m/purchasing" },
      { id: "erp-rest", label: "Tech. · Manufacturing · QC · CS · Finance · HR · Dashboard", none: "EDIM 완료 후 확장 단계(회장님 확정) — 필요한 입력: 각 부서 업무 데이터" },
    ] },
  ] },
];
const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12, alignSelf: "start" };

export default async function SetupMapPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  const all = MAP.flatMap((c) => c.groups.flatMap((g) => g.items));
  return (
    <main style={{ maxWidth: 1320, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>System Set-Up 지도</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>
        청사진 p54 트리 그대로 · 화면 있음 {all.filter((n) => n.href).length} · 아직 없음 {all.filter((n) => n.none).length}
      </p>
      <section data-testid="setup-map" data-links={all.filter((n) => n.href).length} data-none={all.filter((n) => n.none).length}
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 12 }}>
        {MAP.map((c) => (
          <div key={c.col} style={card}>
            <div style={{ fontWeight: 700, color: "#b4232a", marginBottom: 6, fontSize: "var(--fs-13)" }}>{c.col}</div>
            {c.groups.map((g) => (
              <div key={g.title || c.col} style={{ marginBottom: 8 }}>
                {g.title && <div style={{ fontWeight: 600, fontSize: "var(--fs-12)", marginBottom: 2 }}>{g.title}</div>}
                {g.items.map((n) => n.href ? (
                  <Link key={n.id} href={n.href} data-testid={`map-${n.id}`} data-kind="link" style={{ display: "block", fontSize: "var(--fs-12)", color: "var(--accent)", padding: "2px 0" }}>{n.label} →</Link>
                ) : (
                  <div key={n.id} data-testid={`map-${n.id}`} data-kind="none" style={{ fontSize: "var(--fs-12)", padding: "2px 0", color: "var(--ink-muted)" }}>
                    {n.label}<br /><span style={{ fontSize: 11, color: "var(--warn)" }}>아직 없음 — {n.none}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
