"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * ⑨ Input Data 템플릿 (청사진 p16 [ERP / CPQ / Document Template] · p47).
 * 문서(지금은 Tech Data)의 입력 항목을 정의한다 — 이름 · 단위 · 기본값 · 범위.
 * 작업대 Document 탭에서 Tech Data 를 만들 때 이 항목 값을 받아 문서에 스냅샷으로 넣는다(발행 후 다시 계산하지 않는다).
 * 아직 없음: 수정·삭제 · Output Data 계산(밀도 등) · 그래프 · Coding List.
 */
interface Item { id: string; key: string; label: string; unit: string; defaultValue: number | null; minValue: number | null; maxValue: number | null }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const show = (n: number | null) => (n == null ? "—" : String(n));

export function InputItems({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nw, setNw] = useState({ key: "", label: "", unit: "", defaultValue: "", minValue: "", maxValue: "" });
  const load = useCallback(async () => {
    const j = await fetch("/api/setup/input-items").then((r) => r.json()).catch(() => ({}));
    setRows(j.rows ?? []); setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/setup/input-items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(nw) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` }); return; }
    setMsg({ ok: true, text: `${nw.label} 항목을 추가했습니다 — 다음 Tech Data 부터 입력받습니다` });
    setNw({ key: "", label: "", unit: "", defaultValue: "", minValue: "", maxValue: "" });
    await load();
  }

  return (
    <section data-testid="input-items" data-ready={ready ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, marginTop: 12, alignItems: "start" }}>
      <div style={card}>
        <div style={{ ...lab, marginBottom: 6 }}>Tech Data · Input Data 항목 {rows.length}개</div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>#</th><th style={th}>key</th><th style={th}>이름</th><th style={th}>단위</th><th style={th}>기본값</th><th style={th}>범위</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} data-testid={`input-row-${r.key}`}>
                <td style={td}>{i + 1}</td><td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.key}</td><td style={{ ...td, fontWeight: 600 }}>{r.label}</td>
                <td style={td}>{r.unit || "—"}</td><td style={{ ...td, fontFamily: "var(--font-mono)" }}>{show(r.defaultValue)}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{show(r.minValue)} ~ {show(r.maxValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ready && rows.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>항목이 없습니다 — Tech Data 는 코드 슬롯 값만 입력으로 남깁니다.</p>}
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>값은 문서를 만들 때 body 에 스냅샷으로 들어갑니다 — 여기서 기본값·범위를 바꿔도 이미 만든 문서의 숫자는 그대로입니다.</p>
      </div>
      {canEdit && (
        <div style={{ ...card, display: "grid", gap: 6 }} data-testid="input-new">
          <div style={lab}>항목 추가</div>
          <input data-testid="in-new-key" placeholder="key (예: density)" value={nw.key} onChange={(e) => setNw({ ...nw, key: e.target.value })} style={inp} />
          <input data-testid="in-new-label" placeholder="이름 (예: Air Density)" value={nw.label} onChange={(e) => setNw({ ...nw, label: e.target.value })} style={inp} />
          <input data-testid="in-new-unit" placeholder="단위 (예: kg/m³)" value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })} style={inp} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <input data-testid="in-new-default" placeholder="기본값" value={nw.defaultValue} onChange={(e) => setNw({ ...nw, defaultValue: e.target.value })} style={inp} />
            <input data-testid="in-new-min" placeholder="최소" value={nw.minValue} onChange={(e) => setNw({ ...nw, minValue: e.target.value })} style={inp} />
            <input data-testid="in-new-max" placeholder="최대" value={nw.maxValue} onChange={(e) => setNw({ ...nw, maxValue: e.target.value })} style={inp} />
          </div>
          <button type="button" data-testid="in-add" disabled={busy || !nw.key.trim() || !nw.label.trim()} onClick={() => void add()}
            style={{ fontSize: "var(--fs-12)", fontWeight: 600, padding: "5px 12px", borderRadius: 4, border: "none", cursor: "pointer", background: "var(--accent)", color: "var(--accent-contrast)" }}>추가</button>
          {msg && <p data-testid="input-items-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
        </div>
      )}
      <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>아직 없음: 항목 수정·삭제 · Output Data 계산(청사진의 밀도 등 — 매크로 연결 필요) · 그래프 · Coding List.</p>
    </section>
  );
}
