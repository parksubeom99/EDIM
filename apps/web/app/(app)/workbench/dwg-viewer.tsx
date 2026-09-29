"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PartInfoPanel } from "./part-info-panel";

/**
 * F6 · p13 · p58 DWG View — 툴바 "DWG View ▼" 가 도면을 **화면에 띄운다**.
 * 서버가 BOM 스냅샷에서 DXF 를 뜨고(도면과 같은 입구) 그 DXF 를 SVG 로 옮겨 준다 — 새 도면 계산 없음. 내려받기는 뷰어 안 링크.
 */
const VIEWS: [string, string][] = [["plan", "평면도"], ["front", "정면도"], ["right", "우측면도"], ["assembly", "조립도"], ["iso", "3D 등각"], ["exploded", "분해도"]];
const back: CSSProperties = { position: "fixed", inset: 0, background: "rgba(10,20,25,0.45)", zIndex: 50, display: "grid", placeItems: "center" };
const box: CSSProperties = { width: "min(1200px, 94vw)", height: "min(820px, 90vh)", background: "var(--surface-0)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", display: "grid", gridTemplateRows: "auto 1fr", overflow: "hidden" };

export function DwgViewer({ runId, view, onView, onClose }: { runId: string; view: string; onView: (v: string) => void; onClose: () => void }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [part, setPart] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    setSvg(null); setErr(null);
    fetch(`/api/dxf?runId=${runId}&type=${view}&format=svg`).then(async (r) => {
      const t = await r.text();
      if (!live) return;
      if (!r.ok) { try { setErr(JSON.parse(t).error ?? t); } catch { setErr(t); } return; }
      setSvg(t);
    }).catch(() => live && setErr("불러오기 실패"));
    return () => { live = false; };
  }, [runId, view]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div style={back} onClick={onClose}>
      <div data-testid="dwg-viewer" data-view={view} data-run={runId} data-ready={svg ? "1" : err ? "err" : "0"} style={box} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--line)" }}>
          <b style={{ fontSize: "var(--fs-13)" }}>DWG View</b>
          {VIEWS.map(([v, l]) => (
            <button key={v} type="button" data-testid={`dwg-viewer-${v}`} onClick={() => onView(v)}
              style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer", background: v === view ? "var(--accent)" : "var(--surface-2)", color: v === view ? "var(--accent-contrast)" : "var(--ink)" }}>{l}</button>
          ))}
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>스냅샷 {runId.slice(0, 8)} · 그 DXF 를 그대로 그림(다시 계산하지 않음)</span>
          <a data-testid="dwg-viewer-download" href={`/api/dxf?runId=${runId}&type=${view}`} download style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)" }}>DXF 내려받기</a>
          <button type="button" data-testid="dwg-viewer-close" onClick={onClose} style={{ fontSize: 12 }}>닫기 ✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: view === "assembly" ? "1fr 400px" : "1fr", minHeight: 0 }}>
          <div style={{ overflow: "auto", background: "#fff", padding: 8 }}
            onDoubleClick={(e) => { const b = (e.target as Element).closest?.("[data-balloon]")?.getAttribute("data-balloon"); if (b) setPart(Number(b)); }}>
            {err && <p data-testid="dwg-viewer-error" style={{ color: "var(--warn)" }}>{err}</p>}
            {!svg && !err && <p style={{ color: "var(--ink-muted)" }}>도면을 그리는 중…</p>}
            {svg && <div data-testid="dwg-viewer-svg" style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="100%" height="100%" ') }} />}
          </div>
          {/* ccmd K · KC-4 · p28 · p38 — 조립도 옆 Item 표 · 줄 또는 풍선번호 더블클릭 = 부품의 정보(스냅샷 기준) */}
          {view === "assembly" && <PartInfoPanel runId={runId} selected={part} onSelect={setPart} />}
        </div>
      </div>
    </div>
  );
}
