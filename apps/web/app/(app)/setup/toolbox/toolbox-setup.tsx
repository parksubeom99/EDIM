"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { graphSvg, parsePoints, pointsFromText, type GraphSnap } from "@/app/lib/output-template";
import { FunctionWizard } from "./function-wizard";

/**
 * H8 · p57 [Set-Up / EDIM System Toolbar] Toolbox Macro — Data Management(목록) · 함수 마법사 · 그래프 마법사.
 * 그래프 마법사는 H6 그래프(0029)를 단계로 만든다: 모양 → 그래프 전용 data → 표시선(Output 항목) → 이름·축 → 만들기.
 */
interface Src { type: string; directory: string; name: string; detail: string; href: string }
const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12, display: "grid", gap: 8 };
const h: CSSProperties = { fontSize: "var(--fs-13)", fontWeight: 600, margin: 0 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", boxSizing: "border-box", width: "100%", minWidth: 0 };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const TYPE_LABEL: Record<string, string> = { table: "Table", chart: "Chart", formula: "Formula" };
const STEPS = ["모양", "그래프 전용 data", "표시선", "이름 · 축"];

export function ToolboxSetup({ canEdit }: { canEdit: boolean }) {
  const [type, setType] = useState("");
  const [dir, setDir] = useState("");
  const [srcs, setSrcs] = useState<Src[]>([]);
  const [ready, setReady] = useState(false);
  const loadSrc = useCallback(async () => {
    setReady(false);
    const j = await fetch(`/api/setup/data-sources${type ? `?type=${type}` : ""}`).then((r) => r.json()).catch(() => ({}));
    setSrcs(j.rows ?? []); setReady(true);
  }, [type]);
  useEffect(() => { void loadSrc(); }, [loadSrc]);
  const dirs = [...new Set(srcs.map((s) => s.directory))].sort();
  const shown = srcs.filter((s) => !dir || s.directory === dir);

  const [outs, setOuts] = useState<{ key: string; label: string }[]>([]);
  useEffect(() => { fetch("/api/setup/output-items").then((r) => r.json()).then((j) => setOuts(j.rows ?? [])).catch(() => {}); }, []);
  const [step, setStep] = useState(0);
  const [gw, setGw] = useState({ chart: "line", text: "", markerKey: "", name: "", xLabel: "", yLabel: "" });
  const [gmsg, setGmsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pts = parsePoints(pointsFromText(gw.text));
  const preview: GraphSnap | null = pts.ok ? { name: gw.name || "미리보기", chart: gw.chart === "bar" ? "bar" : "line", xLabel: gw.xLabel, yLabel: gw.yLabel, points: pts.points, marker: null } : null;
  const canNext = step === 0 ? true : step === 1 ? pts.ok : step === 2 ? true : !!gw.name.trim();
  async function create() {
    setGmsg(null);
    const r = await fetch("/api/setup/graphs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: gw.name, chart: gw.chart, xLabel: gw.xLabel, yLabel: gw.yLabel, points: pointsFromText(gw.text), markerKey: gw.markerKey || undefined }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setGmsg(r.ok ? { ok: true, text: `${gw.name} 그래프를 만들었습니다 — 다음 Tech Data 부터 들어갑니다` } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) { setStep(0); setGw({ chart: "line", text: "", markerKey: "", name: "", xLabel: "", yLabel: "" }); await loadSrc(); }
  }

  return (
    <section data-testid="toolbox-setup" style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <div style={card} data-testid="data-mgmt" data-ready={ready ? "1" : "0"} data-type={type}>
        <p style={h}>Data Management · EDIM Information Call</p>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 8 }}>
          <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, color: "var(--ink-muted)" }}>Type of source</span>
            <select data-testid="dm-type" value={type} onChange={(e) => { setType(e.target.value); setDir(""); }} style={inp}>
              <option value="">전부</option><option value="table">Table</option><option value="chart">Chart</option><option value="formula">Formula</option>
            </select></label>
          <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, color: "var(--ink-muted)" }}>Directory</span>
            <select data-testid="dm-dir" value={dir} onChange={(e) => setDir(e.target.value)} style={inp}>
              <option value="">전부 ({dirs.length})</option>{dirs.map((d) => <option key={d} value={d}>{d}</option>)}
            </select></label>
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>Type</th><th style={th}>Directory</th><th style={th}>Name</th><th style={th}>내용</th></tr></thead>
          <tbody>
            {shown.map((s, i) => (
              <tr key={`${s.type}-${s.directory}-${s.name}-${i}`} data-testid="dm-row" data-type={s.type}>
                <td style={td}>{TYPE_LABEL[s.type] ?? s.type}</td><td style={{ ...td, color: "var(--ink-muted)" }}>{s.directory}</td>
                <td style={td}><Link href={s.href} style={{ color: "var(--accent)" }}>{s.name}</Link></td>
                <td style={{ ...td, fontFamily: s.type === "formula" ? "var(--font-mono)" : undefined, maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.detail}>{s.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>목록 화면 — 만들고 고치는 곳은 각 화면(표: Product Code · Table · 그래프: Document Set-Up · 식: 작업대 Macro). 아직 없음: Enterprise DB(AI 학습 자료) — 필요한 입력: 회사 자료 · AI 연결 결정.</p>
      </div>

      <div style={card}>
        <p style={h}>함수 마법사</p>
        <FunctionWizard />
        <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>여기서 만든 식은 작업대 Macro 탭의 <b>함수 마법사</b>에서 바로 Macro 칸에 넣을 수 있습니다 — 저장·승인은 그 탭 한 곳입니다.</p>
      </div>

      <div style={card} data-testid="graph-wizard" data-step={step}>
        <p style={h}>그래프 마법사 — {STEPS.map((s, i) => <span key={s} style={{ fontWeight: i === step ? 700 : 400, color: i === step ? "var(--accent)" : "var(--ink-muted)" }}>{i + 1}. {s}{i < STEPS.length - 1 ? " → " : ""}</span>)}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
            {step === 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                {(["line", "bar"] as const).map((c) => <button key={c} type="button" data-testid={`gw-chart-${c}`} onClick={() => setGw({ ...gw, chart: c })} style={{ fontSize: "var(--fs-12)", fontWeight: gw.chart === c ? 700 : 400, border: `1px solid ${gw.chart === c ? "var(--accent)" : "var(--line)"}`, borderRadius: 4, padding: "6px 14px", background: "var(--surface-0)", color: "var(--ink)" }}>{c === "line" ? "선 그래프" : "막대 그래프"}</button>)}
              </div>
            )}
            {step === 1 && (<>
              <textarea data-testid="gw-points" rows={7} placeholder={"한 줄에 x,y\n20000,900\n40000,820"} value={gw.text} onChange={(e) => setGw({ ...gw, text: e.target.value })} style={{ ...inp, fontFamily: "var(--font-mono)" }} />
              {!pts.ok && gw.text.trim() && <span data-testid="gw-error" style={{ fontSize: 11, color: "var(--warn)" }}>{pts.error}</span>}
            </>)}
            {step === 2 && (
              <select data-testid="gw-marker" value={gw.markerKey} onChange={(e) => setGw({ ...gw, markerKey: e.target.value })} style={inp}>
                <option value="">표시선 없음</option>{outs.map((o) => <option key={o.key} value={o.key}>표시선 = {o.label} (Output 항목)</option>)}
              </select>
            )}
            {step === 3 && (<>
              <input data-testid="gw-name" placeholder="그래프 이름" value={gw.name} onChange={(e) => setGw({ ...gw, name: e.target.value })} style={inp} />
              <input data-testid="gw-x" placeholder="x 축 이름" value={gw.xLabel} onChange={(e) => setGw({ ...gw, xLabel: e.target.value })} style={inp} />
              <input data-testid="gw-y" placeholder="y 축 이름" value={gw.yLabel} onChange={(e) => setGw({ ...gw, yLabel: e.target.value })} style={inp} />
            </>)}
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" data-testid="gw-prev" disabled={step === 0} onClick={() => setStep(step - 1)} style={{ fontSize: "var(--fs-12)" }}>← 이전</button>
              {step < STEPS.length - 1
                ? <button type="button" data-testid="gw-next" disabled={!canNext} onClick={() => setStep(step + 1)} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>다음 →</button>
                : canEdit && <button type="button" data-testid="gw-create" disabled={!canNext || !pts.ok} onClick={() => void create()} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>그래프 만들기</button>}
            </div>
            {gmsg && <span data-testid="gw-msg" data-ok={gmsg.ok ? "1" : "0"} style={{ fontSize: "var(--fs-12)", color: gmsg.ok ? "var(--accent)" : "var(--warn)" }}>{gmsg.text}</span>}
          </div>
          <div data-testid="gw-preview" style={{ background: "#fff", borderRadius: 4, overflow: "hidden", minHeight: 120 }} dangerouslySetInnerHTML={{ __html: preview ? graphSvg(preview) : "" }} />
        </div>
      </div>
    </section>
  );
}
