import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { CodingList } from "./coding-list";

/** Set-Up / CPQ / Document ▸ Coding List (청사진 p47 · H7) — 노드마다 승인 매크로 1개. 읽기 전용 목록 · 행에서 작업대로. */
export default async function CodingListPage() {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/setup" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Set-Up</Link>{" "}
      <Link href="/workbench" style={{ color: "var(--accent)", fontSize: "var(--fs-13)", marginLeft: 12 }}>작업대 →</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>Coding List</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>Tech. Data &amp; Document (p47) — 노드마다 승인 매크로 1개. 어느 노드에 어떤 개정이 붙었고, 마지막 BOM 이 어느 개정으로 돌았는지. 매크로를 고치고 승인하는 곳은 작업대 Macro 탭입니다.</p>
      <CodingList />
    </main>
  );
}
