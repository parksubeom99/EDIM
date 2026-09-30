"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ACTION_LABEL, GRID_H, GRID_W, WRITE_ACTIONS, type UiSpec, type Widget } from "@/app/lib/ui-form";

/**
 * p25·p26 UI Form 의 Run — Set-Up 작업장(/setup/ui)과 작업대 Inspector(노드에 붙은 폼)가 같이 쓴다.
 *   찾기 = Combo 값과 같은 Item 행만 · 초기화 = 전부 · 복사 = 보이는 행을 TSV 로
 *   저장 · 삭제 · 등록(ccmd M) = 대상 표의 한 행(Item = Active Set-up Combo 값)을 서버가 쓴다(/api/ui-forms/[id]/run — Set-Up 표 편집과 같은 검증 · 역할 · 감사)
 *   실행(Call · ccmd M) = 하이퍼링크(EDIM 안 경로) · 매크로 실행(연결 노드의 승인 매크로 · Combo 값 = 코드 슬롯)
 *   Canvas(ccmd M) = 대상 표의 수로 된 열을 선으로 그린다(행 = Item 순서)
 */
export interface SubCode { itemKey: string; itemName: string; value: string; description: string | null; seq: number }
export interface TCol { key: string; name: string; label?: string }
export interface TTable { no: number; by: string; cols: TCol[]; rows: { item: string; cells: Record<string, unknown> }[] }
export interface PCode { code: string; name: string; tables: Record<string, TTable> }

export const CELL = 34;
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const btnP: CSSProperties = { fontSize: "var(--fs-12)", fontWeight: 600, padding: "4px 10px", borderRadius: 4, cursor: "pointer", border: "none", background: "var(--accent)", color: "var(--accent-contrast)" };

/** 카탈로그(Sub Code · 제품 표) — 표를 쓴 뒤 다시 읽을 수 있게 reload 를 준다. */
export function useCatalog(): { subCodes: SubCode[]; codes: PCode[]; ready: boolean; reload: () => Promise<void> } {
  const [subCodes, setSubCodes] = useState<SubCode[]>([]);
  const [codes, setCodes] = useState<PCode[]>([]);
  const [ready, setReady] = useState(false);
  const reload = useCallback(async () => {
    const c = (await fetch("/api/setup/catalog").then((r) => r.json()).catch(() => ({}))) as { subCodes?: SubCode[]; productCodes?: PCode[] };
    setSubCodes(c.subCodes ?? []); setCodes((c.productCodes ?? []).filter((p) => Object.keys(p.tables ?? {}).length > 0)); setReady(true);
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { subCodes, codes, ready, reload };
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** Canvas — 표의 수로 된 열을 선으로(결정론 · 라이브러리 없음). */
function CanvasChart({ q, t }: { q: Widget; t: TTable }) {
  const W = q.w * CELL - 12, H = q.h * CELL - 28;
  const cols = t.cols.filter((c) => (q.cols?.length ? q.cols.includes(c.key) : true) && t.rows.some((r) => num(r.cells[c.key]) !== null));
  const vals = cols.flatMap((c) => t.rows.map((r) => num(r.cells[c.key])).filter((x): x is number => x !== null));
  if (!cols.length || !vals.length) return <span style={{ color: "var(--ink-muted)" }}>{q.label} — 그릴 수가 없습니다</span>;
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1, n = t.rows.length;
  const X = (i: number) => 28 + (n <= 1 ? 0 : (i * (W - 36)) / (n - 1)), Y = (v: number) => 6 + (H - 22) * (1 - (v - lo) / span);
  const COLORS = ["var(--accent)", "#d97706", "#2563eb", "#7c3aed", "#059669", "#dc2626", "#0891b2", "#65a30d"];
  return (
    <svg data-run-canvas={q.id} data-series={cols.length} data-points={n} width={W} height={H} role="img" aria-label={`${q.label} 그래프`} style={{ display: "block" }}>
      <line x1={28} y1={H - 16} x2={W - 4} y2={H - 16} stroke="var(--line)" />
      <line x1={28} y1={4} x2={28} y2={H - 16} stroke="var(--line)" />
      <text x={2} y={12} fontSize={9} fill="var(--ink-muted)">{hi}</text>
      <text x={2} y={H - 18} fontSize={9} fill="var(--ink-muted)">{lo}</text>
      {t.rows.map((r, i) => <text key={r.item} x={X(i)} y={H - 4} fontSize={9} textAnchor="middle" fill="var(--ink-muted)">{r.item}</text>)}
      {cols.map((c, k) => {
        const pts = t.rows.map((r, i) => [i, num(r.cells[c.key])] as const).filter((p): p is readonly [number, number] => p[1] !== null);
        return <g key={c.key} data-series-key={c.key}>
          <polyline fill="none" stroke={COLORS[k % COLORS.length]} strokeWidth={1.6} points={pts.map(([i, v]) => `${X(i)},${Y(v)}`).join(" ")} />
          {pts.map(([i, v]) => <circle key={i} cx={X(i)} cy={Y(v)} r={2} fill={COLORS[k % COLORS.length]} />)}
          <text x={W - 4} y={10 + k * 10} fontSize={9} textAnchor="end" fill={COLORS[k % COLORS.length]}>{c.key}</text>
        </g>;
      })}
    </svg>
  );
}

export function UiRun({ formId, spec, subCodes, codes, nodeStable, dirty, onWritten, testid = "ui-run" }: {
  formId: string | null; spec: UiSpec; subCodes: SubCode[]; codes: PCode[];
  /** 매크로 실행이 쓸 노드 — 작업대에서는 지금 노드, 작업장에서는 폼이 붙은 첫 노드 */
  nodeStable?: string | null;
  /** 저장하지 않은 변경이 있으면 쓰기(저장·삭제·등록)를 막는다 — 서버는 저장된 폼으로 판정한다 */
  dirty?: boolean;
  onWritten?: () => Promise<void> | void;
  testid?: string;
}) {
  const [val, setVal] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Record<string, string | null>>({});
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
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
  const say = (ok: boolean, text: string) => setNote({ ok, text });
  const press = async (b: Widget) => {
    if (b.action === "call") {
      if (b.call?.kind === "link") { window.location.assign(b.call.href); return; }
      const node = nodeStable ?? spec.nodes?.[0] ?? null;
      if (!node) { say(false, `${b.id}: 매크로 실행 — 이 폼이 붙은 Work Hierarchy 노드가 없습니다`); return; }
      const slots: Record<string, string> = {};
      for (const q of spec.widgets) if (q.type === "combo" && q.source?.kind === "subcode" && val[q.id]) slots[q.source.itemKey] = val[q.id]!;
      setBusy(true);
      const r = await fetch("/api/run/edim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ node, slots }) });
      const j = (await r.json().catch(() => ({}))) as { status?: string; value?: number | null; message?: string; revision?: number | null; error?: string };
      setBusy(false);
      say(r.ok && j.status === "ran", r.ok ? (j.status === "ran" ? `매크로 실행 — 승인 매크로 r${j.revision ?? "?"} = ${j.value}` : `매크로 실행 — ${j.message ?? j.status}`) : `거부 (${r.status}): ${j.error ?? ""}`);
      return;
    }
    const tgt = spec.widgets.find((q) => q.id === b.target);
    if (!tgt) { say(false, `${b.id}: 대상 Table 이 정해지지 않았습니다`); return; }
    if (b.action && WRITE_ACTIONS.includes(b.action)) {
      if (!formId || dirty) { say(false, "폼을 먼저 저장하십시오 — 쓰기는 저장된 폼 설정으로만 돈다"); return; }
      const item = b.filterBy ? val[b.filterBy] : "";
      const values: Record<string, string> = {};
      for (const q of spec.widgets) if (q.type === "number" && q.col && (val[q.id] ?? "") !== "") values[q.id] = val[q.id]!;
      setBusy(true);
      const r = await fetch(`/api/ui-forms/${formId}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ button: b.id, item, values }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; rows?: number };
      setBusy(false);
      say(r.ok, r.ok ? `${ACTION_LABEL[b.action]}: ${tgt.id} Item ${item} — 표 ${j.rows ?? "?"}행 (Set-Up 표에 반영 · BOM · 매크로가 이 표를 읽는다)` : `거부 (${r.status}): ${j.error ?? ""}`);
      if (r.ok) await onWritten?.();
      return;
    }
    if (b.action === "reset") { setFilter((f) => ({ ...f, [tgt.id]: null })); say(true, `${tgt.id} 초기화`); return; }
    if (b.action === "find" || !b.action) {
      const v = b.filterBy ? val[b.filterBy] : undefined;
      if (!v) { say(false, `${b.id}: Active Set-up Combo 값을 먼저 고르십시오`); return; }
      setFilter((f) => ({ ...f, [tgt.id]: v }));
      const n = tableOf(tgt)?.rows.filter((r) => r.item === v).length ?? 0;
      say(true, `찾기: ${tgt.id} 에서 Item = ${v} → ${n}행`); return;
    }
    const t = tableOf(tgt); const rows = rowsOf(tgt);
    const tsv = [["Item", ...(t?.cols.map((c) => c.label ?? c.name) ?? [])].join("\t"), ...rows.map((r) => [r.item, ...(t?.cols.map((c) => String(r.cells[c.key] ?? "")) ?? [])].join("\t"))].join("\n");
    try { await navigator.clipboard.writeText(tsv); say(true, `복사: ${rows.length}행을 클립보드에 넣었습니다`); } catch { say(true, `복사: ${rows.length}행 (이 브라우저는 클립보드 쓰기를 막았습니다)`); }
  };
  return (
    <div data-testid={testid} data-busy={busy ? "1" : "0"} style={{ display: "grid", gap: 6 }}>
      <div style={{ position: "relative", width: GRID_W * CELL, maxWidth: "100%", height: GRID_H * CELL, border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", overflow: "auto" }}>
        {spec.widgets.map((q) => (
          <div key={q.id} data-run-widget={q.id} style={{ position: "absolute", left: q.x * CELL, top: q.y * CELL, width: q.w * CELL - 4, height: q.h * CELL - 4, margin: 2, overflow: "auto", fontSize: 12 }}>
            {q.type === "label" && <span>{q.label}</span>}
            {q.type === "number" && <label style={{ display: "grid", gap: 2 }}><span style={lab}>{q.label}{q.unit ? ` [${q.unit}]` : ""}{q.param ? ` · ${q.param}` : ""}{q.col ? ` → 열 ${q.col}` : ""}</span><input data-run-number={q.id} inputMode="decimal" value={val[q.id] ?? ""} onChange={(e) => setVal((v) => ({ ...v, [q.id]: e.target.value }))} style={inp} /></label>}
            {q.type === "button" && <button type="button" data-run-button={q.id} data-action={q.action ?? "find"} disabled={busy} onClick={() => void press(q)} style={{ ...btnP, width: "100%", height: "100%", opacity: busy ? 0.6 : 1 }}>{q.label || ACTION_LABEL[q.action ?? "find"]}</button>}
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
                  <tbody>{rowsOf(q).map((r) => <tr key={r.item} data-item={r.item}><td style={{ fontFamily: "var(--font-mono)" }}>{r.item || "(없음)"}</td>{tableOf(q)!.cols.map((c) => <td key={c.key} data-col={c.key} style={{ textAlign: "right", padding: "0 4px" }}>{String(r.cells[c.key] ?? "")}</td>)}</tr>)}</tbody>
                </table>
              ) : <span style={{ color: "var(--ink-muted)" }}>{q.label} — 동작 대상 Data 가 정해지지 않았습니다</span>
            )}
            {q.type === "canvas" && (tableOf(q) ? <><span style={lab}>{q.label}</span><CanvasChart q={q} t={tableOf(q)!} /></> : <span style={{ color: "var(--ink-muted)" }}>{q.label} — 그릴 표가 정해지지 않았습니다</span>)}
          </div>
        ))}
      </div>
      {note && <p data-testid={`${testid}-note`} data-ok={note.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: note.ok ? "var(--accent)" : "var(--warn)" }}>{note.text}</p>}
    </div>
  );
}
