"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPE } from "react";
import { ANNOT_LABEL, dimLabel, type Annot, type AnnotKind } from "@/app/lib/annotation";
import type { DxfFrame } from "@/app/lib/output/dxf-svg";

/**
 * H10 · p58 그림 제작 Module 1단계 — 주석 편집기. 원 도면 SVG 위에 같은 틀(frame)의 투명 SVG 를 겹친다.
 *   도구: 고르기(끌어 옮기기) · 선 · 사각형 · 글자 · 치수선. 좌표는 도면 좌표(mm)로 저장한다.
 */
type Tool = "select" | AnnotKind;
interface Row extends Annot { id: string }
const LOCKED: [string, string][] = [
  ["Free CAD", "EDIM 안의 CAD 편집기는 아직 없습니다 — 도면은 DXF 를 외부 CAD(AutoCAD·FreeCAD)에서 여십시오"],
  ["설계 심볼", "설계 심볼 배치(p59)는 아직 없습니다 — 부품 배치는 Arrangement 의 Component 칸에서 합니다"],
];
const btn = (on: boolean): CSSProperties => ({ fontSize: "var(--fs-12)", padding: "5px 10px", borderRadius: 4, border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`, background: on ? "var(--accent)" : "var(--surface-1)", color: on ? "var(--accent-contrast, #fff)" : "var(--ink)", fontWeight: on ? 700 : 400, cursor: "pointer" });
const INK = "#c0392b";

export function AnnotEditor({ drawingId, svg, frame, locked, canEdit }: { drawingId: string; svg: string; frame: DxfFrame; locked: boolean; canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [label, setLabel] = useState("주석");
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [moveBy, setMoveBy] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ov = useRef<SVGSVGElement>(null);
  const start = useRef<{ x: number; y: number; id?: string } | null>(null);
  const editable = canEdit && !locked;
  const textH = Math.max(frame.W, frame.H) / 60;
  const sw = Math.max(frame.W, frame.H) / 450;

  const load = useCallback(async () => {
    const j = await fetch(`/api/drawings/${drawingId}/annotations`).then((r) => r.json()).catch(() => ({}));
    setRows(j.rows ?? []); setReady(true);
  }, [drawingId]);
  useEffect(() => { void load(); }, [load]);

  /** 화면 좌표 → 도면 좌표(mm) */
  function toModel(ev: { clientX: number; clientY: number }) {
    const s = ov.current!, pt = s.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(s.getScreenCTM()!.inverse());
    return { x: Math.round((p.x + frame.minX - frame.pad) * 10) / 10, y: Math.round((frame.maxY + frame.pad - p.y) * 10) / 10 };
  }
  const X = (x: number) => x - frame.minX + frame.pad, Y = (y: number) => frame.maxY - y + frame.pad;

  async function call(url: string, method: string, body: unknown, okText: string) {
    setMsg(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    await load();
    return r.ok;
  }

  function down(ev: RPE<SVGSVGElement>) {
    if (!editable) return;
    const m = toModel(ev);
    const hit = (ev.target as Element).closest("[data-aid]")?.getAttribute("data-aid") ?? undefined;
    if (tool === "select") { setSel(hit ?? null); if (hit) start.current = { ...m, id: hit }; return; }
    if (tool === "text") { void call(`/api/drawings/${drawingId}/annotations`, "POST", { kind: "text", x1: m.x, y1: m.y, text: label }, "글자 주석을 더했습니다"); return; }
    start.current = m; setDraft({ x1: m.x, y1: m.y, x2: m.x, y2: m.y });
  }
  function move(ev: RPE<SVGSVGElement>) {
    if (!start.current) return;
    const m = toModel(ev);
    if (start.current.id) setMoveBy({ id: start.current.id, dx: m.x - start.current.x, dy: m.y - start.current.y });
    else setDraft({ x1: start.current.x, y1: start.current.y, x2: m.x, y2: m.y });
  }
  function up() {
    const s0 = start.current; start.current = null;
    if (!s0) return;
    if (s0.id) {
      const mv = moveBy; setMoveBy(null);
      if (mv && Math.hypot(mv.dx, mv.dy) >= 1) void call(`/api/drawing-annotations/${s0.id}`, "PATCH", { dx: Math.round(mv.dx * 10) / 10, dy: Math.round(mv.dy * 10) / 10 }, "주석을 옮겼습니다");
      return;
    }
    const d = draft; setDraft(null);
    if (d && tool !== "select" && tool !== "text") void call(`/api/drawings/${drawingId}/annotations`, "POST", { kind: tool, ...d }, `${ANNOT_LABEL[tool]}을(를) 더했습니다`);
  }

  function shape(a: Annot, key: string, id?: string) {
    const off = moveBy && id === moveBy.id ? moveBy : { dx: 0, dy: 0 };
    const [x1, y1, x2, y2] = [X(a.x1 + off.dx), Y(a.y1 + off.dy), X(a.x2 + off.dx), Y(a.y2 + off.dy)];
    const stroke = id && id === sel ? "#1f6feb" : INK;
    const common = { "data-aid": id, "data-kind": a.kind, "data-testid": id ? `annot-${id}` : undefined, style: { cursor: tool === "select" && editable ? "move" : "crosshair" } } as Record<string, unknown>;
    switch (a.kind) {
      case "line": return <line key={key} {...common} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} />;
      case "rect": return <rect key={key} {...common} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} fill="none" stroke={stroke} strokeWidth={sw} />;
      case "text": return <text key={key} {...common} x={x1} y={y1} fontSize={textH} fill={stroke} fontFamily="monospace">{a.text}</text>;
      case "dim": {
        const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = (-(y2 - y1) / len) * textH * 0.5, ny = ((x2 - x1) / len) * textH * 0.5;
        return (
          <g key={key} {...common}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} />
            <line x1={x1 - nx} y1={y1 - ny} x2={x1 + nx} y2={y1 + ny} stroke={stroke} strokeWidth={sw} />
            <line x1={x2 - nx} y1={y2 - ny} x2={x2 + nx} y2={y2 + ny} stroke={stroke} strokeWidth={sw} />
            <text x={(x1 + x2) / 2 + nx} y={(y1 + y2) / 2 + ny} fontSize={textH} fill={stroke} fontFamily="monospace" textAnchor="middle">{dimLabel(a)}</text>
          </g>
        );
      }
    }
  }

  const tools: Tool[] = ["select", "line", "rect", "text", "dim"];
  return (
    <section data-testid="annot-editor" data-ready={ready ? "1" : "0"} data-count={rows.length} data-locked={locked ? "1" : "0"} style={{ display: "grid", gap: 10, marginTop: 10 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {tools.map((t) => <button key={t} type="button" data-testid={`annot-tool-${t}`} disabled={!editable} onClick={() => { setTool(t); setSel(null); }} style={btn(tool === t)}>{t === "select" ? "고르기·옮기기" : ANNOT_LABEL[t]}</button>)}
        <input data-testid="annot-text-input" value={label} disabled={!editable} onChange={(e) => setLabel(e.target.value)} placeholder="글자 주석" style={{ fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, width: 180 }} />
        <button type="button" data-testid="annot-del" disabled={!editable || !sel} onClick={() => { const id = sel; setSel(null); if (id) void call(`/api/drawing-annotations/${id}`, "DELETE", undefined, "주석을 지웠습니다"); }} style={btn(false)}>고른 주석 지우기</button>
        {LOCKED.map(([k, why]) => <span key={k} data-testid="annot-locked-tool" title={why} style={{ ...btn(false), opacity: 0.5, cursor: "not-allowed" }}>{k} 🔒</span>)}
        <span style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: "var(--fs-12)" }}>
          <a data-testid="annot-dl-orig" href={`/api/drawings/${drawingId}`} style={{ color: "var(--accent)" }}>원 도면 DXF</a>
          <a data-testid="annot-dl-annot" href={`/api/drawings/${drawingId}?annot=1`} style={{ color: "var(--accent)" }}>주석 포함 DXF (ANNOT 레이어)</a>
        </span>
      </div>
      {locked && <p data-testid="annot-locked" style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--warn)" }}>이 도면은 발행돼 주석을 더하거나 고칠 수 없습니다 — 보기만 됩니다.</p>}
      <div style={{ position: "relative", background: "#fff", border: "1px solid var(--line)", borderRadius: 4 }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
        <svg ref={ov} data-testid="annot-overlay" viewBox={`0 0 ${frame.W.toFixed(1)} ${frame.H.toFixed(1)}`} onPointerDown={down} onPointerMove={move} onPointerUp={up}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: editable && tool !== "select" ? "crosshair" : "default" }}>
          {rows.map((r) => shape(r, r.id, r.id))}
          {draft && tool !== "select" && tool !== "text" && shape({ kind: tool, ...draft }, "draft")}
        </svg>
      </div>
      {msg && <p data-testid="annot-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
      <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>주석 {rows.length}개 · 좌표는 도면 mm. 원 도면(BOM 스냅샷에서 뜬 DXF)은 바꾸지 않습니다. 아직 없음: 실제 CAD 편집(Free CAD) · 설계 심볼 — 필요한 입력: EDIM 안 CAD 편집기 결정.</p>
    </section>
  );
}
