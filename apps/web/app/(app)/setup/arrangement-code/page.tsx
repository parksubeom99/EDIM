import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { ArrangementCodes } from "./arrangement-codes";

/** Set-up / Arrangement Code — 청사진 p35 (S-1-5) Arrangement Code Registration · 승인 절차. */
export default async function ArrangementCodePage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Arrangement Code</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>Product &gt; Item &gt; Hierarchy &gt; Relationship (p35) · 제품 배치를 코드로 등록 → 승인 → 제품에 적용. 적용은 Design 탭과 같은 저장 규칙을 탑니다.</p>
      <ArrangementCodes canEdit={canEditCatalog(session.role)} isOwner={session.role === "owner"} />
    </main>
  );
}
