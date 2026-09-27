import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { isErpKind } from "@/app/lib/erp-master";
import { ErpMaster } from "./erp-master";

/** ERP Set-up 기준정보 — 청사진 p64 (D-1) Department Std. · Warehouse · Inventory · Bank · Employee · Nation (H4 · 0027). */
export default async function ErpMasterPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  const { kind } = await searchParams;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>{" "}
      <Link href="/setup/company" style={{ color: "var(--accent)", fontSize: "var(--fs-13)", marginLeft: 12 }}>Company DB (고객 · 공급처) →</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>ERP 기준정보</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>ERP Set-up (p64) · Department Std. · Warehouse · Inventory · Bank · Employee · Nation — 회사가 채우는 기준 목록입니다.</p>
      <ErpMaster canEdit={canEditCatalog(session.role)} initialKind={isErpKind(kind) ? kind : "department"} />
    </main>
  );
}
