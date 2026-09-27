import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { MfgRates } from "./mfg-rates";

/** p66 [Work Process management] Manufacturing Cost Table · p67 제조 정보(시간 · 임율 · 장비) → BOM Run 인건비 (F10 · 0026). */
export default async function MfgPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1100, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Manufacturing Cost Table</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>Work Process management &gt; Manufacturing Cost (p66) · 제조 정보 — 시간 · 임율 · 장비 (p67). 등록되면 다음 BOM Run 부터 인건비 = Σ 시간 × 임율.</p>
      <MfgRates canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
