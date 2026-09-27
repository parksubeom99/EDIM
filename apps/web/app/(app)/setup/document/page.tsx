import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { DocumentSetup } from "./document-setup";

/** Set-Up / CPQ / Document — Tech. Data & Document (청사진 p47 S-3-2,3 · p16) — Output Data · 그래프 · Table List (H6 · 0029). */
export default async function DocumentSetupPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>{" "}
      <Link href="/setup/input-data" style={{ color: "var(--accent)", fontSize: "var(--fs-13)", marginLeft: 12 }}>Input Data 템플릿 →</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Tech. Data &amp; Document Set-Up</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>CPQ &gt; Set-Up &gt; Document (p47 · p16) — Output Data 템플릿 · 그래프 전용 data · Table List. Tech Data 를 만들 때 값이 문서에 박힙니다.</p>
      <DocumentSetup canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
