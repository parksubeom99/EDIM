"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { FUNCS, buildCall, asMacro } from "@/app/lib/macro-wizard";

/**
 * H8 · p57 함수 마법사 — 함수를 고르고 인자 칸을 채우면 매크로 식 글자가 만들어진다.
 * 맞는지는 기존 역번역(/api/macros/describe — 파서 그대로)이 곧바로 알려 주고, onInsert 가 있으면 Macro 칸으로 넣는다.
 * 저장·승인은 그대로 Macro 탭(Verify → Save draft → 승인). 마법사는 아무것도 저장하지 않는다.
 */
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", boxSizing: "border-box", width: "100%", minWidth: 0, fontFamily: "var(--font-mono)" };
const lab: CSSProperties = { fontSize: 11, color: "var(--ink-muted)", fontWeight: 600 };

export function FunctionWizard({ onInsert }: { onInsert?: (dsl: string) => void }) {
  const [fn, setFn] = useState("IF");
  const [args, setArgs] = useState<Record<string, string>>({});
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const def = FUNCS.find((f) => f.fn === fn)!;
  const built = useMemo(() => buildCall(fn, args), [fn, args]);
  const dsl = built.ok ? asMacro(built.text) : "";

  useEffect(() => { setArgs(Object.fromEntries(def.args.map((a) => [a.key, a.ph]))); }, [fn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dsl) { setCheck(null); return; }
    const t = setTimeout(() => {
      fetch("/api/macros/describe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dsl }) })
        .then((r) => r.json()).then((j) => setCheck(j.ok ? { ok: true, text: j.text ?? "" } : { ok: false, text: j.error ?? "파싱 실패" }))
        .catch(() => setCheck(null));
    }, 250);
    return () => clearTimeout(t);
  }, [dsl]);

  const groups = [...new Set(FUNCS.map((f) => f.group))];
  return (
    <div data-testid="fn-wizard" data-fn={fn} data-valid={check?.ok ? "1" : check ? "0" : ""} style={{ display: "grid", gap: 8, border: "1px dashed var(--line)", borderRadius: 6, padding: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10 }}>
        <div>
          <div style={lab}>함수 선택 (v1 함수셋 {FUNCS.length}개)</div>
          <select data-testid="fn-pick" size={8} value={fn} onChange={(e) => setFn(e.target.value)} style={{ ...inp, height: 170 }}>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {FUNCS.filter((f) => f.group === g).map((f) => <option key={f.fn} value={f.fn}>{f.fn}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <div style={{ fontSize: "var(--fs-12)" }}><b style={{ fontFamily: "var(--font-mono)" }}>{def.fn}</b> — {def.desc}</div>
          {def.note && <div data-testid="fn-note" style={{ fontSize: 11, color: "var(--warn)" }}>{def.note}</div>}
          {def.args.map((a) => (
            <label key={a.key} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 6, alignItems: "center" }}>
              <span style={lab}>{a.label}</span>
              <input data-testid={`fn-arg-${a.key}`} value={args[a.key] ?? ""} placeholder={a.ph} onChange={(e) => setArgs({ ...args, [a.key]: e.target.value })} style={inp} />
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={lab}>만들어진 식</span>
        <code data-testid="fn-dsl" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-13)", color: built.ok ? "var(--accent)" : "var(--warn)" }}>{built.ok ? dsl : built.error}</code>
        {onInsert && <button type="button" data-testid="fn-insert" disabled={!built.ok || !check?.ok} onClick={() => onInsert(dsl)} style={{ marginLeft: "auto", fontSize: "var(--fs-12)", fontWeight: 600 }}>Macro 칸에 넣기</button>}
      </div>
      {check && <div data-testid="fn-check" data-ok={check.ok ? "1" : "0"} style={{ fontSize: 11, color: check.ok ? "var(--ink-muted)" : "var(--warn)" }}>{check.ok ? `파서 통과 · 역번역: ${check.text}` : `파서 거부: ${check.text}`}</div>}
    </div>
  );
}
