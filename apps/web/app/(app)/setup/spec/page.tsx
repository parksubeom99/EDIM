import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { SpecItems } from "./spec-items";

/** Set-up / 사양 항목 — 청사진 p46 (S-3-1) [Spec List in-put table] · 각각의 사양 입력. */
export default async function SpecPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>사양 항목 · Spec List in-put table</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>Set-up / CPQ / Selection (p46) · 제품 코드마다 사양 항목을 정의하면, 작업대 Code 탭에서 사양 값을 넣고 등록된 코드 값을 추천받습니다. 저장은 기존 개정(Rev) 한 곳.</p>
      <SpecItems canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
