"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { LAYOUT_KINDS, KIND_LABEL, type LayoutElement, type LayoutKind } from "@/app/lib/print-layout";

/**
 * H9 · p48 인쇄 양식 편집기 — 요소(제목 · 필드 · 표 · 도면 · 그래프 · 서명칸 · 로고 · 글상자)를 A4 쪽 위에서 끌어 옮기고 모서리로 크기를 바꾼다.
 * 저장 = 새 버전(0030). 발행 전 문서의 인쇄본은 최신 버전을, 발행된 문서는 발행 순간의 버전을 따른다. 숫자·내용은 문서 body 그대로.
 */
type DocType = "quotation" | "techdata";
interface Ver { version: number; createdAt: string; count: number; issued: number }
const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12, display: "grid", gap: 8, alignContent: "start" };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", boxSizing: "border-box", width: "100%", minWidth: 0 };
const small: CSSProperties = { fontSize: 11, color: "var(--ink-muted)" };
const COLOR: Record<LayoutKind, string> = { title: "#1f4e8c", fields: "#2f7d6d", table: "#6b4fa0", drawing: "#8a5a00", graph: "#c0392b", signature: "#444", logo: "#b02a2a", text: "#555" };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (n: number) => Math.round(n * 10) / 10;

export function LayoutEditor({ canEdit }: { canEdit: boolean }) {
  const [docType, setDocType] = useState<DocType>("techdata");
  const [els, setEls] = useState<LayoutElement[]>([]);
  const [def, setDef] = useState<LayoutElement[]>([]);
  const [vers, setVers] = useState<Ver[]>([]);
  const [latest, setLatest] = useState<number | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; mode: "move" | "size"; sx: number; sy: number; e0: LayoutElement } | null>(null);

  const load = useCallback(async (t: DocType) => {
    setReady(false);
    const j = await fetch(`/api/setup/print-layouts?docType=${t}`).then((r) => r.json()).catch(() => ({}));
    setDef(j.default ?? []); setVers(j.versions ?? []); setLatest(j.latest?.version ?? null);
    setEls((j.latest?.elements ?? j.default ?? []) as LayoutElement[]); setSel(null); setDirty(false); setReady(true);
  }, []);
  useEffect(() => { void load(docType); }, [docType, load]);

  const patch = (id: string, p: Partial<LayoutElement>) => { setEls((xs) => xs.map((e) => (e.id === id ? { ...e, ...p } : e))); setDirty(true); };
  useEffect(() => {
    function move(ev: PointerEvent) {
      const d = drag.current, box = page.current?.getBoundingClientRect();
      if (!d || !box) return;
      const dx = ((ev.clientX - d.sx) / box.width) * 100, dy = ((ev.clientY - d.sy) / box.height) * 100;
      if (d.mode === "move") patch(d.id, { x: r1(clamp(d.e0.x + dx, 0, 100 - d.e0.w)), y: r1(clamp(d.e0.y + dy, 0, 100 - d.e0.h)) });
      else patch(d.id, { w: r1(clamp(d.e0.w + dx, 3, 100 - d.e0.x)), h: r1(clamp(d.e0.h + dy, 2, 100 - d.e0.y)) });
    }
    function up() { drag.current = null; }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  function add(kind: LayoutKind) {
    let n = els.length + 1; while (els.some((e) => e.id === `${kind}${n}`)) n++;
    const id = `${kind}${n}`;
    setEls([...els, { id, kind, x: 10, y: 40, w: kind === "table" ? 60 : 30, h: kind === "title" || kind === "logo" ? 7 : 14, ...(kind === "text" ? { text: "글상자" } : {}) }]);
    setSel(id); setDirty(true);
  }
  async function save() {
    setMsg(null);
    const r = await fetch("/api/setup/print-layouts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ docType, elements: els }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; version?: number };
    setMsg(r.ok ? { ok: true, text: `v${j.version} 로 저장했습니다 — 발행 전 문서의 인쇄본이 이 배치를 따릅니다(발행된 문서는 그대로)` } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) await load(docType);
  }
  const cur = els.find((e) => e.id === sel) ?? null;

  return (
    <section data-testid="pl" data-ready={ready ? "1" : "0"} data-doctype={docType} data-latest={latest ?? ""} style={{ display: "grid", gridTemplateColumns: "minmax(360px, 520px) 1fr", gap: 12, marginTop: 12 }}>
      <div style={card}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select data-testid="pl-doctype" value={docType} onChange={(e) => setDocType(e.target.value as DocType)} style={{ ...inp, width: "auto" }}>
            <option value="techdata">Tech Data</option><option value="quotation">견적서</option>
          </select>
          <span style={small}>{latest ? `저장된 최신 v${latest}` : "저장된 양식 없음 — 기본 배치"}{dirty ? " · 고친 곳 있음" : ""}</span>
        </div>
        <div ref={page} data-testid="pl-page" style={{ position: "relative", width: "100%", aspectRatio: "210 / 297", background: "#fff", border: "1px solid var(--line)", touchAction: "none", userSelect: "none" }}>
          {els.map((e) => (
            <div key={e.id} data-testid={`pl-el-${e.id}`} data-kind={e.kind} data-x={e.x} data-y={e.y} data-w={e.w} data-h={e.h}
              onPointerDown={(ev) => { if (!canEdit) return; setSel(e.id); drag.current = { id: e.id, mode: "move", sx: ev.clientX, sy: ev.clientY, e0: e }; }}
              style={{ position: "absolute", left: `${e.x}%`, top: `${e.y}%`, width: `${e.w}%`, height: `${e.h}%`, border: `1.5px ${sel === e.id ? "solid" : "dashed"} ${COLOR[e.kind]}`, background: `${COLOR[e.kind]}14`, color: COLOR[e.kind], fontSize: 11, padding: 3, boxSizing: "border-box", cursor: canEdit ? "move" : "default", overflow: "hidden" }}>
              {KIND_LABEL[e.kind]}{e.text ? ` · ${e.text}` : ""}
              {canEdit && <span data-testid={`pl-handle-${e.id}`} onPointerDown={(ev) => { ev.stopPropagation(); setSel(e.id); drag.current = { id: e.id, mode: "size", sx: ev.clientX, sy: ev.clientY, e0: e }; }}
                style={{ position: "absolute", right: 0, bottom: 0, width: 10, height: 10, background: COLOR[e.kind], cursor: "nwse-resize" }} />}
            </div>
          ))}
        </div>
        <span style={small}>요소를 끌어 옮기고, 오른쪽 아래 모서리로 크기를 바꿉니다. 위치·크기는 쪽 대비 %.</span>
      </div>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        {canEdit && (
          <div style={card}>
            <b style={{ fontSize: "var(--fs-13)" }}>요소 더하기</b>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LAYOUT_KINDS.map((k) => <button key={k} type="button" data-testid={`pl-add-${k}`} onClick={() => add(k)} style={{ fontSize: "var(--fs-12)" }}>+ {KIND_LABEL[k]}</button>)}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" data-testid="pl-default" onClick={() => { setEls(def); setSel(null); setDirty(true); }} style={{ fontSize: "var(--fs-12)" }}>기본 양식 배치</button>
              <button type="button" data-testid="pl-save" disabled={!dirty || els.length === 0} onClick={() => void save()} style={{ fontSize: "var(--fs-12)", fontWeight: 600, marginLeft: "auto" }}>새 버전으로 저장</button>
            </div>
          </div>
        )}
        {cur && (
          <div style={card} data-testid="pl-selected" data-id={cur.id}>
            <b style={{ fontSize: "var(--fs-13)" }}>{KIND_LABEL[cur.kind]} <span style={small}>{cur.id}</span></b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label key={k} style={{ display: "grid", gap: 2 }}><span style={small}>{k} (%)</span>
                  <input data-testid={`pl-sel-${k}`} type="number" step={0.5} disabled={!canEdit} value={cur[k]} onChange={(ev) => patch(cur.id, { [k]: Number(ev.target.value) })} style={inp} /></label>
              ))}
            </div>
            {(cur.kind === "title" || cur.kind === "logo" || cur.kind === "text") && (
              <input data-testid="pl-sel-text" disabled={!canEdit} placeholder={cur.kind === "title" ? "비우면 문서 제목" : "글자"} value={cur.text ?? ""} onChange={(ev) => patch(cur.id, { text: ev.target.value })} style={inp} />
            )}
            {canEdit && <button type="button" data-testid="pl-del" onClick={() => { setEls(els.filter((e) => e.id !== cur.id)); setSel(null); setDirty(true); }} style={{ fontSize: "var(--fs-12)", justifySelf: "start" }}>이 요소 빼기</button>}
          </div>
        )}
        <div style={card}>
          <b style={{ fontSize: "var(--fs-13)" }}>버전</b>
          {vers.length === 0 && <span style={small}>아직 저장한 버전이 없습니다 — 인쇄본은 기존 모양 그대로입니다.</span>}
          {vers.map((v) => <div key={v.version} data-testid={`pl-ver-${v.version}`} data-issued={v.issued} style={{ fontSize: "var(--fs-12)" }}>v{v.version} · 요소 {v.count} · {v.createdAt.slice(0, 16).replace("T", " ")}{v.issued ? ` · 발행 문서 ${v.issued}건이 이 버전으로 고정` : ""}</div>)}
        </div>
        {msg && <p data-testid="pl-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
        <p style={{ ...small, margin: 0 }}>표·필드·그래프·도면 칸의 내용은 문서(스냅샷)에서 옵니다 — 양식은 자리만 정합니다. 용지·여백·글꼴·워터마크는 <a href="/setup/print" style={{ color: "var(--accent)" }}>Print 설정</a>. 아직 없음: Office 파일(.docx · .xlsx)로 내보내기 — 인쇄본은 브라우저 PDF 저장.</p>
      </div>
    </section>
  );
}
