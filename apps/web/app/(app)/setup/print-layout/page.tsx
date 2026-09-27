import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { LayoutEditor } from "./layout-editor";

/** Set-Up / CPQ / Document / Print — 인쇄 양식 편집기 (청사진 p48 · H9 · 0030): 기본 양식 배치 · Data 위치 설정 · 그래프 불러오기. */
export default async function PrintLayoutPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>{" "}
      <Link href="/setup/print" style={{ color: "var(--accent)", fontSize: "var(--fs-13)", marginLeft: 12 }}>Print 설정(용지 · 글꼴) →</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>인쇄 양식 편집기</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>CPQ &gt; Set-Up &gt; Document &gt; Print (p48) — 양식 안 요소를 끌어 배치하고 크기를 바꿉니다. 저장할 때마다 새 버전 · 발행된 문서는 발행 순간의 버전 그대로.</p>
      <LayoutEditor canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
