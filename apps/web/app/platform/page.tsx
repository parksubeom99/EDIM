import Link from "next/link";
import { businessDateOf } from "@/app/lib/today";
import {
  listTenantsForPlatform,
  listPlatformRequests,
  platformDbStatus,
} from "@edim/db";
import { getPlatformSession } from "@/app/lib/platform-session";
import { RequestQueue } from "./platform-console";

/**
 * ※③ 관리자 영역 — 플랫폼 관리자 콘솔 (P3-a, 구조만).
 *
 * (app) 그룹 **밖**에 있다: 그 레이아웃은 테넌트 세션을 요구하고, 플랫폼
 * 관리자는 테넌트 밖의 주체이기 때문이다. 반대로 이 화면은 테넌트 세션으로는
 * 열리지 않는다.
 *
 * 여기서 볼 수 있는 것은 테넌트 메타(이름·slug·가입일)와 요청 대기열뿐이다.
 * 고객사 업무 데이터로 가는 길은 두지 않았다(Q2 = 나중에) — 앱이 참는 게 아니라
 * edim_platform 역할에 업무 테이블 권한이 아예 없다.
 */
export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const session = await getPlatformSession();

  if (!session) {
    return (
      <main style={{ maxWidth: 640, margin: "12vh auto", padding: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            color: "var(--warn)",
          }}
        >
          403 — 플랫폼 관리자 전용
        </h1>
        <p style={{ color: "var(--ink-muted)" }}>
          이 영역(※③ 관리자 소유)은 플랫폼 관리자 계정으로만 열립니다. 회사
          계정으로는 접근할 수 없습니다.
        </p>
        <Link href="/login" style={{ color: "var(--accent)" }}>
          → 로그인
        </Link>
      </main>
    );
  }

  const [tenants, requests, status] = await Promise.all([
    listTenantsForPlatform(),
    listPlatformRequests(),
    platformDbStatus(),
  ]);

  const box: React.CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  };
  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: "var(--fs-13)",
    color: "var(--ink-muted)",
    fontWeight: 400,
    padding: "4px 8px",
    borderBottom: "1px solid var(--line)",
  };
  const td: React.CSSProperties = {
    padding: "6px 8px",
    borderBottom: "1px solid var(--line)",
  };

  return (
    <main style={{ maxWidth: 940, margin: "6vh auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          Platform Console
        </h1>
        <span style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
          {session.email} · 플랫폼 관리자
        </span>
      </header>
      <p style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
        ※③ 관리자 영역. 고객사 업무 데이터는 보이지 않습니다 — 여기서 볼 수 있는
        것은 테넌트 메타와 올라온 요청뿐입니다.
      </p>

      <section style={box}>
        <h2 style={{ fontSize: 15, margin: 0, display: "flex", justifyContent: "space-between" }}>DB① 학습 DB
          <Link href="/platform/learning" data-testid="platform-learning-link" style={{ fontSize: "var(--fs-13)", color: "var(--accent)", fontWeight: 400 }}>학습 →</Link>
        </h2>
        <p style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
          원천자료 {status.learningSources}건 · 등록된 플랫폼 관리자{" "}
          {status.admins}명
        </p>
        <p
          style={{
            color: "var(--ink-muted)",
            fontSize: "var(--fs-13)",
            margin: 0,
          }}
        >
          {status.learningSources === 0
            ? "비어 있음 — 학습 탭에서 도면(DXF)·기술문서(CSV)를 올립니다."
            : "원천자료가 등록되어 있습니다 — 학습 탭에서 작업을 돌리고, 승인한 공식만 회사로 투영합니다."}
        </p>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>테넌트</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>회사</th>
              <th style={th}>slug</th>
              <th style={th}>가입일</th>
              <th style={th}>요청</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.name}</td>
                <td
                  style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--accent)" }}
                >
                  {t.slug}
                </td>
                <td style={td}>
                  {businessDateOf(t.createdAt)}
                </td>
                <td style={td}>
                  {t.requestCount}
                  {t.pendingCount > 0 ? ` (대기 ${t.pendingCount})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>요청 대기열</h2>
        <p style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
          회사에서 플랫폼으로 올라오는 유일한 통로입니다. 지금 올라오는 종류는
          Special 의뢰/문의뿐입니다(회장님 결정 Q1 = 좁게).
        </p>
        <RequestQueue
          initial={requests.map((r) => ({
            id: r.id,
            tenantName: r.tenantName ?? "?",
            kind: r.kind,
            subject: r.subject,
            detail:
              typeof (r.payload as { detail?: unknown })?.detail === "string"
                ? ((r.payload as { detail?: string }).detail as string)
                : "",
            state: r.state,
            requestedAt: new Date(r.requestedAt).toISOString().slice(0, 16).replace("T", " "),
            decisionNote: r.decisionNote,
          }))}
        />
      </section>
    </main>
  );
}
