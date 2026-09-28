import Link from "next/link";
import { getPlatformSession } from "@/app/lib/platform-session";
import { SpecialConsole } from "./special-console";

/** C · 플랫폼 콘솔 'Special' — 프로그램 · 들어온 의뢰(승인 = 부여까지 한 번에) · 부여와 과금(샘플 단가). */
export const dynamic = "force-dynamic";

export default async function SpecialPage() {
  const s = await getPlatformSession();
  if (!s)
    return (
      <main style={{ maxWidth: 640, margin: "12vh auto", padding: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--warn)" }}>403 — 플랫폼 관리자 전용</h1>
        <Link href="/login" style={{ color: "var(--accent)" }}>→ 로그인</Link>
      </main>
    );
  return (
    <main style={{ maxWidth: 1080, margin: "4vh auto", padding: 24 }}>
      <Link href="/platform" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← Platform Console</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 4px" }}>Special Tool Box</h1>
      <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>
        회사가 의뢰하면 → 여기서 승인과 부여를 한 번에 → 그 회사 Toolbox 에 버튼이 생깁니다. 계산은 서버 결정론, 곡선 원자료는 회사로 나가지 않습니다(교점 구간만). <b>성능표·단가는 샘플</b>입니다.
      </p>
      <SpecialConsole />
    </main>
  );
}
