import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { CompanyDb } from "./company-db";

/** ERP Set-up / Company DB — 청사진 p64 (D-1) Customer · Supplier. */
export default async function CompanyDbPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Company DB · 고객 · 공급처</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>ERP Set-up (p64) · 프로젝트의 고객과 단가 이력의 공급처가 이 목록을 가리킵니다.</p>
      <CompanyDb canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
