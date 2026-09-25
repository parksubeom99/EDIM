import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { UiDesigner } from "./ui-designer";

/** EDIM Toolbox > UI Design — 청사진 p25 사용자 UI Form · p26 (S-2-1) UI Design 작업장. */
export default async function UiDesignPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1420, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/workbench" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← MainForm</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>EDIM UI Design</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>EDIM Toolbox &gt; UI Design (p25 · p26) · 위젯을 캔버스에 놓고 각각의 동작·대상 Data 를 정한 뒤, Run 으로 실제 데이터에 돌려 봅니다.</p>
      <UiDesigner canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
