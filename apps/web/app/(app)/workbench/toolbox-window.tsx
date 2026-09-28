"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import type { RunResult } from "./action-bar";

/**
 * EDIM Toolbox — a SEPARATE floating window beside the MainForm (owner requirement
 * 2026-07-14; blueprint p25 [EDIM Toolbox UI] · p27 [EDIM Toolbar Programing]).
 *   · tabs: UI Tool / Program Tool        · drag (title bar) · resize (corner) · dock toggle
 *   · default position sits over the Inspector column, never over the centre work area
 *   · command buttons are the MainForm's own commands: editing them here changes the
 *     Action Bar at once, and Run here IS the Action Bar's run (one result stream).
 * Geometry + command set-up persist per browser (localStorage). Company-wide
 * persistence needs a table (Tier B) — not built.
 */
export interface CommandDef { kind: string; label: string; visible: boolean }
export const DEFAULT_COMMANDS: CommandDef[] = [
  { kind: "bom", label: "BOM Run", visible: true },
  { kind: "edim", label: "EDIM Run", visible: true },
  { kind: "ebom", label: "EBOM Run", visible: true },
  { kind: "cost", label: "Cost", visible: true },
];

interface Geo { x: number; y: number; w: number; h: number; docked: boolean }
type FlowNode = { kind: "decision"; label: string; yes: FlowNode; no: FlowNode } | { kind: "process"; label: string };
interface Desc { ok: boolean; text?: string; flow?: FlowNode; reads?: { tables: string[]; vars: string[]; codes: string[] }; error?: string }
interface Diag { severity: string; message: string }

const GEO_KEY = "edim.toolbox.geo.v1";
const SAMPLE_DSL = "=IF(CAP,CAP>25, SUM(Table1(A,4:4))*Var(NS,15)*Var(NS,20), SUM(Table1(A,1:1))*Var(NS,20))";
const muted: CSSProperties = { color: "var(--ink-muted)", fontSize: "var(--fs-12)" };
const mono: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" };
const pane: CSSProperties = { border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" };
const paneHead: CSSProperties = { padding: "4px 8px", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-display)", fontSize: "var(--fs-12)", fontWeight: 600, color: "var(--accent)", display: "flex", gap: 8, alignItems: "baseline" };
const btn = (primary = false, disabled = false): CSSProperties => ({ fontSize: "var(--fs-12)", color: primary ? "var(--accent-contrast)" : "var(--ink)", background: primary ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 });
const field: CSSProperties = { background: "var(--surface-0)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 7px", fontSize: "var(--fs-13)", minWidth: 0 };

function defaultGeo(): Geo {
  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  // Default = exactly the Inspector column (measured), so the centre work area is never covered.
  const insp = typeof document === "undefined" ? null : document.querySelector("[data-testid=region-inspector]")?.getBoundingClientRect();
  if (insp && insp.width >= 280) return { x: Math.round(insp.left), y: Math.round(insp.top), w: Math.round(insp.width), h: Math.round(insp.height), docked: false };
  const w = 340;
  return { x: vw - w, y: 112, w, h: Math.min(640, vh - 170), docked: false };
}

export function ToolboxWindow({
  open, onClose, commands, onCommands, onRun, runs, busyKind, nodeStable, canEdit, canDecide, runDisabled,
}: {
  open: boolean; onClose: () => void;
  commands: CommandDef[]; onCommands: (c: CommandDef[]) => void;
  onRun: (kind: string) => void; runs: RunResult[]; busyKind: string | null;
  nodeStable: string | null; canEdit: boolean; canDecide: boolean; runDisabled: boolean;
}) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [tab, setTab] = useState<"ui" | "program">("program");
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const size = useRef<{ sx: number; sy: number; w: number; h: number } | null>(null);

  useEffect(() => {
    let g = defaultGeo();
    try { const raw = window.localStorage.getItem(GEO_KEY); if (raw) g = { ...g, ...(JSON.parse(raw) as Partial<Geo>) }; } catch { /* storage unavailable → defaults */ }
    g.x = Math.max(0, Math.min(g.x, window.innerWidth - 120)); g.y = Math.max(0, Math.min(g.y, window.innerHeight - 60));
    setGeo(g);
  }, []);
  const save = useCallback((g: Geo) => { setGeo(g); try { window.localStorage.setItem(GEO_KEY, JSON.stringify(g)); } catch { /* ignore */ } }, []);

  if (!open || !geo) return null;

  const onDragStart = (e: RPointerEvent<HTMLDivElement>) => {
    if (geo.docked) return;
    drag.current = { dx: e.clientX - geo.x, dy: e.clientY - geo.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setGeo({ ...geo, x: Math.max(0, Math.min(e.clientX - drag.current.dx, window.innerWidth - 120)), y: Math.max(0, Math.min(e.clientY - drag.current.dy, window.innerHeight - 40)) });
  };
  const onDragEnd = () => { if (drag.current) { drag.current = null; save(geo); } };
  const onSizeStart = (e: RPointerEvent<HTMLDivElement>) => {
    size.current = { sx: e.clientX, sy: e.clientY, w: geo.w, h: geo.h };
    (e.target as HTMLElement).setPointerCapture(e.pointerId); e.stopPropagation();
  };
  const onSizeMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!size.current) return;
    setGeo({ ...geo, w: Math.max(280, size.current.w + e.clientX - size.current.sx), h: Math.max(260, size.current.h + e.clientY - size.current.sy) });
  };
  const onSizeEnd = () => { if (size.current) { size.current = null; save(geo); } };

  const frame: CSSProperties = geo.docked
    ? { position: "fixed", top: 104, right: 0, bottom: 46, width: geo.w, zIndex: 40 }
    : { position: "fixed", left: geo.x, top: geo.y, width: geo.w, height: geo.h, zIndex: 40 };

  return (
    <section
      data-testid="toolbox-window" data-docked={geo.docked ? "1" : "0"} role="dialog" aria-label="EDIM Toolbox"
      style={{ ...frame, display: "flex", flexDirection: "column", background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--accent)", borderRadius: geo.docked ? 0 : "var(--radius)", boxShadow: "0 12px 40px rgba(0,0,0,.35)", overflow: "hidden" }}
    >
      <div
        data-testid="toolbox-titlebar" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "var(--surface-1)", borderBottom: "1px solid var(--line)", cursor: geo.docked ? "default" : "move", userSelect: "none", touchAction: "none" }}
      >
        <span aria-hidden title="EDIM Toolbox — 끌어서 이동" style={{ color: "var(--accent)", fontSize: "var(--fs-13)", lineHeight: 1 }}>⠿</span>
        <nav style={{ display: "flex", gap: 4, marginLeft: 2, flexShrink: 0 }} onPointerDown={(e) => e.stopPropagation()}>
          {(["ui", "program"] as const).map((k) => (
            <button key={k} type="button" data-toolbox-tab={k} onClick={() => setTab(k)} style={{ ...btn(tab === k), padding: "3px 8px", whiteSpace: "nowrap" }}>{k === "ui" ? "UI Tool" : "Program Tool"}</button>
          ))}
        </nav>
        <span style={{ marginLeft: "auto", display: "flex", gap: 3, flexShrink: 0 }} onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" data-testid="toolbox-dock" title={geo.docked ? "창으로 띄우기" : "오른쪽에 붙이기"} onClick={() => save({ ...geo, docked: !geo.docked })} aria-label={geo.docked ? "float" : "dock"} style={{ ...btn(), padding: "3px 7px" }}>{geo.docked ? "⧉" : "⇥"}</button>
          <button type="button" data-testid="toolbox-reset" title="기본 위치" onClick={() => save(defaultGeo())} style={{ ...btn(), padding: "3px 7px" }}>⌂</button>
          <button type="button" data-testid="toolbox-close" aria-label="close" onClick={onClose} style={{ ...btn(), padding: "3px 7px" }}>✕</button>
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 10, display: "grid", gap: 10, alignContent: "start" }}>
        {tab === "ui"
          ? <UiTool commands={commands} onCommands={onCommands} onRun={onRun} busyKind={busyKind} runDisabled={runDisabled} canEdit={canEdit} />
          : <ProgramTool nodeStable={nodeStable} canEdit={canEdit} canDecide={canDecide} onRun={onRun} runs={runs} busyKind={busyKind} runDisabled={runDisabled} />}
      </div>
      {!geo.docked && (
        <div data-testid="toolbox-resize" onPointerDown={onSizeStart} onPointerMove={onSizeMove} onPointerUp={onSizeEnd}
          style={{ position: "absolute", right: 0, bottom: 0, width: 16, height: 16, cursor: "nwse-resize", touchAction: "none", background: "linear-gradient(135deg, transparent 50%, var(--accent) 50%)" }} />
      )}
    </section>
  );
}

/* ───────────── UI Tool — p25 "Commend button set-up" ───────────── */
function UiTool({ commands, onCommands, onRun, busyKind, runDisabled, canEdit }: { commands: CommandDef[]; onCommands: (c: CommandDef[]) => void; onRun: (k: string) => void; busyKind: string | null; runDisabled: boolean; canEdit: boolean }) {
  const set = (i: number, patch: Partial<CommandDef>) => onCommands(commands.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= commands.length) return; const next = [...commands]; [next[i], next[j]] = [next[j]!, next[i]!]; onCommands(next); };
  return (
    <>
      <div style={pane}>
        <div style={paneHead}>Command button set-up<span style={muted}>MainForm Action Bar에 즉시 반영</span></div>
        <div style={{ padding: 8, display: "grid", gap: 6 }}>
          {commands.map((c, i) => (
            <div key={c.kind} data-cmd-row={c.kind} style={{ display: "grid", gridTemplateColumns: "auto 34px minmax(0,1fr) auto auto auto", gap: 4, alignItems: "center" }}>
              <input type="checkbox" data-cmd-visible={c.kind} checked={c.visible} disabled={!canEdit} onChange={(e) => set(i, { visible: e.target.checked })} />
              <span style={{ ...mono, color: "var(--accent)" }}>{c.kind}</span>
              <input data-cmd-label={c.kind} value={c.label} disabled={!canEdit} onChange={(e) => set(i, { label: e.target.value.slice(0, 24) })} style={{ ...field, padding: "4px 6px" }} />
              <button type="button" onClick={() => move(i, -1)} disabled={!canEdit || i === 0} style={{ ...btn(false, i === 0), padding: "3px 5px" }}>↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={!canEdit || i === commands.length - 1} style={{ ...btn(false, i === commands.length - 1), padding: "3px 5px" }}>↓</button>
              <button type="button" data-cmd-run={c.kind} onClick={() => onRun(c.kind)} disabled={runDisabled || busyKind !== null} style={{ ...btn(true, runDisabled || busyKind !== null), padding: "4px 8px" }}>{busyKind === c.kind ? "…" : "Run"}</button>
            </div>
          ))}
          <div><button type="button" data-testid="cmd-reset" onClick={() => onCommands(DEFAULT_COMMANDS)} disabled={!canEdit} style={btn()}>기본값</button></div>
        </div>
      </div>
      <div style={pane}>
        <div style={paneHead}>Combo box · Templet · Canvas<span style={muted}>p25 · p26</span></div>
        <div style={{ padding: 8 }}>
          <a data-testid="toolbox-ui-design" href="/setup/ui" style={{ ...btn(true), display: "inline-block", textDecoration: "none" }}>UI Design 작업장 열기 →</a>
          <p style={{ ...muted, margin: "6px 0 0" }}>위젯(Button · Combo box · Table · Label)을 캔버스에 끌어다 놓고 동작·대상 Data 를 정한 폼을 회사 공용으로 저장합니다. Templet 로 표시하면 다른 폼이 호출해 고쳐 씁니다.</p>
        </div>
      </div>
      <p style={{ ...muted, margin: 0 }}>위 Command button 설정은 이 브라우저에만 저장됩니다(Action Bar 는 개인 화면이라).</p>
    </>
  );
}

interface Suggestion { id: string; target: string | null; expression: string | null; learnedTarget: string; learnedExpression: string; fit: { n: number; maxAbsErr: number }; description: string; plain: string; state: string; adoptedMacroId: string | null; fitsCompany: boolean; why: string | null }

/* ───────────── Program Tool — p27 Prompt · Macro · Flowchart · Description ───────────── */
function ProgramTool({ nodeStable, canEdit, canDecide, onRun, runs, busyKind, runDisabled }: { nodeStable: string | null; canEdit: boolean; canDecide: boolean; onRun: (k: string) => void; runs: RunResult[]; busyKind: string | null; runDisabled: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [promptMsg, setPromptMsg] = useState<string | null>(null);
  const [dsl, setDsl] = useState(SAMPLE_DSL);
  const [desc, setDesc] = useState<Desc | null>(null);
  const [diags, setDiags] = useState<Diag[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastRun = runs.find((r) => r.kind === "edim");
  // B(ccmd J) · 학습 제안 — 플랫폼이 승인해 투영한 공식. [채택] = 식을 편집기에 올린다 → 기존 Save draft(검증) → 승인(회사 2단 승인)
  const [sugs, setSugs] = useState<Suggestion[] | null>(null);
  const [adopting, setAdopting] = useState<string | null>(null);
  const loadSugs = async () => { const r = await fetch("/api/learning/suggestions"); setSugs(r.ok ? (((await r.json()) as { rows: Suggestion[] }).rows) : []); };
  useEffect(() => { void loadSugs(); }, []);

  useEffect(() => { // live 역번역 (debounced) — every keystroke re-describes; no LLM involved
    const t = setTimeout(async () => {
      const r = await fetch("/api/macros/describe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dsl }) });
      setDesc(r.ok ? ((await r.json()) as Desc) : { ok: false, error: `HTTP ${r.status}` });
    }, 250);
    return () => clearTimeout(t);
  }, [dsl]);

  async function translate() {
    setBusy(true); setPromptMsg(null);
    const r = await fetch("/api/macros/compile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: prompt }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; dsl?: string | null; verified?: boolean; message?: string; error?: string; attempts?: number };
    setBusy(false);
    if (j.ok && j.dsl) { setDsl(j.dsl); setPromptMsg(`번역됨 (${j.attempts}회 시도) · 정적 검증 ${j.verified ? "통과" : "실패"} — 아래 설명으로 뜻을 확인하세요`); }
    else setPromptMsg(j.message ?? j.error ?? "번역 실패");
  }
  async function post(mode: "verify" | "draft") {
    if (!nodeStable) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/macros", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ node: nodeStable, dsl, mode }) });
    const j = (await r.json()) as { macroId: string | null; diagnostics: Diag[]; error?: string };
    setBusy(false); setDiags(j.diagnostics ?? []);
    if (j.error) setMsg(j.error);
    else if (mode === "draft") {
      setDraftId(j.macroId); setMsg(j.macroId ? `초안 저장됨 (${j.macroId.slice(0, 8)})` : "오류가 있어 초안 저장 안 됨");
      if (j.macroId && adopting) {   // 채택 중인 학습 제안이면 이 초안을 가리키게 한다
        const a = await fetch(`/api/learning/suggestions/${adopting}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "adopt", macroId: j.macroId }) });
        if (a.ok) { setMsg(`초안 저장됨 (${j.macroId.slice(0, 8)}) · 학습 제안 채택 — 승인하면 Run`); setAdopting(null); void loadSugs(); }
      }
    }
    else setMsg((j.diagnostics ?? []).some((d) => d.severity === "error") ? "검증 실패" : "검증 통과");
  }
  async function approve() {
    if (!draftId) return;
    setBusy(true);
    const r = await fetch(`/api/macros/${draftId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approve" }) });
    const j = (await r.json()) as { ok: boolean; reason?: string };
    setBusy(false); setMsg(j.ok ? "승인 완료 — Run 가능" : `거부: ${j.reason ?? r.status}`); if (j.ok) setDraftId(null);
  }

  return (
    <>
      <div style={pane}>
        <div style={paneHead}>Prompt<span style={muted}>말로 쓰면 Macro로 번역 (build-time · 제안일 뿐, 승인 전에는 실행 안 됨)</span></div>
        <div style={{ padding: 8, display: "flex", gap: 6 }}>
          <input data-testid="tb-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="메시지 입력 — 예: 용량이 25를 넘으면 4행 팬 kW에 안전율을 곱해 무게를 구한다" style={{ ...field, flex: 1 }} />
          <button type="button" data-testid="tb-translate" onClick={translate} disabled={busy || !prompt.trim() || !canEdit} style={btn(true, busy || !prompt.trim() || !canEdit)}>➤</button>
        </div>
        {promptMsg && <div data-testid="tb-prompt-msg" style={{ ...muted, padding: "0 8px 8px" }}>{promptMsg}</div>}
      </div>

      <div style={pane}>
        <div style={paneHead}>Macro<span style={muted}>IF · Table · Var · SUM MIN MAX AVG · LOOKUP · ROUND · AND OR</span></div>
        <div style={{ padding: 8, display: "grid", gap: 6 }}>
          <textarea data-testid="tb-dsl" value={dsl} onChange={(e) => setDsl(e.target.value)} rows={3} spellCheck={false} style={{ ...field, ...mono, fontSize: "var(--fs-13)", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" data-testid="tb-verify" onClick={() => post("verify")} disabled={busy || !nodeStable} style={btn(false, busy || !nodeStable)}>Verify</button>
            {canEdit && <button type="button" data-testid="tb-draft" onClick={() => post("draft")} disabled={busy || !nodeStable} style={btn(false, busy || !nodeStable)}>Save draft</button>}
            {canDecide && draftId && <button type="button" data-testid="tb-approve" onClick={approve} disabled={busy} style={btn(true, busy)}>승인</button>}
            <button type="button" data-testid="tb-run" onClick={() => onRun("edim")} disabled={runDisabled || busyKind !== null} style={{ ...btn(true, runDisabled || busyKind !== null), marginLeft: "auto" }}>{busyKind === "edim" ? "…" : "Run"}</button>
            <span data-testid="tb-value" style={{ ...mono, fontSize: "var(--fs-13)", color: lastRun?.status === "ran" ? "var(--accent)" : "var(--ink-muted)", minWidth: 56, textAlign: "right" }}>{lastRun?.status === "ran" && typeof lastRun.value === "number" ? lastRun.value : "—"}</span>
          </div>
          {!nodeStable && <span style={muted}>프로젝트 노드를 선택하면 매크로가 그 노드에 묶입니다.</span>}
          {msg && <span data-testid="tb-msg" style={muted}>{msg}</span>}
          {diags && diags.length > 0 && <ul style={{ margin: 0, paddingLeft: 18, fontSize: "var(--fs-12)" }}>{diags.map((d, i) => <li key={i} style={{ color: d.severity === "error" ? "var(--warn)" : "var(--ink-muted)" }}>[{d.severity}] {d.message}</li>)}</ul>}
        </div>
      </div>

      <div style={pane} data-testid="tb-suggestions" data-ready={sugs ? "1" : "0"}>
        <div style={paneHead}>학습 제안<span style={muted}>플랫폼 학습 AI 가 찾고 플랫폼이 승인한 공식 · 채택하면 회사 매크로 승인을 한 번 더</span></div>
        <div style={{ padding: 8, display: "grid", gap: 6 }}>
          {sugs && sugs.filter((x) => x.state !== "dismissed").length === 0 && <span style={muted}>아직 없음</span>}
          {(sugs ?? []).filter((x) => x.state !== "dismissed").map((x) => (
            <div key={x.id} data-testid="tb-suggestion" data-state={x.state} data-fits={x.fitsCompany ? "1" : "0"} style={{ border: "1px solid var(--line)", borderRadius: 4, padding: 6 }}>
              <div style={{ ...mono, fontSize: "var(--fs-12)" }}>{x.target ?? x.learnedTarget} {x.expression ?? x.learnedExpression}</div>
              <div style={muted}>{x.plain || x.description} · 근거 {x.fit.n}건 · 최대 오차 {x.fit.maxAbsErr} mm</div>
              {!x.fitsCompany && <div style={{ ...muted, color: "var(--warn)" }}>이 회사 형식에 맞지 않음 — {x.why}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {x.state === "offered" && canEdit && x.fitsCompany && <button type="button" data-testid="tb-sug-adopt" onClick={() => { setDsl(x.expression!); setAdopting(x.id); setMsg("제안 식을 편집기에 올렸습니다 — Save draft(검증) → 승인"); }} style={btn(true, false)}>채택</button>}
                {x.state === "offered" && canEdit && <button type="button" data-testid="tb-sug-dismiss" onClick={async () => { await fetch(`/api/learning/suggestions/${x.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "dismiss" }) }); void loadSugs(); }} style={btn(false, false)}>숨기기</button>}
                {x.state === "adopted" && <span style={muted}>채택됨 · 매크로 {x.adoptedMacroId?.slice(0, 8)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={pane}>
        <div style={paneHead}>Description<span style={muted}>역번역 — 식에서 결정론으로 만든 설명 (LLM 아님)</span></div>
        <div data-testid="tb-description" style={{ padding: 8, fontSize: "var(--fs-13)", lineHeight: 1.55, color: desc?.ok ? "var(--ink)" : "var(--warn)" }}>
          {!desc ? "…" : desc.ok ? desc.text : `식을 읽을 수 없습니다: ${desc.error}`}
          {desc?.ok && desc.reads && <div style={{ ...muted, ...mono, marginTop: 6 }}>읽는 값 · 표 {desc.reads.tables.join(", ") || "—"} · 변수 {desc.reads.vars.join(", ") || "—"} · 코드 {desc.reads.codes.join(", ") || "—"}</div>}
        </div>
      </div>

      <div style={pane}>
        <div style={paneHead}>Flowchart<span style={muted}>같은 식의 흐름도</span></div>
        <div data-testid="tb-flow" style={{ padding: 8, overflow: "auto" }}>{desc?.ok && desc.flow ? <Flow node={desc.flow} /> : <span style={muted}>—</span>}</div>
      </div>
    </>
  );
}

/* Flow tree → nested boxes (decision = diamond-edged box with 예/아니오 branches). Pure layout, no library. */
function Flow({ node }: { node: FlowNode }) {
  if (node.kind === "process")
    return <div data-flow="process" style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", background: "var(--surface-0)", ...mono, lineHeight: 1.5 }}>{node.label}</div>;
  return (
    <div data-flow="decision" style={{ display: "grid", gap: 6 }}>
      <div style={{ justifySelf: "center", border: "1px solid var(--accent)", color: "var(--accent)", padding: "6px 14px", fontSize: "var(--fs-12)", fontWeight: 600, clipPath: "polygon(6% 0,94% 0,100% 50%,94% 100%,6% 100%,0 50%)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>{node.label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "grid", gap: 4, alignContent: "start" }}><span style={{ ...muted, textAlign: "center" }}>↓ 예</span><Flow node={node.yes} /></div>
        <div style={{ display: "grid", gap: 4, alignContent: "start" }}><span style={{ ...muted, textAlign: "center" }}>↓ 아니오</span><Flow node={node.no} /></div>
      </div>
    </div>
  );
}
