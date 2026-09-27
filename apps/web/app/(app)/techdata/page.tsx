import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { TechdataList } from "./techdata-list";

/** p15 [ERP / CPQ / Tech.] — Technical data 목록(F7). */
export default async function TechdataPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/workbench" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← MainForm</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Technical Data 목록</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>ERP / CPQ / Tech. (p15) · 스냅샷별 Tech Data 문서와 그때 받은 Input Data 값.</p>
      <TechdataList />
    </main>
  );
}
