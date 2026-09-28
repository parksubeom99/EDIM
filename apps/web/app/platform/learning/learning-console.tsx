"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

type Fit = { n: number; maxAbsErr: number; rmse: number; coverage: number; outlierRate?: number };
interface Formula {
  id: string; target: string; expression: string; userTarget: string | null; userExpression: string | null; fit: Fit; supportSources: number;
  outliers: { id: string; err: number }[]; verify: { ok: boolean; reason: string; missingInCompany?: string[] } | null; description: string; localAiNote: string | null; state: string; note: string;
}
interface Step { seq: number; tool: string; state: string; error: string | null; outputRef: Record<string, unknown> | null; cost: { ms: number; rows: number; localAi?: { calls: number; promptTokens: number; outputTokens: number; model: string | null; error?: string } } | null }
interface Data {
  sources: { id: string; kind: string; title: string; origin: string; isSample: boolean; sha8: string | null; byteSize: number | null; monitor: { mismatched?: number; checked?: unknown[] } | null }[];
  plan: { tool: string; title: string; readOnly: boolean }[];
  writeTools: { tool: string; title: string; readOnly: boolean }[];
  latest: { job: { id: string; title: string; state: string }; steps: Step[] } | null;
  formulas: Formula[];
  projections: { id: string; formulaId: string; tenantName: string | null; target: string; userTarget: string | null; userExpression: string | null }[];
  similarity: { matched: number; total: number; ratio: number; goal: number; misses: { id: string; why: string }[] };
  approvedPreview: { matched: number; total: number; ratio: number };
  monitor: { sources: number; drift: { id: string; title: string; monitor: { mismatched: number } }[] };
  tenants: { id: string; name: string; slug: string }[];
  localAi: { on: boolean; model: string | null };
}

const box: CSSProperties = { border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginTop: 14 };
const h2: CSSProperties = { fontSize: 15, margin: "0 0 8px" };
const muted: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)" };
const mono: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" };
const th: CSSProperties = { textAlign: "left", fontWeight: 500, fontSize: "var(--fs-12)", color: "var(--ink-muted)", padding: "3px 6px", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { padding: "3px 6px", borderBottom: "1px solid var(--line)", fontSize: "var(--fs-12)", verticalAlign: "top" };
const btn = (on = false, off = false): CSSProperties => ({ fontSize: "var(--fs-12)", padding: "4px 10px", borderRadius: 4, border: "1px solid var(--accent)", background: on ? "var(--accent)" : "transparent", color: on ? "var(--accent-contrast)" : "var(--accent)", cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1 });
const badge = (c: string): CSSProperties => ({ fontSize: 11, padding: "0 6px", borderRadius: 999, border: `1px solid ${c}`, color: c, whiteSpace: "nowrap" });
const STATE_C: Record<string, string> = { done: "var(--accent)", running: "#a0781c", waiting: "var(--ink-muted)", failed: "#b4232a", proposed: "#a0781c", approved: "var(--accent)", rejected: "#b4232a" };

export function LearningConsole() {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tenant, setTenant] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const r = await fetch("/api/platform/learning", { cache: "no-store" });
    if (r.ok) setD((await r.json()) as Data);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const act = async (key: string, url: string, init: RequestInit) => {
    setBusy(key); setMsg(null);
    const r = await fetch(url, init);
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!r.ok) setMsg(`거부 (${r.status}): ${j.error ?? ""}`);
    await load();
    return r.ok ? j : null;
  };
  if (!d) return <p data-testid="learning" data-ready="0" style={muted}>불러오는 중…</p>;
  const steps = d.latest?.steps ?? [];
  const align = steps.find((s) => s.tool === "align")?.outputRef as { unaligned?: string[]; byLocalAi?: number; byDictionary?: number; localAi?: Record<string, string | null> } | undefined;
  const mine = steps.find((s) => s.tool === "mine")?.outputRef as { records?: number; tried?: number; capped?: boolean } | undefined;
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
  const drawings = d.sources.filter((s) => s.kind === "drawing").length;

  return (
    <div data-testid="learning" data-ready="1" data-job-state={d.latest?.job.state ?? ""}>
      <section style={{ ...box, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span data-testid="local-ai" data-on={d.localAi.on ? "1" : "0"} style={badge(d.localAi.on ? "var(--accent)" : "var(--ink-muted)")}>
          로컬 AI {d.localAi.on ? `켜짐 · ${d.localAi.model}` : "꺼짐 — 결정론 폴백(정렬 사전만)"}
        </span>
        <span style={muted}>외부 API 없음 · 자료는 이 서버 밖으로 나가지 않습니다 · 회사 런타임(BOM Run · EDIM Run)의 LLM 호출은 0</span>
        {msg && <span data-testid="learn-msg" style={{ ...muted, color: "#b4232a" }}>{msg}</span>}
      </section>

      <section style={box}>
        <h2 style={h2}>① 원천 자료 (DB①) <span style={muted}>— 도면 {drawings} · 기술문서 {d.sources.length - drawings} · 샘플 {d.sources.filter((s) => s.isSample).length}</span></h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input data-testid="learn-file" type="file" accept=".dxf,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" data-testid="learn-upload" disabled={!file || busy !== null} style={btn(false, !file || busy !== null)}
            onClick={async () => { if (!file) return; const fd = new FormData(); fd.append("file", file); const j = await act("up", "/api/platform/learning/sources", { method: "POST", body: fd }) as { monitor?: { mismatched: number; checked: unknown[] } } | null; if (j?.monitor) setMsg(null); }}>
            올리기(DB①)
          </button>
          <span style={muted}>.dxf · .csv 만(1수준) · 올리는 순간 승인된 공식에 대어 봅니다(운영 감시)</span>
        </div>
        <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid var(--line)", borderRadius: 4 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>자료</th><th style={th}>종류</th><th style={th}>sha256</th><th style={th}>표지</th><th style={th}>감시</th></tr></thead>
            <tbody>
              {d.sources.map((s) => (
                <tr key={s.id} data-testid="learn-source" data-sample={s.isSample ? "1" : "0"} data-mismatched={s.monitor?.mismatched ?? ""}>
                  <td style={{ ...td, ...mono }}>{s.title}</td><td style={td}>{s.kind === "drawing" ? "도면" : "기술문서"}</td>
                  <td style={{ ...td, ...mono }}>{s.sha8}</td>
                  <td style={td}>{s.isSample ? <span style={badge("#a0781c")}>샘플</span> : <span style={badge("var(--ink-muted)")}>{s.origin}</span>}</td>
                  <td style={td}>{s.monitor ? (s.monitor.mismatched ? <span style={{ color: "#b4232a" }}>어긋남 {s.monitor.mismatched}</span> : `일치 ${(s.monitor.checked ?? []).length}`) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={box}>
        <h2 style={h2}>② 학습 작업 — 계획 먼저, 그 순서대로</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }} data-testid="learn-plan">
          {d.plan.map((p, i) => <span key={p.tool} title={p.title} style={badge("var(--accent)")}>{i + 1}. {p.tool} · 읽기 전용</span>)}
          {d.writeTools.map((p) => <span key={p.tool} title={p.title} style={badge("#b4232a")}>{p.tool} · 쓰기 — 관리자 승인 필수</span>)}
        </div>
        <button type="button" data-testid="learn-run" disabled={busy !== null} style={btn(true, busy !== null)}
          onClick={() => act("run", "/api/platform/learning/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })}>
          {busy === "run" ? "학습 중…" : "작업 만들기 · 실행"}
        </button>
        {d.latest && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }} data-testid="learn-steps">
            <thead><tr><th style={th}>#</th><th style={th}>도구</th><th style={th}>상태</th><th style={th}>ms</th><th style={th}>행</th><th style={th}>로컬 AI(호출 · 토큰)</th><th style={th}>결과</th></tr></thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.seq} data-testid="learn-step" data-tool={s.tool} data-state={s.state}>
                  <td style={td}>{s.seq}</td><td style={{ ...td, ...mono }}>{s.tool}</td>
                  <td style={{ ...td, color: STATE_C[s.state] }}>{s.state}</td>
                  <td style={td}>{s.cost?.ms ?? "—"}</td><td style={td}>{s.cost?.rows ?? "—"}</td>
                  <td style={td}>{s.cost?.localAi?.calls ? `${s.cost.localAi.calls} · ${s.cost.localAi.promptTokens}+${s.cost.localAi.outputTokens}` : "0"}</td>
                  <td style={{ ...td, ...muted }}>{s.error ?? summary(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {align && (
          <p data-testid="learn-align" data-unaligned={(align.unaligned ?? []).length} data-by-ai={align.byLocalAi ?? 0} style={{ ...muted, marginBottom: 0 }}>
            정렬: 사전 {align.byDictionary ?? 0}건 · 로컬 AI {align.byLocalAi ?? 0}건
            {Object.entries(align.localAi ?? {}).map(([k, v]) => <span key={k} style={{ marginLeft: 6 }}>[{k} → {v ?? "모름"}]</span>)}
            {" · "}<b style={{ color: (align.unaligned ?? []).length ? "#b4232a" : "inherit" }}>미정렬 {(align.unaligned ?? []).length}건</b>
            {(align.unaligned ?? []).length ? ` (${(align.unaligned ?? []).join(", ")})` : ""}
            {mine ? ` · 기록 ${mine.records} · 후보 시도 ${mine.tried}${mine.capped ? " (상한 도달)" : ""}` : ""}
          </p>
        )}
      </section>

      <section style={box}>
        <h2 style={h2}>③ 공식 후보 — 합격 기준: 허용 1 mm(제작 공차) · 어긋남 ≤ 5 % · 근거 ≥ 10</h2>
        {d.formulas.length === 0 && <p style={muted}>아직 없음 — 작업을 실행하십시오.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 10 }}>
          {d.formulas.map((f) => (
            <div key={f.id} data-testid="formula-card" data-target={f.target} data-state={f.state} data-expr={f.expression} style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <b style={mono}>{f.target}</b><span style={badge(STATE_C[f.state] ?? "var(--ink-muted)")}>{f.state}</span>
              </div>
              <div data-testid="formula-expr" style={{ ...mono, margin: "6px 0", wordBreak: "break-all" }}>{f.expression}</div>
              <div style={muted}>{f.description}</div>
              {f.localAiNote && <div data-testid="formula-ai-note" style={{ ...muted, marginTop: 4 }}>로컬 AI 설명: {f.localAiNote}</div>}
              <div data-testid="formula-fit" data-n={f.fit.n} data-max-err={f.fit.maxAbsErr} style={{ ...muted, marginTop: 6 }}>
                근거 {f.fit.n}건 · 최대 오차 {f.fit.maxAbsErr} mm · RMSE {f.fit.rmse} · 덮은 비율 {pct(f.fit.coverage)}
              </div>
              {f.outliers.length > 0 && (
                <div data-testid="formula-outliers" data-count={f.outliers.length} style={{ ...muted, color: "#b4232a", marginTop: 4 }}>
                  어긋남 {f.outliers.length}: {f.outliers.map((o) => `${o.id} (${o.err > 0 ? "+" : ""}${o.err})`).join(", ")}
                </div>
              )}
              <div data-testid="formula-company" data-fits={f.userExpression ? "1" : "0"} style={{ ...muted, marginTop: 4 }}>
                회사 형식(π_user): {f.userExpression ? <span style={mono}>{f.userTarget} {f.userExpression}</span> : <span style={{ color: "#a0781c" }}>옮길 수 없음 — 회사 어휘에 없는 이름: {(f.verify?.missingInCompany ?? []).join(", ")}</span>}
              </div>
              {f.state === "rejected" && f.note && <div style={{ ...muted, color: "#b4232a" }}>반려 사유: {f.note}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                {f.state === "proposed" && <>
                  <button type="button" data-testid="formula-approve" disabled={busy !== null} style={btn(true, busy !== null)} onClick={() => act(`a${f.id}`, `/api/platform/learning/formulas/${f.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approved" }) })}>승인</button>
                  <button type="button" data-testid="formula-reject" disabled={busy !== null} style={btn(false, busy !== null)} onClick={() => act(`r${f.id}`, `/api/platform/learning/formulas/${f.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "rejected" }) })}>반려</button>
                </>}
                {f.state === "approved" && <>
                  <select data-testid="formula-tenant" value={tenant[f.id] ?? ""} onChange={(e) => setTenant({ ...tenant, [f.id]: e.target.value })} style={{ fontSize: "var(--fs-12)" }}>
                    <option value="">회사 선택</option>
                    {d.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button type="button" data-testid="formula-project" disabled={!tenant[f.id] || busy !== null} style={btn(true, !tenant[f.id] || busy !== null)}
                    onClick={() => act(`p${f.id}`, `/api/platform/learning/formulas/${f.id}/project`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tenantId: tenant[f.id] }) })}>
                    투영 →
                  </button>
                  <span style={muted}>{d.projections.filter((p) => p.formulaId === f.id).map((p) => p.tenantName).join(", ")}</span>
                </>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...box, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <h2 style={h2}>④ 구조 유사도 계기판</h2>
          <div data-testid="similarity" data-ratio={d.similarity.ratio} data-matched={d.similarity.matched} data-total={d.similarity.total} style={{ fontSize: 26, fontWeight: 600, color: d.similarity.total && d.similarity.ratio >= d.similarity.goal ? "var(--accent)" : "#a0781c" }}>
            {d.similarity.total ? d.similarity.ratio.toFixed(2) : "—"} <span style={{ ...muted, fontSize: 13 }}>/ 목표 {d.similarity.goal.toFixed(2)} · 투영본 {d.similarity.matched}/{d.similarity.total} 이 DB② 형식에 맞음</span>
          </div>
          <p style={muted}>맞음 = 목표 · 변수가 회사 어휘(전장 L · 전폭 W · 전고 H · 구획 합 SECSUM …)에 있고 회사 매크로 검증기 · 시험 실행을 통과.
            승인 공식 기준 예상 {d.approvedPreview.total ? `${d.approvedPreview.matched}/${d.approvedPreview.total}` : "—"}.</p>
          {d.similarity.misses.map((m) => <div key={m.id} style={{ ...muted, color: "#a0781c" }}>· {m.why}</div>)}
        </div>
        <div>
          <h2 style={h2}>⑤ 투영 · 운영 감시</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="projections">
            <thead><tr><th style={th}>회사</th><th style={th}>목표</th><th style={th}>회사 식</th></tr></thead>
            <tbody>{d.projections.map((p) => <tr key={p.id} data-testid="projection-row"><td style={td}>{p.tenantName}</td><td style={{ ...td, ...mono }}>{p.target}</td><td style={{ ...td, ...mono }}>{p.userExpression ?? "—(옮길 수 없음)"}</td></tr>)}</tbody>
          </table>
          <p data-testid="monitor" data-drift={d.monitor.drift.length} style={{ ...muted, marginTop: 8 }}>
            새로 올린 원천 {d.monitor.sources}건을 승인 공식에 대어 봄 · 어긋난 원천 <b style={{ color: d.monitor.drift.length ? "#b4232a" : "inherit" }}>{d.monitor.drift.length}</b>건
            {d.monitor.drift.map((x) => ` · ${x.title}`).join("")} (자동 조치 없음 — 분포 변화 경보의 씨앗)
          </p>
        </div>
      </section>
    </div>
  );
}

function summary(s: Step): string {
  const o = s.outputRef ?? {};
  if (s.tool === "extract") return `원천 ${o.sources ?? 0} → 특징 ${o.features ?? 0}`;
  if (s.tool === "align") return `정렬 ${o.features ?? 0} · 미정렬 ${((o.unaligned as string[]) ?? []).length}`;
  if (s.tool === "mine") return `합격 ${((o.accepted as unknown[]) ?? []).length} · 시도 ${o.tried ?? 0}`;
  if (s.tool === "verify") return `후보 ${o.proposed ?? 0} · 반려 ${o.rejected ?? 0}`;
  return "";
}
