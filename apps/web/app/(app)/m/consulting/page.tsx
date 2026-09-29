import Link from "next/link";
import type { CSSProperties } from "react";
import { withTenant } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canUseConsulting, internalReport, benchmark, type BenchRow } from "@/app/lib/consulting-run";

/**
 * ccmd K · KB — 컨설팅 두 트랙(새 화면 · 기존 모듈 메뉴는 그대로).
 *   트랙 1 내부 최적안: 회사 **자기** BOM 스냅샷을 분석한 제안(공급처 · 팬 효율 · 설계 여유) — 읽기 전용 · 인쇄본.
 *   트랙 2 업계 안 우리 위치: DB 함수가 주는 **집계 숫자만**(p25 · p50 · p75 · 우리 값 · 백분위) · 표본 3곳 미만이면 숨김.
 * owner · engineer 만(viewer 403 안내).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cell: CSSProperties = { border: "1px solid var(--line)", padding: "4px 8px", fontSize: 13, textAlign: "left", verticalAlign: "top" };
const KIND: Record<string, string> = { supplier: "공급처", fan: "팬 효율", margin: "설계 여유" };
const fmt = (v: number | null, unit: string) => v === null ? "—" : unit === "₩/CMH" ? `₩${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}` : v.toLocaleString("ko-KR", { maximumFractionDigits: 4 });

function Bar({ r }: { r: BenchRow }) {
  if (r.suppressed || r.p25 === null || r.p75 === null || r.p50 === null) return null;
  const lo = Math.min(r.p25, r.mine ?? r.p25), hi = Math.max(r.p75, r.mine ?? r.p75);
  const span = hi - lo || 1;
  const x = (v: number) => `${((v - lo) / span) * 100}%`;
  return (
    <div style={{ position: "relative", height: 18, background: "var(--surface-2)", borderRadius: 3, minWidth: 220 }} aria-label={`${r.label} 분포`}>
      <div style={{ position: "absolute", left: x(r.p25), width: `calc(${x(r.p75)} - ${x(r.p25)})`, top: 4, height: 10, background: "var(--accent-soft, #cfe6e1)", borderRadius: 2 }} />
      <div style={{ position: "absolute", left: x(r.p50), top: 1, width: 2, height: 16, background: "var(--ink-muted)" }} title="p50" />
      {r.mine !== null && <div data-testid={`bench-mine-${r.metric}`} style={{ position: "absolute", left: x(r.mine), top: 0, width: 4, height: 18, background: "var(--accent)" }} title="우리 값" />}
    </div>
  );
}

export default async function ConsultingPage({ searchParams }: { searchParams: Promise<{ runId?: string }> }) {
  const s = await getServerSession();
  if (!s) return <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><Link href="/login">로그인</Link></main>;
  if (!canUseConsulting(s.role))
    return <main data-testid="consulting-forbidden" style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}><h1 style={{ color: "var(--warn)" }}>403 — 접근 권한 없음</h1><p>컨설팅은 회사 관리자(owner) · 기술(engineer)만 봅니다. 현재 역할: {s.role}</p></main>;
  const sp = await searchParams;
  const runId = sp.runId && UUID.test(sp.runId) ? sp.runId : null;
  const [rep, bench, recent] = await Promise.all([
    internalReport(s.tenantId, runId),
    benchmark(s.tenantId),
    withTenant(s.tenantId, (tx) => tx.bomCodeRun.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 8, select: { id: true, code: true, createdAt: true } })),
  ]);
  return (
    <main data-testid="consulting" data-ready="1" data-run={rep?.runId ?? ""} style={{ maxWidth: 1120, margin: "4vh auto", padding: "12px 20px", display: "grid", gap: 14 }}>
      <Link href="/" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← back to Main Form</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: 0 }}>컨설팅 — 내부 최적안 · 업계 안 우리 위치</h1>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)" }}>결정론 분석(LLM 0) · 읽기 전용 — 적용 버튼은 없습니다. 적용은 사람이 기존 화면(단가 이력 · Special · 설계 규칙)에서 합니다. <b>샘플 단가 · 샘플 운전시간</b>.</p>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
        분석할 스냅샷:
        {recent.map((r) => <Link key={r.id} data-testid={`consulting-run-${r.id}`} href={`/m/consulting?runId=${r.id}`} style={{ color: r.id === rep?.runId ? "var(--ink)" : "var(--accent)", fontWeight: r.id === rep?.runId ? 700 : 400 }}>{r.code} · {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</Link>)}
      </nav>
      <section data-testid="consulting-internal" data-count={rep?.proposals.length ?? 0}>
        <h2 style={{ fontSize: 16, margin: "4px 0" }}>트랙 1 · 내부 최적안 {rep && <a data-testid="consulting-print-link" href={`/api/consulting/print?runId=${rep.runId}`} target="_blank" style={{ fontSize: 12, marginLeft: 8, color: "var(--accent)" }}>인쇄본(A4) ↗</a>}</h2>
        {!rep ? <p>BOM 스냅샷이 없습니다 — 먼저 BOM Run 을 하십시오.</p> : (
          <>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--ink-muted)" }}>스냅샷 <span style={{ fontFamily: "monospace" }}>{rep.runId.slice(0, 8)}</span> · {rep.code} · 분석 {rep.analyzedOn} · 제안 {rep.proposals.length}건 · 합계 ₩{rep.totals.krw.toLocaleString("ko-KR")} · {rep.totals.kwh.toLocaleString("ko-KR")} kWh/년 · 가정 운전시간 {rep.hoursPerYear.toLocaleString("ko-KR")} h/년(샘플)</p>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr>{["분류", "제안", "절감", "근거 행"].map((h) => <th key={h} style={{ ...cell, background: "var(--surface-2)" }}>{h}</th>)}</tr></thead>
              <tbody>
                {rep.proposals.map((p, i) => (
                  <tr key={i} data-testid={`proposal-${p.kind}`} data-evidence={p.evidence.map((e) => `${e.kind}:${e.id}`).join(" ")}>
                    <td style={cell}>{KIND[p.kind]}</td>
                    <td style={cell}><b>{p.title}</b><br /><span style={{ color: "var(--ink-muted)", fontSize: 12 }}>{p.detail}</span></td>
                    <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>{p.saving ? `${p.saving.amount.toLocaleString("ko-KR")} ${p.saving.unit === "KRW" ? "원" : "kWh/년"}` : "—"}</td>
                    <td style={{ ...cell, fontFamily: "monospace", fontSize: 11 }}>{p.evidence.map((e, k) => <div key={k}>{e.kind}:{e.id.length > 40 ? `${e.id.slice(0, 40)}…` : e.id}</div>)}</td>
                  </tr>
                ))}
                {rep.proposals.length === 0 && <tr><td colSpan={4} style={cell}>이 스냅샷에서 찾은 제안이 없습니다.</td></tr>}
              </tbody>
            </table>
            <p data-testid="consulting-fan-note" style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>팬 효율: {rep.fanNote}</p>
          </>
        )}
      </section>
      <section data-testid="consulting-benchmark">
        <h2 style={{ fontSize: 16, margin: "4px 0" }}>트랙 2 · 업계 안 우리 위치 <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-muted)" }}>익명 · 집계 — 회사당 최신 스냅샷 1개 · 표본 n 곳 · 샘플</span></h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{["지표", "표본", "분포(p25 ~ p75 · 막대 = 우리)", "p25", "p50", "p75", "우리 값 · 백분위"].map((h) => <th key={h} style={{ ...cell, background: "var(--surface-2)" }}>{h}</th>)}</tr></thead>
          <tbody>
            {bench.map((r) => (
              <tr key={r.metric} data-testid={`bench-${r.metric}`} data-n={r.n} data-suppressed={r.suppressed ? "1" : "0"} data-mine={r.mine ?? ""} data-percentile={r.percentile ?? ""}>
                <td style={cell}>{r.label}</td>
                <td style={cell}>표본 {r.n} 곳 · 샘플</td>
                {r.suppressed
                  ? <td colSpan={5} style={{ ...cell, color: "var(--ink-muted)" }} data-testid={`bench-hidden-${r.metric}`}>표본이 3곳 미만이라 보여 드리지 않습니다</td>
                  : <>
                      <td style={cell}><Bar r={r} /></td>
                      <td style={cell}>{fmt(r.p25, r.unit)}</td><td style={cell}>{fmt(r.p50, r.unit)}</td><td style={cell}>{fmt(r.p75, r.unit)}</td>
                      <td style={cell}>{fmt(r.mine, r.unit)}{r.percentile !== null ? ` · 백분위 ${r.percentile}` : r.mine === null ? " (최신 스냅샷에 값 없음)" : ""}</td>
                    </>}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>다른 회사의 이름 · 행 값은 이 화면에 오지 않습니다 — DB 함수가 집계 숫자만 줍니다. 부르는 회사는 로그인한 회사로 정해집니다.</p>
      </section>
    </main>
  );
}
