"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import {
  ACTIONS, ACTION_LABEL, GRID_H, GRID_W, SCOPES, WIDGET_TYPES, freeSpot, newWidget,
  type Action, type UiSpec, type Widget, type WidgetType,
} from "@/app/lib/ui-form";

/**
 * p25 [EDIM Toolbox UI] 사용자 UI Form · p26 [Set-Up / EDIM UI Design] 작업장.
 *   왼쪽  = 폼 목록(Templet 먼저) · 새 폼 · Templet 호출하여 Customizing
 *   가운데 = 위젯 상자 → 캔버스(24×16 격자) 끌어다 놓기(Drag) · 캔버스 안에서 옮기기 · 고르기
 *   오른쪽 = 고른 위젯의 Set-up (Combo box = Data Set-up · Button = 동작·대상·Active Set-up · Table = 동작 대상 Data)
 *   Run   = 저장된 설정 그대로 실제 카탈로그 데이터로 돈다(Combo 값 → 찾기 → 표 행 필터).
 * 저장·삭제·등록 동작과 UI 개발 AI 는 아직 없다(화면에 적는다).
 */

interface FormRow { id: string; name: string; scope: string; isTemplet: boolean; spec: UiSpec; updatedAt: string }
interface SubCode { itemKey: string; itemName: string; value: string; description: string | null; seq: number }
interface TCol { key: string; name: string; label?: string }
interface TTable { no: number; by: string; cols: TCol[]; rows: { item: string; cells: Record<string, unknown> }[] }
interface PCode { code: string; name: string; tables: Record<string, TTable> }

const CELL = 34;
const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const btn = (primary = false, off = false): CSSProperties => ({
  fontSize: "var(--fs-12)", fontWeight: 600, padding: "4px 10px", borderRadius: 4, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1,
  border: primary ? "none" : "1px solid var(--line)", background: primary ? "var(--accent)" : "var(--surface-2)", color: primary ? "var(--accent-contrast)" : "var(--ink)",
});
const TYPE_LABEL: Record<WidgetType, string> = { button: "Button", combo: "Combo box", table: "Table", label: "Label" };

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
  const [subCodes, setSubCodes] = useState<SubCode[]>([]);
  const [codes, setCodes] = useState<PCode[]>([]);

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
    void fetch("/api/setup/catalog").then((r) => r.json()).then((c: { subCodes?: SubCode[]; productCodes?: PCode[] }) => {
      setSubCodes(c.subCodes ?? []); setCodes((c.productCodes ?? []).filter((p) => Object.keys(p.tables ?? {}).length > 0));
    });
  }, [load]);

  const sel = forms.find((f) => f.id === selId) ?? null;
  const dirty = !!sel && (JSON.stringify(sel.spec) !== JSON.stringify(spec) || sel.name !== meta.name || sel.scope !== meta.scope || sel.isTemplet !== meta.isTemplet);
  const w = spec.widgets.find((x) => x.id === pick) ?? null;
  const upd = (id: string, patch: Partial<Widget>) => setSpec((s) => ({ widgets: s.widgets.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = (type: WidgetType, x: number, y: number) => {
    if (!canEdit || !sel) return;
    const nw = newWidget(type, x, y, new Set(spec.widgets.map((q) => q.id)));
    setSpec((s) => ({ widgets: [...s.widgets, nw] })); setPick(nw.id);
  };
  const remove = (id: string) => {
    setSpec((s) => ({ widgets: s.widgets.filter((x) => x.id !== id).map((x) => ({
      ...x, ...(x.target === id ? { target: undefined } : {}), ...(x.filterBy === id ? { filterBy: undefined } : {}) })) }));
    setPick(null);
  };

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

  return (
    <section data-testid="ui-designer" data-ready={ready ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "220px auto 260px", gap: 12, marginTop: 12, alignItems: "start" }}>
      {/* ── 왼쪽: 폼 · Templet ── */}
      <div style={{ ...card, display: "grid", gap: 8 }}>
        <div style={lab}>Work Process · 사용자 UI Form</div>
        {forms.map((f) => (
          <div key={f.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" data-testid={`ui-form-${f.name}`} data-selected={f.id === selId ? "1" : undefined}
              onClick={() => { setSelId(f.id); setSpec(f.spec); setMeta({ name: f.name, scope: f.scope, isTemplet: f.isTemplet }); setPick(null); setMsg(null); }}
              style={{ flex: 1, textAlign: "left", padding: "5px 7px", borderRadius: 4, cursor: "pointer", color: "var(--ink)",
                border: `1px solid ${f.id === selId ? "var(--accent)" : "var(--line)"}`, background: f.id === selId ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" }}>
              <span style={{ fontSize: "var(--fs-12)" }}>{f.isTemplet ? "★ " : ""}{f.name}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--ink-muted)" }}>{f.scope} · 위젯 {f.spec.widgets.length}</span>
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
        <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>아직 없음: 버튼의 저장·삭제·등록 동작 · UI 개발 AI(설명 → UI 자동 설계).</p>
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
              <div data-testid="ui-palette" style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
                    <div>{q.label}</div>
                    <div style={{ color: "var(--ink-muted)" }}>
                      {q.source?.kind === "subcode" ? `Data: Sub Code ${q.source.itemKey}` : q.source?.kind === "table" ? `Data: ${q.source.code}.${q.source.table}` : ""}
                      {q.action ? `동작: ${ACTION_LABEL[q.action]}` : ""}{q.target ? ` → ${q.target}` : ""}{q.filterBy ? ` · Active: ${q.filterBy}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <UiRun spec={spec} subCodes={subCodes} codes={codes} />
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

      {/* ── 오른쪽: Set-up ── */}
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
            {w.type === "table" && (
              <>
                <span style={lab}>동작 대상 Data · 제품 표</span>
                <select data-testid="ui-w-table" value={w.source?.kind === "table" ? `${w.source.code}|${w.source.table}` : ""} disabled={!canEdit}
                  onChange={(e) => { const [code, table] = e.target.value.split("|"); upd(w.id, { source: code && table ? { kind: "table", code, table } : undefined }); }} style={inp}>
                  <option value="">— 고르십시오</option>
                  {codes.flatMap((c) => Object.entries(c.tables).map(([t, tt]) => (
                    <option key={`${c.code}|${t}`} value={`${c.code}|${t}`}>{c.code}.{t} · Item = Sub Code {tt.by} · {tt.cols.length}열</option>
                  )))}
                </select>
              </>
            )}
            {w.type === "button" && (
              <>
                <span style={lab}>동작</span>
                <select data-testid="ui-w-action" value={w.action ?? "find"} disabled={!canEdit} onChange={(e) => upd(w.id, { action: e.target.value as Action })} style={inp}>
                  {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
                </select>
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
            {canEdit && <button type="button" data-testid="ui-w-remove" onClick={() => remove(w.id)} style={btn()}>위젯 지우기</button>}
          </>
        )}
      </div>
    </section>
  );
}

/** Run — 설정 그대로 실제 카탈로그 데이터로 돈다. 찾기 = Combo 값과 같은 Item 행만 · 초기화 = 전부 · 복사 = 보이는 행을 TSV 로. */
function UiRun({ spec, subCodes, codes }: { spec: UiSpec; subCodes: SubCode[]; codes: PCode[] }) {
  const [val, setVal] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Record<string, string | null>>({});
  const [note, setNote] = useState<string | null>(null);
  const tableOf = (q: Widget): TTable | null => {
    if (q.source?.kind !== "table") return null;
    const src = q.source;
    return codes.find((c) => c.code === src.code)?.tables[src.table] ?? null;
  };
  const rowsOf = (q: Widget) => {
    const t = tableOf(q); if (!t) return [];
    const f = filter[q.id];
    return f ? t.rows.filter((r) => r.item === f) : t.rows;
  };
  const press = async (b: Widget) => {
    const tgt = spec.widgets.find((q) => q.id === b.target);
    if (!tgt) { setNote(`${b.id}: 대상 Table 이 정해지지 않았습니다`); return; }
    if (b.action === "reset") { setFilter((f) => ({ ...f, [tgt.id]: null })); setNote(`${tgt.id} 초기화`); return; }
    if (b.action === "find") {
      const v = b.filterBy ? val[b.filterBy] : undefined;
      if (!v) { setNote(`${b.id}: Active Set-up Combo 값을 먼저 고르십시오`); return; }
      setFilter((f) => ({ ...f, [tgt.id]: v }));
      const n = tableOf(tgt)?.rows.filter((r) => r.item === v).length ?? 0;
      setNote(`찾기: ${tgt.id} 에서 Item = ${v} → ${n}행`); return;
    }
    const t = tableOf(tgt); const rows = rowsOf(tgt);
    const tsv = [["Item", ...(t?.cols.map((c) => c.label ?? c.name) ?? [])].join("\t"), ...rows.map((r) => [r.item, ...(t?.cols.map((c) => String(r.cells[c.key] ?? "")) ?? [])].join("\t"))].join("\n");
    try { await navigator.clipboard.writeText(tsv); setNote(`복사: ${rows.length}행을 클립보드에 넣었습니다`); } catch { setNote(`복사: ${rows.length}행 (이 브라우저는 클립보드 쓰기를 막았습니다)`); }
  };
  return (
    <div data-testid="ui-run" style={{ display: "grid", gap: 6 }}>
      <div style={{ position: "relative", width: GRID_W * CELL, height: GRID_H * CELL, border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)" }}>
        {spec.widgets.map((q) => (
          <div key={q.id} data-run-widget={q.id} style={{ position: "absolute", left: q.x * CELL, top: q.y * CELL, width: q.w * CELL - 4, height: q.h * CELL - 4, margin: 2, overflow: "auto", fontSize: 12 }}>
            {q.type === "label" && <span>{q.label}</span>}
            {q.type === "button" && <button type="button" data-run-button={q.id} onClick={() => void press(q)} style={{ ...btn(true), width: "100%", height: "100%" }}>{q.label || ACTION_LABEL[q.action ?? "find"]}</button>}
            {q.type === "combo" && (
              <label style={{ display: "grid", gap: 2 }}>
                <span style={lab}>{q.label}</span>
                <select data-run-combo={q.id} value={val[q.id] ?? ""} onChange={(e) => setVal((v) => ({ ...v, [q.id]: e.target.value }))} style={inp}>
                  <option value="">—</option>
                  {q.source?.kind === "subcode" && subCodes.filter((s) => s.itemKey === (q.source as { itemKey: string }).itemKey).sort((a, b) => a.seq - b.seq)
                    .map((s) => <option key={s.value} value={s.value}>{s.value} · {s.description ?? ""}</option>)}
                </select>
              </label>
            )}
            {q.type === "table" && (
              tableOf(q) ? (
                <table data-run-table={q.id} data-rows={rowsOf(q).length} style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
                  <thead><tr><th style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>Item</th>{tableOf(q)!.cols.map((c) => <th key={c.key} style={{ textAlign: "right", borderBottom: "1px solid var(--line)", padding: "0 4px" }}>{c.key}</th>)}</tr></thead>
                  <tbody>{rowsOf(q).map((r) => <tr key={r.item}><td style={{ fontFamily: "var(--font-mono)" }}>{r.item || "(없음)"}</td>{tableOf(q)!.cols.map((c) => <td key={c.key} style={{ textAlign: "right", padding: "0 4px" }}>{String(r.cells[c.key] ?? "")}</td>)}</tr>)}</tbody>
                </table>
              ) : <span style={{ color: "var(--ink-muted)" }}>{q.label} — 동작 대상 Data 가 정해지지 않았습니다</span>
            )}
          </div>
        ))}
      </div>
      {note && <p data-testid="ui-run-note" style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--accent)" }}>{note}</p>}
    </div>
  );
}
