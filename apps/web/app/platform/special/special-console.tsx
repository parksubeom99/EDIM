"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

interface Data {
  programs: { key: string; version: number; title: string; pricePerRun: number; currency: string; state: string; isSample: boolean; binding: unknown }[];
  grants: { tenantId: string; tenantName: string | null; programKey: string; grantedAt: string; runs: number; amount: number; currency: string }[];
  requests: { id: string; tenantName: string | null; subject: string; payload: { detail?: string; program?: string; formId?: string } | null; state: string; requestedAt: string }[];
}
const box: CSSProperties = { border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginTop: 14 };
const th: CSSProperties = { textAlign: "left", fontWeight: 500, fontSize: "var(--fs-12)", color: "var(--ink-muted)", padding: "4px 6px", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { padding: "4px 6px", borderBottom: "1px solid var(--line)", fontSize: "var(--fs-13)" };
const btn: CSSProperties = { fontSize: "var(--fs-12)", padding: "3px 10px", borderRadius: 4, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--accent-contrast)", cursor: "pointer" };
const won = (n: number) => n.toLocaleString("ko-KR");

export function SpecialConsole() {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await fetch("/api/platform/special", { cache: "no-store" }); if (r.ok) setD((await r.json()) as Data); }, []);
  useEffect(() => { void load(); }, [load]);
  if (!d) return <p data-testid="special-console" data-ready="0">불러오는 중…</p>;
  return (
    <div data-testid="special-console" data-ready="1">
      <section style={box}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>프로그램</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>key</th><th style={th}>이름</th><th style={th}>버전</th><th style={th}>1회 요금</th><th style={th}>표지</th></tr></thead>
          <tbody>{d.programs.map((p) => (
            <tr key={p.key} data-testid="special-program" data-key={p.key} data-price={p.pricePerRun}>
              <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{p.key}</td><td style={td}>{p.title}</td><td style={td}>v{p.version}</td>
              <td style={td}>{won(p.pricePerRun)} {p.currency}</td><td style={td}>{p.isSample ? "샘플" : ""}</td>
            </tr>))}</tbody>
        </table>
      </section>
      <section style={box}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>들어온 Special 의뢰</h2>
        {msg && <p data-testid="special-msg" style={{ color: "var(--warn)", fontSize: "var(--fs-12)" }}>{msg}</p>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>회사</th><th style={th}>제목</th><th style={th}>프로그램</th><th style={th}>상태</th><th style={th}></th></tr></thead>
          <tbody>{d.requests.map((r) => {
            const granted = d.grants.some((g) => g.tenantName === r.tenantName && g.programKey === (r.payload?.program ?? ""));
            return (
              <tr key={r.id} data-testid="special-request" data-state={r.state} data-program={r.payload?.program ?? ""}>
                <td style={td}>{r.tenantName}</td><td style={td}>{r.subject}</td><td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.payload?.program ?? "—"}</td>
                <td style={td}>{r.state}{granted ? " · 부여됨" : ""}</td>
                <td style={td}>{r.payload?.program && r.state !== "rejected" && !granted && (
                  <button type="button" data-testid="special-grant" style={btn} onClick={async () => {
                    setMsg(null);
                    const res = await fetch("/api/platform/special", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: r.id, programKey: r.payload?.program }) });
                    const j = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) setMsg(`거부 (${res.status}): ${j.error ?? ""}`);
                    await load();
                  }}>승인 + 부여</button>)}</td>
              </tr>);
          })}</tbody>
        </table>
      </section>
      <section style={box}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>부여 · 과금(사용 기록의 금액 칸만 — 입력·결과는 플랫폼 권한 밖)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>회사</th><th style={th}>프로그램</th><th style={th}>사용</th><th style={th}>요금 합계(샘플 단가)</th></tr></thead>
          <tbody>{d.grants.map((g) => (
            <tr key={`${g.tenantId}${g.programKey}`} data-testid="special-grant-row" data-runs={g.runs} data-amount={g.amount}>
              <td style={td}>{g.tenantName}</td><td style={{ ...td, fontFamily: "var(--font-mono)" }}>{g.programKey}</td><td style={td}>{g.runs}회</td><td style={td}>{won(g.amount)} {g.currency}</td>
            </tr>))}</tbody>
        </table>
      </section>
    </div>
  );
}
