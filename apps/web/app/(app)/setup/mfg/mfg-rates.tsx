"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * F10 · p66 [Work Process management] Manufacturing Cost Table · p67 제조 정보(시간 · 임율 · 장비).
 * 제품 코드마다 공정별 시간 × 임율. 등록되면 다음 BOM Run 부터 인건비 = Σ 시간×임율(없으면 재료비 × 18%).
 * 아직 없음: 장비(설비) 사용료 · 재고 단가 Table — 필요한 입력: 회사 설비·재고 데이터.
 */
interface Row { id: string; process: string; equipment: string | null; hours: number; rate: number; amount: number }
const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

export function MfgRates({ canEdit }: { canEdit: boolean }) {
  const [products, setProducts] = useState<{ code: string; name: string }[]>([]);
  const [product, setProduct] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [nw, setNw] = useState({ process: "", equipment: "", hours: "", rate: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    fetch("/api/setup/catalog").then((r) => r.json()).then((c) => {
      const ps = ((c.productCodes ?? []) as { code: string; name: string; kind: string }[]).filter((p) => p.kind === "product");
      setProducts(ps); setProduct((cur) => cur || (ps.find((p) => p.code === "EU")?.code ?? ps[0]?.code ?? ""));
    });
  }, []);
  const load = useCallback(async (p: string) => {
    setReady(false);
    const j = await fetch(`/api/setup/mfg-rates?product=${encodeURIComponent(p)}`).then((r) => r.json()).catch(() => ({}));
    setRows(j.rows ?? []); setReady(true);
  }, []);
  useEffect(() => { if (product) void load(product); }, [product, load]);
  async function call(url: string, method: string, body: unknown, okText: string) {
    setMsg(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) await load(product);
    return r.ok;
  }
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return (
    <section data-testid="mfg-rates" data-ready={ready ? "1" : "0"} data-product={product} style={{ ...card, marginTop: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 }}>제품 코드</span>
        <select data-testid="mfg-product" value={product} onChange={(e) => setProduct(e.target.value)} style={inp}>
          {products.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: "var(--fs-12)" }}>인건비 = Σ 시간 × 임율 = <b data-testid="mfg-total">{won(total)}</b>{rows.length === 0 ? " (표가 비면 재료비 × 18%)" : ""}</span>
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th style={th}>공정</th><th style={th}>장비</th><th style={{ ...th, textAlign: "right" }}>시간 (h)</th><th style={{ ...th, textAlign: "right" }}>임율 (원/h)</th><th style={{ ...th, textAlign: "right" }}>금액</th>{canEdit && <th style={th}></th>}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid={`mfg-row-${r.process}`}>
              <td style={{ ...td, fontWeight: 600 }}>{r.process}</td><td style={td}>{r.equipment ?? "—"}</td><td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.hours}</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.rate.toLocaleString("ko-KR")}</td><td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.amount.toLocaleString("ko-KR")}</td>
              {canEdit && <td style={td}><button type="button" data-testid={`mfg-del-${r.process}`} onClick={() => void call(`/api/setup/mfg-rates/${r.id}`, "DELETE", undefined, `${r.process} 공정을 지웠습니다 — 뜬 스냅샷은 그대로`)} style={{ fontSize: 11 }}>삭제</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 140px auto", gap: 6 }}>
          <input data-testid="mfg-process" placeholder="공정 (예: 조립)" value={nw.process} onChange={(e) => setNw({ ...nw, process: e.target.value })} style={inp} />
          <input data-testid="mfg-equipment" placeholder="장비 (선택)" value={nw.equipment} onChange={(e) => setNw({ ...nw, equipment: e.target.value })} style={inp} />
          <input data-testid="mfg-hours" placeholder="시간 h" value={nw.hours} onChange={(e) => setNw({ ...nw, hours: e.target.value })} style={inp} />
          <input data-testid="mfg-rate" placeholder="임율 원/h" value={nw.rate} onChange={(e) => setNw({ ...nw, rate: e.target.value })} style={inp} />
          <button type="button" data-testid="mfg-add" disabled={!nw.process.trim()} onClick={() => void call("/api/setup/mfg-rates", "POST", { productCode: product, process: nw.process, equipment: nw.equipment, hours: Number(nw.hours), rate: Number(nw.rate) }, `${nw.process} 공정 추가 — 다음 BOM Run 부터 인건비에 들어갑니다`).then((ok) => ok && setNw({ process: "", equipment: "", hours: "", rate: "" }))} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>추가</button>
        </div>
      )}
      {msg && <p data-testid="mfg-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
      <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>경비는 그대로 (재료비 + 인건비) × 12%. 어느 쪽으로 셌는지는 BOM 스냅샷에 박혀 견적서 "인건비 기준" 줄에 나온다 — 표를 고쳐도 뜬 스냅샷·견적은 그대로. 아직 없음: 장비(설비) 사용료 · 재고 단가 Table — 필요한 입력: 회사 설비·재고 데이터.</p>
    </section>
  );
}
