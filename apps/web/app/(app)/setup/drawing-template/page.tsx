import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { DrawingTemplate } from "./drawing-template";

/** p39 도면 Templet 호출 설정 · p40 Call Sub Drawing · Detail Design 주의사항 (H5 · 0028). */
export default async function DrawingTemplatePage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1100, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>도면 템플릿 · Sub Drawing · 주의사항</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>Set-Up / PLM / Work Process / Design (p39 · p40) — 도면을 뜰 때 함께 나올 하부 도면과 설계 우선순위, 도면에 붙는 주의사항.</p>
      <DrawingTemplate canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
