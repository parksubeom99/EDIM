"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { WorkbenchProject } from "./mainform-shell";
import type { RunResult } from "./action-bar";

interface MacroRow { id: string; dsl: string; status: string; revision: number; verified: boolean; createdAt: string }
interface Diag { severity: string; message: string; code?: string }

const SAMPLE_DSL = "=IF(CAP,CAP>25, SUM(Table1(A,4:4))*Var(NS,15)*Var(NS,20), SUM(Table1(A,1:1))*Var(NS,20))";

const card: CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 14 };
const h: CSSProperties = { fontFamily: "var(--font-display)", fontSize: "var(--fs-14)", fontWeight: 600, margin: "0 0 8px" };
const muted: CSSProperties = { color: "var(--ink-muted)", fontSize: "var(--fs-12)" };
const btn = (primary = false): CSSProperties => ({
  fontFamily: "var(--font-body)", fontSize: "var(--fs-12)", color: primary ? "var(--accent-contrast)" : "var(--ink)",
  background: primary ? "var(--accent)" : "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
  padding: "5px 10px", cursor: "pointer",
});
const statusColor: Record<string, string> = { draft: "var(--warn)", approved: "var(--accent)", rejected: "var(--ink-muted)", superseded: "var(--ink-muted)" };

export function MacroPanel({
  project, nodeStable, canEdit, canDecide, runs,
}: { project: WorkbenchProject | null; nodeStable: string | null; canEdit: boolean; canDecide: boolean; runs: RunResult[] }) {
  const [dsl, setDsl] = useState(SAMPLE_DSL);
  const [diags, setDiags] = useState<Diag[] | null>(null);
  const [rows, setRows] = useState<MacroRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!nodeStable) return;
    const r = await fetch(`/api/macros?node=${nodeStable}`);
    if (r.ok) setRows(((await r.json()) as { macros: MacroRow[] }).macros);
  }, [nodeStable]);
  useEffect(() => { void load(); }, [load]);

  async function post(mode: "verify" | "draft") {
    if (!nodeStable) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/macros", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ node: nodeStable, dsl, mode }) });
    const j = (await r.json()) as { macroId: string | null; diagnostics: Diag[]; error?: string };
    setBusy(false);
    setDiags(j.diagnostics ?? []);
    if (j.error) setMsg(j.error);
    else if (mode === "draft") setMsg(j.macroId ? `초안 저장됨 (${j.macroId.slice(0, 8)})` : "오류가 있어 초안 저장 안 됨");
    else setMsg((j.diagnostics ?? []).some((d) => d.severity === "error") ? "검증 실패" : "검증 통과");
    void load();
  }
  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/macros/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
    const j = (await r.json()) as { ok: boolean; reason?: string };
    setBusy(false); setMsg(j.ok ? `${decision === "approve" ? "승인" : "반려"} 완료` : `거부: ${j.reason ?? r.status}`);
    void load();
  }
  const lastRun = runs.find((r) => r.kind === "edim");

  return (
    <div data-testid="macro-panel" style={card}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <div style={h}>Macro · EDIM Toolbox</div>
        <span style={muted}>Prompt → Macro(DSL) → Verify → Approve → Run (p57) · 런타임 무LLM</span>
        <a href="/setup/coding-list" data-testid="macro-coding-list" style={{ marginLeft: "auto", fontSize: "var(--fs-12)", color: "var(--accent)" }}>Coding List →</a>
      </div>
      {!project && <p style={{ ...muted, margin: "0 0 8px" }}>프로젝트 노드를 선택하면 매크로가 그 노드에 바인딩됩니다.</p>}
      <textarea
        data-testid="macro-dsl" value={dsl} onChange={(e) => setDsl(e.target.value)} rows={3} spellCheck={false}
        style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: "var(--fs-13)", background: "var(--surface-1)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: 8, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
        <button type="button" data-testid="macro-verify" disabled={busy || !nodeStable} style={btn()} onClick={() => post("verify")}>Verify</button>
        {canEdit && <button type="button" data-testid="macro-draft" disabled={busy || !nodeStable} style={btn(true)} onClick={() => post("draft")}>Save draft</button>}
        <span style={muted}>코드참조 A B C D E F CAP CMH · SUM(Table1(A|B|C, r:r)) · Var(NS, 10|15|20)</span>
        {msg && <span data-testid="macro-msg" style={{ marginLeft: "auto", fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>{msg}</span>}
      </div>
      {diags && diags.length > 0 && (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: "var(--fs-12)" }}>
          {diags.map((d, i) => <li key={i} style={{ color: d.severity === "error" ? "var(--warn)" : "var(--ink-muted)" }}>[{d.severity}] {d.message}</li>)}
        </ul>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>Registry · 이 노드의 매크로</div>
        {rows.length === 0 ? <span style={muted}>없음</span> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-12)" }}>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} data-macro-status={m.status} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "6px 4px", fontFamily: "var(--font-mono)", color: statusColor[m.status] ?? "var(--ink)", whiteSpace: "nowrap" }}>{m.status} r{m.revision}</td>
                  <td style={{ padding: "6px 4px", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{m.dsl}</td>
                  <td style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>
                    {canDecide && m.status === "draft" && (
                      <>
                        <button type="button" data-testid="macro-approve" disabled={busy} style={btn(true)} onClick={() => decide(m.id, "approve")}>승인</button>{" "}
                        <button type="button" data-testid="macro-reject" disabled={busy} style={btn()} onClick={() => decide(m.id, "reject")}>반려</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 14, padding: 10, background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
        <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>마지막 EDIM Run</div>
        <span data-testid="macro-last-run" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-13)", color: lastRun?.status === "ran" ? "var(--accent)" : "var(--ink-muted)" }}>
          {lastRun ? `${lastRun.status} · ${lastRun.message}` : "아직 실행 없음 — Action Bar → EDIM Run"}
        </span>
      </div>
    </div>
  );
}
