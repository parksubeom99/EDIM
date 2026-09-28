"use client";

import { useState, type CSSProperties } from "react";
import type { UiSpec } from "@/app/lib/ui-form";

/**
 * C · Toolbox 'Special: 팬 선정' — 입력 화면은 회사가 UI Form(Toolbox · p25·26)으로 만든 폼을 **그대로** 쓴다(같은 위젯 id).
 * number 위젯의 param(q_cmh · p_pa · rho)이 계산 입력이다. 실행은 서버 결정론 · 결과 카드 · 사용 기록(오늘 n회 · 요금).
 */
export interface SpecialGrantView {
  programKey: string; title: string; pricePerRun: number; currency: string; binding: unknown;
  form: { id: string; name: string; spec: UiSpec } | null;
  usage: { today: number; todayAmount: number; total: number };
}
interface Pick { model: string; rpm: number; q: number; p: number; eta: number; shaftKw: number; motorKw: number }
interface RunOut { result: { ok: boolean; pick?: Pick; candidates?: Pick[]; dropped: { model: string; rpm: number; why: string }[]; reason?: string }; price: number; currency: string; source: string; fetched: string; sampleNote: string; error?: string }

const CELL = 14;
const field: CSSProperties = { width: "100%", boxSizing: "border-box", fontSize: "var(--fs-13)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)" };
const muted: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)" };
const won = (n: number) => n.toLocaleString("ko-KR");

export function SpecialPanel({ grant, canRun, onUsage }: { grant: SpecialGrantView; canRun: boolean; onUsage: () => void }) {
  const widgets = grant.form?.spec.widgets ?? [];
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(widgets.filter((w) => w.type === "number").map((w) => [w.id, w.param === "rho" ? "1.2" : ""])));
  const [source, setSource] = useState<"platform" | "tenant">("platform");
  const [out, setOut] = useState<RunOut | null>(null);
  const [busy, setBusy] = useState(false);
  if (!grant.form) return <div data-testid="special-panel" data-ready="1" style={{ padding: 8, ...muted }}>입력 폼이 없습니다 — 의뢰할 때 UI Form 을 고르십시오.</div>;
  const run = async () => {
    setBusy(true);
    const inputs: Record<string, string> = {};
    for (const w of widgets) if (w.type === "number" && w.param) inputs[w.param] = vals[w.id] ?? "";
    const r = await fetch(`/api/special/${grant.programKey}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inputs, source }) });
    const j = (await r.json().catch(() => ({}))) as RunOut;
    setBusy(false);
    setOut(r.ok ? j : ({ error: j.error ?? `HTTP ${r.status}` } as RunOut));
    onUsage();
  };
  const pick = out?.result?.ok ? out.result.pick : null;
  const H = Math.max(...widgets.map((w) => w.y + w.h), 1);
  return (
    <div data-testid="special-panel" data-ready="1" data-form={grant.form.id} style={{ padding: 8, display: "grid", gap: 8 }}>
      <div style={muted}>{grant.title} · 입력 폼 <b>{grant.form.name}</b>(Toolbox UI Form 그대로) · 1회 {won(grant.pricePerRun)} {grant.currency}(샘플)</div>
      <div data-testid="special-form" style={{ position: "relative", height: H * CELL + 4, border: "1px dashed var(--line)", borderRadius: 4 }}>
        {widgets.map((w) => (
          <div key={w.id} data-widget={w.id} data-type={w.type} data-param={w.param ?? ""} style={{ position: "absolute", left: w.x * CELL, top: w.y * CELL, width: w.w * CELL - 4, height: w.h * CELL - 4, margin: 2, fontSize: 11 }}>
            {w.type === "number" ? (
              <label style={{ display: "block" }}>{w.label}{w.unit ? ` [${w.unit}]` : ""}
                <input data-testid={`special-in-${w.param}`} inputMode="decimal" value={vals[w.id] ?? ""} onChange={(e) => setVals({ ...vals, [w.id]: e.target.value })} style={field} />
              </label>
            ) : w.type === "label" ? <span>{w.label}</span> : <span style={muted}>{w.label}</span>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <select data-testid="special-source" value={source} onChange={(e) => setSource(e.target.value === "tenant" ? "tenant" : "platform")} style={{ ...field, width: "auto" }}>
          <option value="platform">자료: 플랫폼 팬 성능표(DB①)</option>
          <option value="tenant">자료: 우리 회사 팬 표</option>
        </select>
        <button type="button" data-testid="special-run" disabled={busy || !canRun} onClick={run}
          style={{ fontSize: "var(--fs-12)", padding: "4px 12px", borderRadius: 4, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--accent-contrast)", cursor: busy || !canRun ? "not-allowed" : "pointer", opacity: busy || !canRun ? 0.5 : 1 }}>
          {busy ? "…" : "실행"}
        </button>
        <span data-testid="special-meter" data-today={grant.usage.today} data-amount={grant.usage.todayAmount} style={muted}>오늘 {grant.usage.today}회 · 요금 합계 {won(grant.usage.todayAmount)} {grant.currency}(샘플)</span>
      </div>
      {out?.error && <div data-testid="special-error" style={{ ...muted, color: "var(--warn)" }}>{out.error}</div>}
      {out && !out.error && (
        <div data-testid="special-result" data-ok={out.result.ok ? "1" : "0"} data-model={pick?.model ?? ""} data-rpm={pick?.rpm ?? ""} data-motor={pick?.motorKw ?? ""} data-price={out.price}
          style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 8 }}>
          {pick ? (
            <>
              <div style={{ fontSize: "var(--fs-14)", fontWeight: 600 }}>{pick.model} · {pick.rpm} rpm · 모터 {pick.motorKw} kW</div>
              <div style={muted}>동작점 {won(Math.round(pick.q))} CMH · {Math.round(pick.p)} Pa · 효율 {Math.round(pick.eta * 1000) / 10}% · 축동력 {pick.shaftKw} kW</div>
              <div style={muted}>후보 {out.result.candidates?.length ?? 0} · 탈락 {out.result.dropped.length}{out.result.dropped.length ? ` (${out.result.dropped.slice(0, 3).map((d) => `${d.model} ${d.rpm}: ${d.why}`).join(" · ")}${out.result.dropped.length > 3 ? " …" : ""})` : ""}</div>
            </>
          ) : <div style={{ color: "var(--warn)" }}>{out.result.reason}</div>}
          <div data-testid="special-binding" style={{ ...muted, marginTop: 4 }}>이 계산이 가져온 자료: {out.fetched}</div>
          <div style={{ ...muted, marginTop: 2 }}>{out.sampleNote} · 이번 요금 {won(out.price)} {out.currency}</div>
        </div>
      )}
    </div>
  );
}
