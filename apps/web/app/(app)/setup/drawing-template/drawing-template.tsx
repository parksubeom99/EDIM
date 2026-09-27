"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * H5 · p39 도면 Templet 호출 설정 · p40 Call Sub Drawing · Detail Design 주의사항.
 * 제품 코드마다: 부를 하부 도면(코드 관계의 하위 코드 · 설계 우선순위) · 도면에 붙는 주의사항.
 * 도면을 뜨는 순간 그 BOM 에 있는 하위 코드만 골라 도면에 박힌다(DWG 는 자재 화면에서 코드에 첨부한 것 — F4).
 */
interface Sub { id: string; childCode: string; priority: number }
interface Note { id: string; text: string; priority: number }
interface Child { code: string; name: string; section: string }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", boxSizing: "border-box", minWidth: 0 };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const h: CSSProperties = { fontSize: "var(--fs-13)", fontWeight: 600, margin: "0 0 6px" };

export function DrawingTemplate({ canEdit }: { canEdit: boolean }) {
  const [products, setProducts] = useState<{ code: string; name: string }[]>([]);
  const [product, setProduct] = useState("");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [ready, setReady] = useState(false);
  const [ns, setNs] = useState({ child: "", priority: "" });
  const [nn, setNn] = useState({ text: "", priority: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/setup/catalog").then((r) => r.json()).then((c) => {
      const ps = ((c.productCodes ?? []) as { code: string; name: string; kind: string }[]).filter((p) => p.kind === "product");
      setProducts(ps); setProduct((cur) => cur || (ps.find((p) => p.code === "EU")?.code ?? ps[0]?.code ?? ""));
    });
  }, []);
  const load = useCallback(async (p: string) => {
    setReady(false);
    const j = await fetch(`/api/setup/drawing-template?product=${encodeURIComponent(p)}`).then((r) => r.json()).catch(() => ({}));
    setSubs(j.subs ?? []); setNotes(j.notes ?? []); setChildren(j.children ?? []); setReady(true);
  }, []);
  useEffect(() => { if (product) void load(product); }, [product, load]);

  async function call(url: string, method: string, body: unknown, okText: string): Promise<boolean> {
    setMsg(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) await load(product);
    return r.ok;
  }
  const nameOf = (code: string) => children.find((c) => c.code === code);
  const free = children.filter((c) => !subs.some((s) => s.childCode === c.code));

  return (
    <section data-testid="dt" data-ready={ready ? "1" : "0"} data-product={product} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 }}>제품 코드</span>
        <select data-testid="dt-product" value={product} onChange={(e) => setProduct(e.target.value)} style={inp}>
          {products.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
        </select>
      </div>
      <div style={card}>
        <p style={h}>Call Sub Drawing · 하부 도면 호출 (설계 우선순위 — 작을수록 먼저, 같으면 코드 순)</p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>우선순위</th><th style={th}>하위 코드</th><th style={th}>이름</th><th style={th}>구획</th>{canEdit && <th style={th}></th>}</tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} data-testid={`dt-sub-row-${s.childCode}`}>
                <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{s.priority}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{s.childCode}</td>
                <td style={td}>{nameOf(s.childCode)?.name || "—"}</td><td style={td}>{nameOf(s.childCode)?.section || "—"}</td>
                {canEdit && <td style={td}><button type="button" data-testid={`dt-sub-del-${s.childCode}`} onClick={() => void call(`/api/setup/drawing-template/${s.id}`, "DELETE", undefined, `${s.childCode} 호출을 뺐습니다 — 이미 뜬 도면은 그대로`)} style={{ fontSize: 11 }}>빼기</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {ready && subs.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", margin: "6px 0 0" }}>부르는 하부 도면이 없습니다.</p>}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 6, marginTop: 8 }}>
            <select data-testid="dt-sub-child" value={ns.child} onChange={(e) => setNs({ ...ns, child: e.target.value })} style={inp}>
              <option value="">하위 코드 고르기 (코드 관계에서)</option>
              {free.map((c) => <option key={c.code} value={c.code}>{c.code}{c.name ? ` · ${c.name}` : ""} · {c.section}</option>)}
            </select>
            <input data-testid="dt-sub-priority" placeholder="우선순위" inputMode="numeric" value={ns.priority} onChange={(e) => setNs({ ...ns, priority: e.target.value })} style={inp} />
            <button type="button" data-testid="dt-sub-add" disabled={!ns.child} onClick={() => void call("/api/setup/drawing-template", "POST", { productCode: product, kind: "sub", childCode: ns.child, priority: Number(ns.priority) }, `${ns.child} 하부 도면을 부릅니다 — 다음에 뜨는 도면부터`).then((ok) => ok && setNs({ child: "", priority: "" }))} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>추가</button>
          </div>
        )}
      </div>
      <div style={card}>
        <p style={h}>Detail Design · 주의사항 (도면 시트에 붙는다)</p>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: "var(--fs-12)" }}>
          {notes.map((n, i) => (
            <li key={n.id} data-testid="dt-note-row" data-i={i} style={{ padding: "2px 0" }}>
              <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>[{n.priority}]</span> {n.text}{" "}
              {canEdit && <button type="button" data-testid={`dt-note-del-${i}`} onClick={() => void call(`/api/setup/drawing-template/${n.id}`, "DELETE", undefined, "주의사항 하나를 뺐습니다 — 이미 뜬 도면은 그대로")} style={{ fontSize: 11 }}>빼기</button>}
            </li>
          ))}
        </ol>
        {ready && notes.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", margin: 0 }}>주의사항이 없습니다.</p>}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 6, marginTop: 8 }}>
            <input data-testid="dt-note-text" placeholder="예: 베어링 하우징 조립 전 축 정렬 확인" value={nn.text} onChange={(e) => setNn({ ...nn, text: e.target.value })} style={inp} />
            <input data-testid="dt-note-priority" placeholder="순서" inputMode="numeric" value={nn.priority} onChange={(e) => setNn({ ...nn, priority: e.target.value })} style={inp} />
            <button type="button" data-testid="dt-note-add" disabled={!nn.text.trim()} onClick={() => void call("/api/setup/drawing-template", "POST", { productCode: product, kind: "note", text: nn.text, priority: Number(nn.priority) }, "주의사항을 더했습니다 — 다음에 뜨는 도면부터").then((ok) => ok && setNn({ text: "", priority: "" }))} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>추가</button>
          </div>
        )}
      </div>
      {msg && <p data-testid="dt-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
      <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>
        하부 도면 DWG 는 Set-Up ▸ 자재·구매품에서 그 코드에 첨부한 것(F4)을 가리킵니다. 도면 계산은 새로 하지 않습니다 — 스냅샷 줄과 등록된 첨부만 읽습니다.
        아직 없음: 하부 도면을 조립도 안에 배치(Detail Dimension · mm 좌표) — 필요한 입력: 회사 CAD 규칙.
      </p>
    </section>
  );
}
