import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { Viewer3D } from "./viewer3d";

/** ⑩ 3D 보기 — 청사진 p4 DWG 3D · p37. BOM 스냅샷의 구획 박스를 브라우저에서 돌려 본다(읽기 전용). */
export default async function Viewer3DPage({ searchParams }: { searchParams: Promise<{ runId?: string }> }) {
  const session = await getServerSession();
  if (!session) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  const { runId = "" } = await searchParams;
  return (
    <main style={{ maxWidth: 1240, margin: "3vh auto", padding: "16px 24px" }}>
      <Link href="/workbench" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← MainForm</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>3D 보기</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>DWG 3D (p4 · p37) · 도면과 같은 BOM 스냅샷의 구획 길이 × 단면(W×H)을 그대로 쌓았습니다. 숫자를 다시 계산하지 않습니다.</p>
      {runId ? <Viewer3D runId={runId} /> : <p style={{ marginTop: 16 }}>runId 가 없습니다 — 작업대 Design 탭에서 BOM Run 뒤 “3D 보기”를 누르십시오.</p>}
    </main>
  );
}
