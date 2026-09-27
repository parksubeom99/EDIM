import Link from "next/link";
import { withTenant, getDrawing } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { dxfToSvg } from "@/app/lib/output/dxf-svg";
import { AnnotEditor } from "./annot-editor";

/** H10 · p58 그림 제작 Module 1단계 — 도면 위 주석 레이어(선 · 사각형 · 글자 · 치수선). 원 도면(저장 DXF)은 그대로 그린다. */
export default async function AnnotatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  const { id } = await params;
  const row = /^[0-9a-f-]{36}$/i.test(id) ? await withTenant(session.tenantId, (tx) => getDrawing(tx, id)).catch(() => null) : null;
  if (!row) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }} data-testid="annot-missing">도면을 찾을 수 없습니다. <Link href="/workbench">작업대</Link></main>;
  const { svg, frame } = dxfToSvg(row.dxf);
  return (
    <main style={{ maxWidth: 1320, margin: "2vh auto", padding: "12px 20px" }}>
      <Link href={row.hierarchyStable ? `/workbench?node=${row.hierarchyStable}` : "/workbench"} style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← 작업대</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "8px 0 2px" }}>그림 제작 · 주석 — {row.drawingNo} Rev {row.currentRev}</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>EDIM System Toolbar Module (p58) — 도면 위에 선 · 사각형 · 글자 · 치수선을 더하고 옮기고 지웁니다. 원 도면은 그대로이고, 주석은 따로 저장되어 DXF 내보내기에서 ANNOT 레이어로 붙습니다.</p>
      <AnnotEditor drawingId={row.id} svg={svg} frame={frame} locked={row.status === "issued"} canEdit={canEditProject(session.role)} />
    </main>
  );
}
