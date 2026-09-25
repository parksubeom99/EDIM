"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * p48 Print Set-up Form — 기본 양식 배치(종류별 양식) · 워터마크 · Font · Font 크기 · 용지 크기 · 색상 · 머리글/바닥글 · 여백.
 * 오른쪽 Print Test = 그 종류의 가장 최근 문서를 **저장된 양식**으로 그린 인쇄본(같은 /print 라우트 — 미리보기용 두 번째 렌더러 없음).
 * Type of File 은 PDF(브라우저 인쇄 → PDF 저장). Office 내보내기는 아직 없다.
 */
type DocType = "quotation" | "techdata";
interface Settings { paper: string; orientation: string; marginMm: number; font: string; fontSizePx: number; color: string; header: string; footer: string; watermark: string }
interface Got { settings: Settings; saved: boolean; updatedAt: string | null; sample: { id: string; docNo: string; currentRev: string } | null; choices: { papers: string[]; fonts: string[] } }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 14 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-13)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const tabBtn = (on: boolean): CSSProperties => ({ fontSize: "var(--fs-12)", padding: "4px 12px", borderRadius: 4, cursor: "pointer", border: "1px solid var(--line)", background: on ? "var(--accent)" : "var(--surface-2)", color: on ? "var(--accent-contrast)" : "var(--ink)" });

export function PrintSetup({ canEdit }: { canEdit: boolean }) {
  const [type, setType] = useState<DocType>("quotation");
  const [got, setGot] = useState<Got | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState(0);

  const load = useCallback(async (t: DocType) => {
    const j = (await fetch(`/api/print-setup?type=${t}`).then((r) => r.json())) as Got;
    setGot(j); setForm(j.settings);
  }, []);
  useEffect(() => { void load(type); setMsg(null); }, [type, load]);

  const set = (k: keyof Settings, v: string | number) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const dirty = !!got && !!form && JSON.stringify(got.settings) !== JSON.stringify(form);

  async function save() {
    if (!form) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/print-setup", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, settings: form }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "저장했습니다 — Print Test 가 저장된 양식으로 다시 그려집니다" } : { ok: false, text: `거부: ${j.error ?? r.status}` });
    if (r.ok) { await load(type); setVer((v) => v + 1); }
  }

  return (
    <section data-testid="print-setup" data-ready={got ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, marginTop: 14 }}>
      <div style={card}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {(["quotation", "techdata"] as const).map((t) => (
            <button key={t} type="button" data-testid={`ps-type-${t}`} onClick={() => setType(t)} style={tabBtn(type === t)}>{t === "quotation" ? "견적서 (Quotation)" : "Tech Data"}</button>
          ))}
        </div>
        {form && got && (
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "8px 10px", alignItems: "center" }}>
            <span style={lab}>Type of File</span><span style={{ fontSize: "var(--fs-13)" }}>PDF (인쇄 → PDF 저장)</span>
            <span style={lab}>용지 크기</span>
            <select data-testid="ps-paper" disabled={!canEdit} value={form.paper} onChange={(e) => set("paper", e.target.value)} style={inp}>{got.choices.papers.map((p) => <option key={p}>{p}</option>)}</select>
            <span style={lab}>방향</span>
            <select data-testid="ps-orientation" disabled={!canEdit} value={form.orientation} onChange={(e) => set("orientation", e.target.value)} style={inp}>
              <option value="portrait">세로</option><option value="landscape">가로</option>
            </select>
            <span style={lab}>여백 (mm)</span>
            <input data-testid="ps-margin" type="number" min={5} max={30} disabled={!canEdit} value={form.marginMm} onChange={(e) => set("marginMm", Number(e.target.value))} style={inp} />
            <span style={lab}>Font</span>
            <select data-testid="ps-font" disabled={!canEdit} value={form.font} onChange={(e) => set("font", e.target.value)} style={inp}>{got.choices.fonts.map((f) => <option key={f}>{f}</option>)}</select>
            <span style={lab}>Font 크기 (px)</span>
            <input data-testid="ps-size" type="number" min={9} max={16} step={0.5} disabled={!canEdit} value={form.fontSizePx} onChange={(e) => set("fontSizePx", Number(e.target.value))} style={inp} />
            <span style={lab}>색상</span>
            <select data-testid="ps-color" disabled={!canEdit} value={form.color} onChange={(e) => set("color", e.target.value)} style={inp}>
              <option value="color">칼라</option><option value="mono">흑백</option>
            </select>
            <span style={lab}>머리글</span>
            <input data-testid="ps-header" disabled={!canEdit} value={form.header} placeholder="예: Acme AHU · 기술영업팀" onChange={(e) => set("header", e.target.value)} style={inp} />
            <span style={lab}>바닥글</span>
            <input data-testid="ps-footer" disabled={!canEdit} value={form.footer} placeholder="예: Good air makes Good Life" onChange={(e) => set("footer", e.target.value)} style={inp} />
            <span style={lab}>워터마크</span>
            <input data-testid="ps-watermark" disabled={!canEdit} value={form.watermark} placeholder="예: CONFIDENTIAL" onChange={(e) => set("watermark", e.target.value)} style={inp} />
          </div>
        )}
        {canEdit && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <button type="button" data-testid="ps-save" disabled={busy || !dirty} onClick={() => void save()}
              style={{ fontSize: "var(--fs-12)", fontWeight: 600, padding: "5px 14px", borderRadius: 4, border: "none", background: "var(--accent)", color: "var(--accent-contrast)", cursor: busy || !dirty ? "not-allowed" : "pointer", opacity: busy || !dirty ? 0.5 : 1 }}>저장</button>
            <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>{got?.saved ? `저장된 양식 · ${got.updatedAt?.slice(0, 16).replace("T", " ")}` : "기본 양식 (아직 저장 안 함)"}</span>
          </div>
        )}
        {msg && <p data-testid="ps-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: "8px 0 0", fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>아직 없음: Data 위치 설정 · 그래프 불러오기 · Office 내보내기(청사진 p48 노란 상자의 나머지).</p>
      </div>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <span style={lab}>Print Test</span>
          {got?.sample ? (
            <>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" }}>{got.sample.docNo} · Rev {got.sample.currentRev}</span>
              <a data-testid="ps-open" href={`/api/documents/${got.sample.id}/print`} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: "var(--fs-12)", color: "var(--accent)" }}>새 창에서 열어 인쇄 →</a>
            </>
          ) : <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>이 종류의 문서가 아직 없습니다 — 작업대 Document 탭에서 먼저 만드십시오</span>}
        </div>
        {got?.sample && (
          <iframe key={`${type}-${ver}`} data-testid="ps-preview" title="Print Test" src={`/api/documents/${got.sample.id}/print?v=${ver}`}
            style={{ width: "100%", height: 720, border: "1px solid var(--line)", borderRadius: 4, background: "#fff" }} />
        )}
      </div>
    </section>
  );
}
