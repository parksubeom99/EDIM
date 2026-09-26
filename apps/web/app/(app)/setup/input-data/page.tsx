import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { InputItems } from "./input-items";

/** Set-up / Input Data 템플릿 — 청사진 p16 (C-2) [ERP / CPQ / Document Template] Input Data · p47. */
export default async function InputDataPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Input Data 템플릿</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>Document Template (p16) · Tech Data 를 만들 때 받는 입력 항목(온도·습도 …)과 단위·기본값·범위.</p>
      <InputItems canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
