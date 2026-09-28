import Link from "next/link";
import { getPlatformSession } from "@/app/lib/platform-session";
import { LearningConsole } from "./learning-console";

/**
 * B · 플랫폼 콘솔 '학습' — 학습 AI 1수준(DB① 전용). 원천 → 작업(계획 · 단계 · 비용) → 공식 후보 → 승인(라벨) → 투영(π_user) → 유사도 · 감시.
 * 회사 계정으로는 열리지 않는다(DB① 은 회사가 읽지도 쓰지도 못한다).
 */
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const s = await getPlatformSession();
  if (!s)
    return (
      <main style={{ maxWidth: 640, margin: "12vh auto", padding: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--warn)" }}>403 — 플랫폼 관리자 전용</h1>
        <p style={{ color: "var(--ink-muted)" }}>학습 DB(DB①)는 플랫폼 관리자 계정으로만 열립니다.</p>
        <Link href="/login" style={{ color: "var(--accent)" }}>→ 로그인</Link>
      </main>
    );
  return (
    <main style={{ maxWidth: 1180, margin: "4vh auto", padding: 24 }}>
      <Link href="/platform" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Platform Console</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 4px" }}>학습 AI · 1수준</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>
        도면(DXF)·기술문서(CSV)를 DB① 에만 올리면 → 추출 → 정렬화 → 공식 탐구 → 검증. 사람이 승인한 공식만 회사로 한쪽 방향 투영됩니다.
        공식은 결정론으로 찾고, 로컬 AI 는 사전 밖 이름 맞추기와 설명 한 줄만 돕습니다. <b>지금 자료는 전부 샘플</b>입니다.
      </p>
      <LearningConsole />
    </main>
  );
}
