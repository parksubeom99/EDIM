"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { SlotValues } from "@/app/lib/rccs";

/**
 * ⑥ 사양 입력표 (청사진 p46 [Spec List in-put table] · "각각의 사양 입력").
 * 사양 값을 넣고 "코드 추천" → 등록된 Sub Code 값 중 사양을 만족하는 슬롯 값을 Code Builder 에 채운다.
 * 추천만 한다. 저장은 위 Code Builder 의 개정 저장(Rev) 한 곳.
 */
interface Item { key: string; label: string; unit: string; slot: string; source: { kind: string } }
interface Line { key: string; label: string; slot: string; input: string; picked: string | null; basis: string }

const inp: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: 120 };

export function SpecInput({ product, slots, onSlots, card, h, muted }: { product: string; slots: SlotValues; onSlots: (s: SlotValues) => void; card: CSSProperties; h: CSSProperties; muted: CSSProperties }) {
  const [items, setItems] = useState<Item[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    setReady(false);
    fetch("/api/setup/spec-items?product=" + encodeURIComponent(product))
      .then((r) => r.json())
      .then((j) => { if (live) { setItems(j.rows ?? []); setReady(true); } })
      .catch(() => { if (live) { setItems([]); setReady(true); } });
    return () => { live = false; };
  }, [product]);

  async function recommend() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/setup/spec-recommend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productCode: product, inputs: vals }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` }); return; }
    setLines(j.lines ?? []);
    const picked = (j.slots ?? {}) as SlotValues;
    const n = Object.keys(picked).length;
    if (n > 0) onSlots({ ...slots, ...picked });
    const unmet = (j.unmet ?? []) as string[];
    setMsg({ ok: unmet.length === 0 && n > 0, text: n === 0 && unmet.length === 0 ? "사양 값을 하나 이상 넣으십시오"
      : `${n}개 슬롯을 Code Builder 에 채웠습니다${unmet.length ? ` · 맞는 등록값 없음: ${unmet.join(", ")}` : ""} — 저장은 위 Rev 저장` });
  }

  return (
    <div data-testid="spec-panel" data-ready={ready ? "1" : "0"} style={{ ...card, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={h}>Spec List in-put table · 사양 입력 → 코드 추천</div>
        <span style={muted}>p46 · 제품 {product || "—"} · 항목 정의 = <a href="/setup/spec" style={{ color: "var(--accent)" }}>Set-Up ▸ 사양 항목</a></span>
      </div>
      {ready && items.length === 0 && <p style={{ ...muted, margin: 0 }}>이 제품에는 정의된 사양 항목이 없습니다.</p>}
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          {items.map((it) => (
            <label key={it.key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
              <span>{it.label}{it.unit ? ` (${it.unit})` : ""} <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>→ {it.slot}</span></span>
              <input data-testid={`spec-in-${it.key}`} value={vals[it.key] ?? ""} onChange={(e) => setVals({ ...vals, [it.key]: e.target.value })}
                placeholder={it.source.kind === "choice" ? "값 (예: SS)" : "수"} style={inp} />
            </label>
          ))}
          <button type="button" data-testid="spec-recommend" disabled={busy} onClick={() => void recommend()}
            style={{ fontSize: "var(--fs-12)", fontWeight: 600, color: "var(--accent-contrast)", background: "var(--accent)", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }}>
            코드 추천
          </button>
        </div>
      )}
      {lines.length > 0 && (
        <ul data-testid="spec-lines" style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "var(--fs-12)" }}>
          {lines.map((l) => <li key={l.key} data-testid={`spec-line-${l.key}`} data-picked={l.picked ?? ""} style={{ color: l.picked ? "var(--ink)" : "var(--warn)" }}>{l.label} {l.input} — {l.basis}</li>)}
        </ul>
      )}
      {msg && <p data-testid="spec-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: "6px 0 0", fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>아직 없음: Import(엑셀) · Option 정의(Item Image) · 사양 항목 수정·삭제.</p>
    </div>
  );
}
