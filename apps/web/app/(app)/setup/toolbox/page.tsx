import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canEditCatalog } from "@/app/lib/catalog";
import { ToolboxSetup } from "./toolbox-setup";

/** Set-Up / EDIM System Toolbar ▸ Toolbox Macro (청사진 p57 · H8) — Data Management · 함수 마법사 · 그래프 마법사. */
export default async function ToolboxPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>{" "}
      <Link href="/setup/coding-list" style={{ color: "var(--accent)", fontSize: "var(--fs-13)", marginLeft: 12 }}>Coding List →</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Toolbox Macro</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>EDIM System Toolbar (p57) — Data Management · 함수 마법사 · 그래프 마법사. 식의 저장·승인은 작업대 Macro 탭 한 곳입니다.</p>
      <ToolboxSetup canEdit={canEditCatalog(session.role)} />
    </main>
  );
}
