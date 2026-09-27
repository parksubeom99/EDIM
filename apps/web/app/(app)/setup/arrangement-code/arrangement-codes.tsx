"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AttachmentPanel } from "../../attachment-panel";

/**
 * p35 Arrangement Code Registration.
 *   New      = 제품 코드를 골라 그 제품의 지금 배치(구획 순서·길이·방향·부품 위치)를 이름 붙여 등록 → Approval Status: Pending
 *   Approve  = owner 가 승인/반려(한 번뿐) → Approved / Rejected
 *   적용     = Approved 만. 기존 Arrangement 저장 규칙(구획 중복·BOM 관계 잠금·부품=그 구획의 자식)을 그대로 탄다.
 * Arrangement Drawing Control(p35 · p30) = 승인된 코드에 DWG 첨부(0025 공용 첨부 — F5).
 * 아직 없음: 코드 Group 체계(FDV 같은 분류 코드 규칙) — 필요한 입력: 회사 분류 규칙.
 */
interface Comp { code: string; at: string; level: string }
interface Sec { name: string; len?: number; dir?: string; when?: unknown; components?: Comp[] }
interface Row { id: string; code: string; productCode: string; description: string; sections: Sec[]; status: string; createdAt: string; decidedAt: string | null; decisionNote: string | null }
interface Product { code: string; name: string; kind: string; sections?: Sec[] }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 8px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 8px 4px 0", borderBottom: "1px solid var(--line)" };
const btn = (primary = false, off = false): CSSProperties => ({
  fontSize: "var(--fs-12)", fontWeight: 600, padding: "5px 12px", borderRadius: 4, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1,
  border: primary ? "none" : "1px solid var(--line)", background: primary ? "var(--accent)" : "var(--surface-2)", color: primary ? "var(--accent-contrast)" : "var(--ink)",
});
const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending · 승인 대기", color: "var(--warn)" }, approved: { label: "Approved", color: "var(--accent)" }, rejected: { label: "Rejected · 반려", color: "var(--ink-muted)" },
};

export function ArrangementCodes({ canEdit, isOwner }: { canEdit: boolean; isOwner: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [nw, setNw] = useState({ code: "", productCode: "", description: "" });
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (keep?: string | null) => {
    const [a, c] = await Promise.all([fetch("/api/setup/arrangement-codes").then((r) => r.json()), fetch("/api/setup/catalog").then((r) => r.json())]);
    const list = (a.rows ?? []) as Row[];
    const prods = ((c.productCodes ?? []) as Product[]).filter((p) => p.kind === "product" && (p.sections?.length ?? 0) > 0);
    setRows(list); setProducts(prods);
    setNw((n) => (n.productCode ? n : { ...n, productCode: prods[0]?.code ?? "" }));
    if (keep !== undefined) setSelId(keep);
    setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function call(url: string, body: unknown, okText: (j: Record<string, unknown>) => string, keep?: string | null) {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: okText(j) } : { ok: false, text: `거부 (${r.status}): ${String(j.error ?? "")}` });
    if (r.ok) await load(keep === undefined ? (typeof j.id === "string" ? j.id : selId) : keep);
    return r.ok;
  }
  const sel = rows.find((r) => r.id === selId) ?? null;
  const total = (s: Sec[]) => s.reduce((a, x) => a + (x.len ?? 0), 0);

  return (
    <section data-testid="arr-codes" data-ready={ready ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 12, marginTop: 12, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={card}>
          <div style={{ ...lab, marginBottom: 6 }}>Arrangement Code management · {rows.length}건</div>
          {rows.map((r) => (
            <button key={r.id} type="button" data-testid={`ac-row-${r.code}`} data-status={r.status} data-selected={r.id === selId ? "1" : undefined}
              onClick={() => { setSelId(r.id); setMsg(null); setNote(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", marginBottom: 4, borderRadius: 4, cursor: "pointer", color: "var(--ink)",
                border: `1px solid ${r.id === selId ? "var(--accent)" : "var(--line)"}`, background: r.id === selId ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--fs-12)" }}>{r.code}</span>
              <span style={{ fontSize: 11, color: "var(--ink-muted)" }}> · {r.productCode} · 구획 {r.sections.length}</span>
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: STATUS[r.status]?.color }}>{STATUS[r.status]?.label ?? r.status}</span>
            </button>
          ))}
          {rows.length === 0 && <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>아직 등록된 코드가 없습니다</span>}
        </div>
        {canEdit && (
          <div style={{ ...card, display: "grid", gap: 6 }} data-testid="ac-new">
            <div style={lab}>New · Arrangement registration</div>
            <input data-testid="ac-new-code" placeholder="Code (예: FDV-EU-01)" value={nw.code} onChange={(e) => setNw({ ...nw, code: e.target.value })} style={inp} />
            <select data-testid="ac-new-product" value={nw.productCode} onChange={(e) => setNw({ ...nw, productCode: e.target.value })} style={inp}>
              {products.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name} (구획 {p.sections?.length ?? 0})</option>)}
            </select>
            <input data-testid="ac-new-desc" placeholder="Description (예: Fan Centrifugal · Double)" value={nw.description} onChange={(e) => setNw({ ...nw, description: e.target.value })} style={inp} />
            <button type="button" data-testid="ac-register" disabled={busy || !nw.code.trim() || !nw.productCode}
              onClick={() => void call("/api/setup/arrangement-codes", nw, () => `${nw.code} 을 등록했습니다 — 승인 대기(Pending)`).then((ok) => ok && setNw({ ...nw, code: "", description: "" }))}
              style={btn(true, busy || !nw.code.trim())}>등록 (지금 배치를 스냅샷)</button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {sel ? (
          <div style={card} data-testid="ac-detail" data-code={sel.code} data-status={sel.status}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={lab}>Arrangement Code Registration</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--fs-15, 15px)" }}>{sel.code}</span>
              <span style={{ fontSize: "var(--fs-12)" }}>{sel.description}</span>
              <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: "var(--fs-12)", color: STATUS[sel.status]?.color }}>Approval Status: {STATUS[sel.status]?.label}</span>
            </div>
            {/* 배치 한 줄 그림 — 길이 비례(길이 없는 구획은 평균 폭) */}
            <svg data-testid="ac-strip" viewBox="0 0 1000 70" style={{ width: "100%", height: 70, marginBottom: 8 }}>
              {(() => {
                const s = sel.sections; const known = s.filter((x) => x.len).map((x) => x.len!); const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
                const w = s.map((x) => x.len ?? avg); const sum = w.reduce((a, b) => a + b, 0) || 1; let x0 = 0;
                return s.map((x, i) => { const ww = (w[i]! / sum) * 996; const g = (
                  <g key={x.name}><rect x={x0 + 2} y={8} width={Math.max(ww - 4, 2)} height={46} rx={3} fill="color-mix(in srgb, var(--accent) 12%, transparent)" stroke="var(--accent)" />
                    <text x={x0 + ww / 2} y={36} textAnchor="middle" fontSize={13} fill="var(--ink)">{x.name}</text></g>); x0 += ww; return g; });
              })()}
            </svg>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr><th style={th}>순서</th><th style={th}>구획</th><th style={th}>길이(mm)</th><th style={th}>방향</th><th style={th}>부품 배치</th><th style={th}>조건</th></tr></thead>
              <tbody>
                {sel.sections.map((s, i) => (
                  <tr key={s.name} data-testid="ac-sec-row">
                    <td style={td}>{i + 1}</td><td style={{ ...td, fontWeight: 600 }}>{s.name}</td><td style={td}>{s.len ?? "L(균등)"}</td><td style={td}>{s.dir ?? "—"}</td>
                    <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{(s.components ?? []).map((c) => `${c.code} ${c.at}·${c.level}`).join(" / ") || "—"}</td>
                    <td style={td}>{s.when ? "조건부" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>제품 {sel.productCode} · 구획 {sel.sections.length} · 길이 합 {total(sel.sections) || "—"} mm · 등록 {sel.createdAt.slice(0, 10)}{sel.decidedAt ? ` · 결정 ${sel.decidedAt.slice(0, 10)}` : ""}{sel.decisionNote ? ` · "${sel.decisionNote}"` : ""}</p>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              {sel.status === "pending" && isOwner && (
                <>
                  <input data-testid="ac-note" placeholder="결정 메모" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inp, width: 220 }} />
                  <button type="button" data-testid="ac-approve" disabled={busy} onClick={() => void call(`/api/setup/arrangement-codes/${sel.id}/decide`, { decision: "approve", note }, () => `${sel.code} 승인 — 이제 제품에 적용할 수 있습니다`, sel.id)} style={btn(true, busy)}>승인</button>
                  <button type="button" data-testid="ac-reject" disabled={busy} onClick={() => void call(`/api/setup/arrangement-codes/${sel.id}/decide`, { decision: "reject", note }, () => `${sel.code} 반려`, sel.id)} style={btn(false, busy)}>반려</button>
                </>
              )}
              {sel.status === "pending" && !isOwner && <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>승인·반려는 owner 가 합니다</span>}
              {canEdit && (
                <button type="button" data-testid="ac-apply" disabled={busy || sel.status !== "approved"}
                  title={sel.status === "approved" ? `${sel.productCode} 의 배치를 이 코드로 바꿉니다` : "승인된 코드만 적용할 수 있습니다"}
                  onClick={() => void call(`/api/setup/arrangement-codes/${sel.id}/apply`, {}, () => `${sel.code} 를 ${sel.productCode} 에 적용했습니다 — 다음 BOM Run 부터 반영`, sel.id)}
                  style={btn(sel.status === "approved", busy || sel.status !== "approved")}>{sel.productCode} 에 적용</button>
              )}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
              <AttachmentPanel ownerKind="arrangement_code" ownerKey={sel.id} kinds={["dwg2d", "dwg3d"]} canEdit={canEdit}
                title="Arrangement Drawing Control · DWG (p35)" testid="ac-dwg"
                disabledReason={sel.status === "approved" ? null : "승인된 Arrangement Code 에만 도면을 붙입니다"} />
            </div>
          </div>
        ) : (
          <div style={{ ...card, color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>{ready ? "왼쪽에서 코드를 고르거나 새로 등록하십시오" : "불러오는 중…"}</div>
        )}
        {msg && <p data-testid="ac-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
        <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>아직 없음: 코드 Group 체계(FDV 같은 분류 규칙) — 필요한 입력: 회사 분류 규칙.</p>
      </div>
    </section>
  );
}
