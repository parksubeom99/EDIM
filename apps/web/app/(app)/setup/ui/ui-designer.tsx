"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import {
  ACTIONS, ACTION_LABEL, CLASS_OF, GRID_H, GRID_W, SCOPES, WIDGET_TYPES, freeSpot, newWidget, signalSlots,
  type Action, type UiSpec, type Widget, type WidgetType,
} from "@/app/lib/ui-form";
import { CELL, UiRun, useCatalog } from "./ui-run";

/**
 * p25 [EDIM Toolbox UI] 사용자 UI Form · p26 [Set-Up / EDIM UI Design] 작업장.
 *   왼쪽  = 폼 목록(Templet 먼저) · 새 폼 · Templet 호출하여 Customizing · [UI 개발 AI] UI Templet 대화 상자(용도 · 항목 · 필요 DB Table · 설명)
 *   가운데 = 위젯 상자 → 캔버스(24×16 격자) 끌어다 놓기(Drag) · 캔버스 안에서 옮기기 · 고르기
 *   오른쪽 = 고른 위젯의 Set-up · Object Inspector · Signal/Slot · Work Hierarchy 연결(p26 노드별 UI)
 *   Run   = 저장된 설정 그대로 실제 카탈로그 데이터로 돈다(ui-run.tsx — 작업대 Inspector 와 같은 컴포넌트).
 * UI 개발 AI 는 지금 결정론 설계기다(AI 키 없음 → D-6) — 화면에 그렇게 적는다.
 */

interface FormRow { id: string; name: string; scope: string; isTemplet: boolean; spec: UiSpec; updatedAt: string }
interface HNode { stableId: string; kind: string; label: string; children: HNode[] }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const btn = (primary = false, off = false): CSSProperties => ({
  fontSize: "var(--fs-12)", fontWeight: 600, padding: "4px 10px", borderRadius: 4, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1,
  border: primary ? "none" : "1px solid var(--line)", background: primary ? "var(--accent)" : "var(--surface-2)", color: primary ? "var(--accent-contrast)" : "var(--ink)",
});
const mini: CSSProperties = { borderCollapse: "collapse", fontSize: 11, width: "100%" };
const TYPE_LABEL: Record<WidgetType, string> = { button: "Button", combo: "Combo box", table: "Table", label: "Label", number: "Number", canvas: "Canvas" };

function flatNodes(ns: HNode[], depth = 0): { n: HNode; depth: number }[] {
  return ns.flatMap((n) => [{ n, depth }, ...flatNodes(n.children ?? [], depth + 1)]);
}

export function UiDesigner({ canEdit }: { canEdit: boolean }) {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [spec, setSpec] = useState<UiSpec>({ widgets: [] });
  const [meta, setMeta] = useState({ name: "", scope: SCOPES[0] as string, isTemplet: false });
  const [pick, setPick] = useState<string | null>(null);
  const [mode, setMode] = useState<"design" | "run">("design");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [newName, setNewName] = useState("");
  const { subCodes, codes, reload: reloadCatalog } = useCatalog();
  const [nodes, setNodes] = useState<{ n: HNode; depth: number }[]>([]);
  const [ai, setAi] = useState<{ open: boolean; name: string; purpose: string; items: string[]; table: string; text: string }>({ open: false, name: "", purpose: SCOPES[0], items: [], table: "", text: "" });
  const [aiNotes, setAiNotes] = useState<string[] | null>(null);

  const load = useCallback(async (keep?: string | null) => {
    const j = (await fetch("/api/ui-forms").then((r) => r.json())) as { rows?: FormRow[] };
    const rows = j.rows ?? [];
    setForms(rows);
    const f = rows.find((x) => x.id === keep) ?? null;
    if (f) { setSelId(f.id); setSpec(f.spec); setMeta({ name: f.name, scope: f.scope, isTemplet: f.isTemplet }); }
    setReady(true);
  }, []);
  useEffect(() => {
    void load(null);
    void fetch("/api/hierarchy").then((r) => r.json()).then((h: { tree?: HNode[] }) => setNodes(flatNodes(h.tree ?? []))).catch(() => setNodes([]));
  }, [load]);

  const sel = forms.find((f) => f.id === selId) ?? null;
  const dirty = !!sel && (JSON.stringify(sel.spec) !== JSON.stringify(spec) || sel.name !== meta.name || sel.scope !== meta.scope || sel.isTemplet !== meta.isTemplet);
  const w = spec.widgets.find((x) => x.id === pick) ?? null;
  const upd = (id: string, patch: Partial<Widget>) => setSpec((s) => ({ ...s, widgets: s.widgets.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = (type: WidgetType, x: number, y: number) => {
    if (!canEdit || !sel) return;
    const nw = newWidget(type, x, y, new Set(spec.widgets.map((q) => q.id)));
    setSpec((s) => ({ ...s, widgets: [...s.widgets, nw] })); setPick(nw.id);
  };
  const remove = (id: string) => {
    setSpec((s) => ({ ...s, widgets: s.widgets.filter((x) => x.id !== id).map((x) => ({
      ...x, ...(x.target === id ? { target: undefined } : {}), ...(x.filterBy === id ? { filterBy: undefined } : {}) })) }));
    setPick(null);
  };
  const toggleNode = (id: string) => setSpec((s) => {
    const cur = new Set(s.nodes ?? []);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    const list = [...cur];
    return list.length ? { ...s, nodes: list } : { widgets: s.widgets };
  });

  // ── Drag: 위젯 상자 → 캔버스(새로 놓기) · 캔버스 안(옮기기) ──
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const gx = Math.floor((e.clientX - r.left) / CELL), gy = Math.floor((e.clientY - r.top) / CELL);
    const kind = e.dataTransfer.getData("text/edim-widget");
    const moveId = e.dataTransfer.getData("text/edim-move");
    if (kind && (WIDGET_TYPES as readonly string[]).includes(kind)) add(kind as WidgetType, gx, gy);
    else if (moveId) {
      const t = spec.widgets.find((q) => q.id === moveId);
      if (t) upd(moveId, { x: Math.max(0, Math.min(GRID_W - t.w, gx)), y: Math.max(0, Math.min(GRID_H - t.h, gy)) });
    }
  };

  async function create(fromTemplet?: string) {
    const name = (fromTemplet ? `${forms.find((f) => f.id === fromTemplet)?.name ?? "Templet"} 사본` : newName).trim();
    if (!name) return;
    const r = await fetch("/api/ui-forms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, fromTemplet }) });
    const j = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
    setMsg(r.ok ? { ok: true, text: fromTemplet ? `Templet 을 호출해 '${name}' 을 만들었습니다 — 고쳐 쓰십시오` : `'${name}' 을 만들었습니다` } : { ok: false, text: `거부: ${j.error ?? r.status}` });
    if (r.ok) { setNewName(""); setMode("design"); setPick(null); await load(j.id); }
  }
  /** p25 UI 개발 AI — UI Templet 대화 상자의 답(용도 · 항목 · 필요 DB Table · 설명)으로 서버가 폼을 설계해 만든다(결정론). */
  async function design() {
    const [code, table] = ai.table.split("|");
    const r = await fetch("/api/ui-forms", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: ai.name.trim(), scope: ai.purpose, design: { purpose: ai.purpose, items: ai.items, table: code && table ? { code, table } : null, text: ai.text } }) });
    const j = (await r.json().catch(() => ({}))) as { id?: string; error?: string; notes?: string[]; engine?: string };
    setMsg(r.ok ? { ok: true, text: `UI 개발 AI(${j.engine ?? "결정론"}) — '${ai.name.trim()}' 을 설계했습니다 · 고쳐 쓰십시오` } : { ok: false, text: `거부: ${j.error ?? r.status}` });
    if (r.ok) { setAiNotes(j.notes ?? []); setAi({ ...ai, open: false, name: "" }); setMode("design"); setPick(null); await load(j.id); }
  }
  async function save() {
    if (!sel) return;
    const r = await fetch(`/api/ui-forms/${sel.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...meta, spec }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: "저장했습니다" } : { ok: false, text: `거부: ${j.error ?? r.status}` });
    if (r.ok) await load(sel.id);
  }
  async function del() {
    if (!sel) return;
    const r = await fetch(`/api/ui-forms/${sel.id}`, { method: "DELETE" });
    setMsg(r.ok ? { ok: true, text: `'${sel.name}' 삭제` } : { ok: false, text: `거부: ${r.status}` });
    if (r.ok) { setSelId(null); setSpec({ widgets: [] }); setPick(null); await load(null); }
  }

  const itemKeys = useMemo(() => [...new Map(subCodes.map((s) => [s.itemKey, s.itemName])).entries()].sort(), [subCodes]);
  const tableOptions = codes.flatMap((c) => Object.entries(c.tables).map(([t, tt]) => ({ v: `${c.code}|${t}`, text: `${c.code}.${t} · Item = Sub Code ${tt.by} · ${tt.cols.length}열`, cols: tt.cols })));
  const colsOf = (q?: Widget) => (q?.source?.kind === "table" ? tableOptions.find((o) => o.v === `${(q.source as { code: string }).code}|${(q.source as { table: string }).table}`)?.cols ?? [] : []);
  const formCols = [...new Map(spec.widgets.filter((q) => q.type === "table").flatMap((q) => colsOf(q)).map((c) => [c.key, c])).values()];
  const links = signalSlots(spec);

  return (
    <section data-testid="ui-designer" data-ready={ready ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "220px auto 280px", gap: 12, marginTop: 12, alignItems: "start" }}>
      {/* ── 왼쪽: 폼 · Templet · UI 개발 AI ── */}
      <div style={{ ...card, display: "grid", gap: 8 }}>
        <div style={lab}>Work Process · 사용자 UI Form</div>
        {forms.map((f) => (
          <div key={f.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" data-testid={`ui-form-${f.name}`} data-selected={f.id === selId ? "1" : undefined}
              onClick={() => { setSelId(f.id); setSpec(f.spec); setMeta({ name: f.name, scope: f.scope, isTemplet: f.isTemplet }); setPick(null); setMsg(null); }}
              style={{ flex: 1, textAlign: "left", padding: "5px 7px", borderRadius: 4, cursor: "pointer", color: "var(--ink)",
                border: `1px solid ${f.id === selId ? "var(--accent)" : "var(--line)"}`, background: f.id === selId ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" }}>
              <span style={{ fontSize: "var(--fs-12)" }}>{f.isTemplet ? "★ " : ""}{f.name}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--ink-muted)" }}>{f.scope} · 위젯 {f.spec.widgets.length}{f.spec.nodes?.length ? ` · 노드 ${f.spec.nodes.length}` : ""}</span>
            </button>
            {f.isTemplet && canEdit && (
              <button type="button" data-testid={`ui-call-${f.name}`} title="Templet 호출하여 Customizing (복사본을 만든다)" onClick={() => void create(f.id)} style={{ ...btn(), padding: "3px 6px" }}>호출</button>
            )}
          </div>
        ))}
        {forms.length === 0 && <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>아직 폼이 없습니다</span>}
        {canEdit && (
          <div style={{ display: "flex", gap: 4 }}>
            <input data-testid="ui-new-name" placeholder="새 폼 이름" value={newName} onChange={(e) => setNewName(e.target.value)} style={inp} />
            <button type="button" data-testid="ui-new" disabled={!newName.trim()} onClick={() => void create()} style={btn(true, !newName.trim())}>+</button>
          </div>
        )}
        {canEdit && (
          <div data-testid="ui-ai" data-open={ai.open ? "1" : "0"} style={{ borderTop: "1px solid var(--line)", paddingTop: 8, display: "grid", gap: 6 }}>
            <button type="button" data-testid="ui-ai-open" onClick={() => setAi({ ...ai, open: !ai.open })} style={btn(ai.open)}>UI 개발 AI — 설명으로 설계</button>
            {ai.open && (
              <>
                <span style={{ fontSize: 11, color: "var(--ink-muted)" }} data-testid="ui-ai-engine">결정론 설계기 — AI 키 없음(D-6). 같은 답 → 같은 폼.</span>
                <span style={lab}>이름</span>
                <input data-testid="ui-ai-name" value={ai.name} onChange={(e) => setAi({ ...ai, name: e.target.value })} style={inp} />
                <span style={lab}>1) 용도</span>
                <select data-testid="ui-ai-purpose" value={ai.purpose} onChange={(e) => setAi({ ...ai, purpose: e.target.value })} style={inp}>{SCOPES.map((s) => <option key={s}>{s}</option>)}</select>
                <span style={lab}>2) 항목 (Sub Code)</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {itemKeys.map(([k, n]) => (
                    <label key={k} style={{ fontSize: 11, display: "flex", gap: 2, alignItems: "center" }} title={n}>
                      <input type="checkbox" data-testid={`ui-ai-item-${k}`} checked={ai.items.includes(k)} onChange={(e) => setAi({ ...ai, items: e.target.checked ? [...ai.items, k].sort() : ai.items.filter((x) => x !== k) })} />{k}
                    </label>
                  ))}
                </div>
                <span style={lab}>3) 필요 DB Table</span>
                <select data-testid="ui-ai-table" value={ai.table} onChange={(e) => setAi({ ...ai, table: e.target.value })} style={inp}>
                  <option value="">— 없음</option>
                  {tableOptions.map((o) => <option key={o.v} value={o.v}>{o.text}</option>)}
                </select>
                <span style={lab}>Application 설명</span>
                <textarea data-testid="ui-ai-text" rows={3} value={ai.text} onChange={(e) => setAi({ ...ai, text: e.target.value })} placeholder="예: 용량을 골라 표에서 찾고, 값을 저장하거나 새로 등록하고, 곡선 그래프로 본다" style={{ ...inp, resize: "vertical" }} />
                <button type="button" data-testid="ui-ai-go" disabled={!ai.name.trim()} onClick={() => void design()} style={btn(true, !ai.name.trim())}>설계해서 만들기</button>
              </>
            )}
            {aiNotes && <ul data-testid="ui-ai-notes" style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--ink-muted)" }}>{aiNotes.map((n) => <li key={n}>{n}</li>)}</ul>}
          </div>
        )}
      </div>

      {/* ── 가운데: 위젯 상자 + 캔버스 ── */}
      <div style={{ ...card, display: "grid", gap: 8 }}>
        {sel ? (
          <>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input data-testid="ui-name" value={meta.name} disabled={!canEdit} onChange={(e) => setMeta({ ...meta, name: e.target.value })} style={{ ...inp, width: 160 }} />
              <select data-testid="ui-scope" value={meta.scope} disabled={!canEdit} onChange={(e) => setMeta({ ...meta, scope: e.target.value })} style={{ ...inp, width: 150 }}>
                {SCOPES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <label style={{ fontSize: "var(--fs-12)", display: "flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" data-testid="ui-templet" checked={meta.isTemplet} disabled={!canEdit} onChange={(e) => setMeta({ ...meta, isTemplet: e.target.checked })} />Templet
              </label>
              <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button type="button" data-testid="ui-mode-design" onClick={() => setMode("design")} style={btn(mode === "design")}>Design</button>
                <button type="button" data-testid="ui-mode-run" onClick={() => { setMode("run"); setPick(null); }} style={btn(mode === "run")}>Run</button>
              </span>
            </div>
            {mode === "design" && (
              <div data-testid="ui-palette" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={lab}>위젯 상자</span>
                {WIDGET_TYPES.map((t) => (
                  <button key={t} type="button" draggable={canEdit} data-palette={t} disabled={!canEdit}
                    onDragStart={(e) => { e.dataTransfer.setData("text/edim-widget", t); e.dataTransfer.effectAllowed = "copy"; }}
                    onClick={() => { const at = freeSpot(t, spec.widgets); if (at) add(t, at.x, at.y); else setMsg({ ok: false, text: "캔버스에 빈 자리가 없습니다" }); }}
                    title="캔버스로 끌어다 놓거나 누르십시오" style={{ ...btn(), cursor: canEdit ? "grab" : "not-allowed" }}>{TYPE_LABEL[t]}</button>
                ))}
              </div>
            )}
            {mode === "design" ? (
              <div data-testid="ui-canvas" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => setPick(null)}
                style={{ position: "relative", width: GRID_W * CELL, height: GRID_H * CELL, border: "1px solid var(--line)", borderRadius: 4,
                  backgroundColor: "var(--surface-0)", backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)", backgroundSize: `${CELL}px ${CELL}px` }}>
                {spec.widgets.map((q) => (
                  <div key={q.id} data-widget={q.id} data-type={q.type} data-selected={q.id === pick ? "1" : undefined}
                    draggable={canEdit} onDragStart={(e) => { e.dataTransfer.setData("text/edim-move", q.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={(e) => { e.stopPropagation(); setPick(q.id); }}
                    style={{ position: "absolute", left: q.x * CELL, top: q.y * CELL, width: q.w * CELL - 4, height: q.h * CELL - 4, margin: 2, boxSizing: "border-box",
                      border: `${q.id === pick ? 2 : 1}px solid ${q.id === pick ? "var(--accent)" : "var(--line)"}`, borderRadius: 4, background: "var(--surface-1)",
                      padding: 4, fontSize: 11, overflow: "hidden", cursor: canEdit ? "move" : "default" }}>
                    <b style={{ color: "var(--accent)" }}>{TYPE_LABEL[q.type]}</b> <span style={{ fontFamily: "var(--font-mono)" }}>{q.id}</span>
                    <div>{q.label}{q.type === "number" && q.param ? ` · ${q.param}${q.unit ? ` [${q.unit}]` : ""}` : ""}{q.type === "number" && q.col ? ` → 열 ${q.col}` : ""}</div>
                    <div style={{ color: "var(--ink-muted)" }}>
                      {q.source?.kind === "subcode" ? `Data: Sub Code ${q.source.itemKey}` : q.source?.kind === "table" ? `Data: ${q.source.code}.${q.source.table}` : ""}
                      {q.action ? `동작: ${ACTION_LABEL[q.action]}` : ""}{q.call?.kind === "link" ? ` → ${q.call.href}` : q.call?.kind === "macro" ? " → 매크로 실행" : ""}{q.target ? ` → ${q.target}` : ""}{q.filterBy ? ` · Active: ${q.filterBy}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <UiRun formId={sel.id} spec={spec} subCodes={subCodes} codes={codes} dirty={dirty} onWritten={reloadCatalog} />
            )}
            {canEdit && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" data-testid="ui-save" disabled={!dirty} onClick={() => void save()} style={btn(true, !dirty)}>저장</button>
                <button type="button" data-testid="ui-delete" onClick={() => void del()} style={btn()}>폼 삭제</button>
                {dirty && <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>저장하지 않은 변경이 있습니다</span>}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: GRID_W * CELL, color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>왼쪽에서 폼을 고르거나 새로 만드십시오.</div>
        )}
        {msg && <p data-testid="ui-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
      </div>

      {/* ── 오른쪽: Set-up · Object Inspector · Signal/Slot · Work Hierarchy 연결 ── */}
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ ...card, display: "grid", gap: 8 }} data-testid="ui-setup">
          <div style={lab}>{w ? `${TYPE_LABEL[w.type]} set-up · ${w.id}` : "위젯을 고르면 여기서 Set-up 합니다"}</div>
          {w && mode === "design" && (
            <>
              <span style={lab}>이름</span>
              <input data-testid="ui-w-label" value={w.label} disabled={!canEdit} onChange={(e) => upd(w.id, { label: e.target.value.slice(0, 40) })} style={inp} />
              <span style={lab}>크기 (칸)</span>
              <div style={{ display: "flex", gap: 4 }}>
                <input data-testid="ui-w-w" type="number" min={1} max={GRID_W - w.x} value={w.w} disabled={!canEdit} onChange={(e) => upd(w.id, { w: Math.max(1, Math.min(GRID_W - w.x, Number(e.target.value) || 1)) })} style={inp} />
                <input data-testid="ui-w-h" type="number" min={1} max={GRID_H - w.y} value={w.h} disabled={!canEdit} onChange={(e) => upd(w.id, { h: Math.max(1, Math.min(GRID_H - w.y, Number(e.target.value) || 1)) })} style={inp} />
              </div>
              {w.type === "combo" && (
                <>
                  <span style={lab}>Data Set-up · 선택지 원천</span>
                  <select data-testid="ui-w-subcode" value={w.source?.kind === "subcode" ? w.source.itemKey : ""} disabled={!canEdit}
                    onChange={(e) => upd(w.id, { source: e.target.value ? { kind: "subcode", itemKey: e.target.value } : undefined })} style={inp}>
                    <option value="">— 고르십시오</option>
                    {itemKeys.map(([k, n]) => <option key={k} value={k}>Sub Code {k} · {n}</option>)}
                  </select>
                </>
              )}
              {(w.type === "table" || w.type === "canvas") && (
                <>
                  <span style={lab}>{w.type === "canvas" ? "그릴 Data · 제품 표" : "동작 대상 Data · 제품 표"}</span>
                  <select data-testid="ui-w-table" value={w.source?.kind === "table" ? `${w.source.code}|${w.source.table}` : ""} disabled={!canEdit}
                    onChange={(e) => { const [code, table] = e.target.value.split("|"); upd(w.id, { source: code && table ? { kind: "table", code, table } : undefined, cols: undefined }); }} style={inp}>
                    <option value="">— 고르십시오</option>
                    {tableOptions.map((o) => <option key={o.v} value={o.v}>{o.text}</option>)}
                  </select>
                </>
              )}
              {w.type === "canvas" && colsOf(w).length > 0 && (
                <>
                  <span style={lab}>그릴 열 (안 고르면 수로 된 열 전부)</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {colsOf(w).map((c) => (
                      <label key={c.key} style={{ fontSize: 11, display: "flex", gap: 2, alignItems: "center" }} title={c.label ?? c.name}>
                        <input type="checkbox" data-testid={`ui-w-col-${c.key}`} disabled={!canEdit} checked={!!w.cols?.includes(c.key)}
                          onChange={(e) => { const next = e.target.checked ? [...(w.cols ?? []), c.key] : (w.cols ?? []).filter((x) => x !== c.key); upd(w.id, { cols: next.length ? next : undefined }); }} />{c.key}
                      </label>
                    ))}
                  </div>
                </>
              )}
              {w.type === "number" && (
                <>
                  <span style={lab}>입력 이름(param) — 계산이 읽는 이름 · 예: q_cmh · p_pa · rho</span>
                  <input data-testid="ui-w-param" value={w.param ?? ""} disabled={!canEdit} onChange={(e) => upd(w.id, { param: e.target.value.trim().toLowerCase().slice(0, 31) || undefined })} style={inp} />
                  <span style={lab}>단위</span>
                  <input data-testid="ui-w-unit" value={w.unit ?? ""} disabled={!canEdit} onChange={(e) => upd(w.id, { unit: e.target.value.slice(0, 10) || undefined })} style={inp} />
                  <span style={lab}>쓰는 열 — 저장·등록 버튼이 이 값을 대상 표의 이 열에 쓴다</span>
                  <select data-testid="ui-w-col" value={w.col ?? ""} disabled={!canEdit} onChange={(e) => upd(w.id, { col: e.target.value || undefined })} style={inp}>
                    <option value="">—</option>
                    {formCols.map((c) => <option key={c.key} value={c.key}>{c.key} · {c.label ?? c.name}</option>)}
                  </select>
                </>
              )}
              {w.type === "button" && (
                <>
                  <span style={lab}>동작</span>
                  <select data-testid="ui-w-action" value={w.action ?? "find"} disabled={!canEdit}
                    onChange={(e) => { const a = e.target.value as Action; upd(w.id, { action: a, call: a === "call" ? (w.call ?? { kind: "macro" }) : undefined }); }} style={inp}>
                    {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
                  </select>
                  {w.action === "call" ? (
                    <>
                      <span style={lab}>실행 설정 — 마우스를 클릭할 때</span>
                      <select data-testid="ui-w-call" value={w.call?.kind ?? "macro"} disabled={!canEdit}
                        onChange={(e) => upd(w.id, { call: e.target.value === "link" ? { kind: "link", href: "/workbench" } : { kind: "macro" } })} style={inp}>
                        <option value="macro">매크로 실행 — 연결 노드의 승인 매크로(Combo 값 = 코드 슬롯)</option>
                        <option value="link">하이퍼링크 — EDIM 안 경로</option>
                      </select>
                      {w.call?.kind === "link" && <input data-testid="ui-w-href" value={w.call.href} disabled={!canEdit} onChange={(e) => upd(w.id, { call: { kind: "link", href: e.target.value.slice(0, 200) } })} style={inp} />}
                    </>
                  ) : (
                    <>
                      <span style={lab}>대상 (Table)</span>
                      <select data-testid="ui-w-target" value={w.target ?? ""} disabled={!canEdit} onChange={(e) => upd(w.id, { target: e.target.value || undefined })} style={inp}>
                        <option value="">—</option>
                        {spec.widgets.filter((q) => q.type === "table").map((q) => <option key={q.id} value={q.id}>{q.id} · {q.label}</option>)}
                      </select>
                      <span style={lab}>Active Set-up (Combo box)</span>
                      <select data-testid="ui-w-filter" value={w.filterBy ?? ""} disabled={!canEdit} onChange={(e) => upd(w.id, { filterBy: e.target.value || undefined })} style={inp}>
                        <option value="">—</option>
                        {spec.widgets.filter((q) => q.type === "combo").map((q) => <option key={q.id} value={q.id}>{q.id} · {q.label}</option>)}
                      </select>
                    </>
                  )}
                </>
              )}
              {canEdit && <button type="button" data-testid="ui-w-remove" onClick={() => remove(w.id)} style={btn()}>위젯 지우기</button>}
            </>
          )}
        </div>

        {sel && (
          <div style={{ ...card, display: "grid", gap: 6 }} data-testid="ui-object-inspector">
            <div style={lab}>Object Inspector</div>
            <table style={mini}>
              <thead><tr><th style={{ textAlign: "left" }}>Object</th><th style={{ textAlign: "left" }}>Class</th></tr></thead>
              <tbody>
                <tr><td style={{ fontFamily: "var(--font-mono)" }}>{meta.name || "Form"}</td><td>QDialog</td></tr>
                {spec.widgets.map((q) => (
                  <tr key={q.id} data-object={q.id} onClick={() => { setMode("design"); setPick(q.id); }} style={{ cursor: "pointer", background: q.id === pick ? "color-mix(in srgb, var(--accent) 10%, transparent)" : undefined }}>
                    <td style={{ fontFamily: "var(--font-mono)", paddingLeft: 10 }}>{q.id}</td><td>{CLASS_OF[q.type]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sel && (
          <div style={{ ...card, display: "grid", gap: 6 }} data-testid="ui-signal-slot" data-count={links.length}>
            <div style={lab}>Signal/Slot — Set-up 에서 나오는 연결</div>
            {links.length ? (
              <table style={mini}>
                <thead><tr><th style={{ textAlign: "left" }}>Sender</th><th style={{ textAlign: "left" }}>Signal</th><th style={{ textAlign: "left" }}>Receiver</th><th style={{ textAlign: "left" }}>Slot</th></tr></thead>
                <tbody>{links.map((l, i) => <tr key={i} data-link={`${l.sender}>${l.receiver}`}><td style={{ fontFamily: "var(--font-mono)" }}>{l.sender}</td><td>{l.signal}</td><td style={{ fontFamily: "var(--font-mono)" }}>{l.receiver}</td><td>{l.slot}</td></tr>)}</tbody>
              </table>
            ) : <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>연결 없음 — 버튼의 대상 · Active Set-up · 실행 설정을 정하면 여기 나옵니다</span>}
          </div>
        )}

        {sel && (
          <div style={{ ...card, display: "grid", gap: 4, maxHeight: 260, overflow: "auto" }} data-testid="ui-nodes" data-count={spec.nodes?.length ?? 0}>
            <div style={lab}>Work Hierarchy — 이 폼을 붙일 노드 (작업대 Inspector 에 뜬다)</div>
            {nodes.map(({ n, depth }) => (
              <label key={n.stableId} style={{ fontSize: 11, display: "flex", gap: 4, alignItems: "center", paddingLeft: depth * 12 }}>
                <input type="checkbox" data-testid={`ui-node-${n.label}`} disabled={!canEdit || mode !== "design"} checked={!!spec.nodes?.includes(n.stableId)} onChange={() => toggleNode(n.stableId)} />
                <span>{n.label}</span><span style={{ color: "var(--ink-muted)" }}>{n.kind}</span>
              </label>
            ))}
            {nodes.length === 0 && <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>노드가 없습니다</span>}
          </div>
        )}
      </div>
    </section>
  );
}
