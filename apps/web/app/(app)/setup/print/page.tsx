import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { PrintSetup } from "./print-setup";

/** CPQ > Set-Up > Document > Print Form — 청사진 p48 (S-3-4) Print Set-up Form. */
export default async function PrintSetupPage() {
  const session = await getServerSession();
  if (!session)
    return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1180, margin: "4vh auto", padding: 24 }}>
      <Link href="/workbench" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← MainForm</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "12px 0 4px" }}>Print Set-up Form</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>CPQ &gt; Set-Up &gt; Document &gt; Print Form (p48) · 문서 종류마다 인쇄 양식 하나 — 모양만 정하고 숫자는 건드리지 않습니다.</p>
      <PrintSetup canEdit={canEditProject(session.role)} />
    </main>
  );
}
