import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { MaterialRegistry } from "./material-registry";

/** Set-up / PLM / Sub Code — Material code & General purchase items Registration (청사진 p32 · S-1-2) + 단가 이력(p67). */
export default async function MaterialPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1320, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Material code &amp; General purchase items</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>Code &gt; Code Management &gt; Sub Code &gt; Raw material Or GPI (p32) · 속성은 구매품 코드의 buy 표 한 곳에, 단가는 날짜별 이력으로 쌓습니다(p67).</p>
      <MaterialRegistry canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
