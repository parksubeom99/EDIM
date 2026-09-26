"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

/**
 * p32 Material code & General purchase items Registration.
 *   왼쪽  = 분류 트리(구매품 코드의 category 경로: General Purchase items / Filter …)
 *   가운데 = Registered Code Table — 그 코드의 buy 표(Supplier · V · Hz · IP · Insulation · Efficiency …). 속성 열·행 추가, 저장은
 *           기존 제품 코드 등록 API 한 곳(POST /api/setup/product-codes)으로 — 같은 코드를 고치는 두 번째 길을 만들지 않는다.
 *   아래  = G : Price — 단가 이력(p67). 행을 쌓기만 하고, 현재 단가 = 오늘까지 유효한 가장 최근 행.
 * 아직 없음: 코드별 Approval Status · DWG(3D/2D) 첨부 · 단가의 BOM 원가 자동 반영(지금 원가는 제품 표의 원가 열에서 온다).
 */
interface Col { key: string; name: string; label?: string }
interface Row { item: string; cells: Record<string, string | number> }
interface Table { no: number; by: string; default: string; role?: string; cols: Col[]; rows: Row[] }
interface Code { code: string; name: string; kind: string; category: string; unit: string; specTemplate: string; materialTemplate: string; tables: Record<string, Table>; sections?: unknown }
interface Price { id: string; item: string; price: number; currency: string; supplier: string; effectiveFrom: string; note: string | null; state: string }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 6px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "3px 6px 3px 0", borderBottom: "1px solid var(--line)" };
const btn = (primary = false, off = false): CSSProperties => ({
  fontSize: "var(--fs-12)", fontWeight: 600, padding: "4px 10px", borderRadius: 4, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1,
  border: primary ? "none" : "1px solid var(--line)", background: primary ? "var(--accent)" : "var(--surface-2)", color: primary ? "var(--accent-contrast)" : "var(--ink)",
});
const DEFAULT_BUY: Table = { no: 1, by: "F", default: "", role: "buy", rows: [{ item: "", cells: {} }],
  cols: [{ key: "A", name: "Supplier" }, { key: "B", name: "V" }, { key: "C", name: "Hz" }, { key: "D", name: "IP" }, { key: "E", name: "Insulation" }, { key: "F", name: "Efficiency" }] };
const nextKey = (cols: Col[]) => { for (let i = 0; i < 26; i++) { const k = String.fromCharCode(65 + i); if (!cols.some((c) => c.key === k)) return k; } return "Z"; };
const won = (n: number, c: string) => `${n.toLocaleString("ko-KR")} ${c}`;

export function MaterialRegistry({ canEdit }: { canEdit: boolean }) {
  const [codes, setCodes] = useState<Code[]>([]);
  const [selCode, setSelCode] = useState<string | null>(null);
  const [buyName, setBuyName] = useState("buy");
  const [draft, setDraft] = useState<Table | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [current, setCurrent] = useState<Record<string, Price>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [nw, setNw] = useState({ code: "", name: "", category: "General Purchase items/", unit: "ea" });
  const [pf, setPf] = useState({ item: "", price: "", currency: "KRW", supplier: "", effectiveFrom: new Date().toISOString().slice(0, 10), note: "" });

  const load = useCallback(async (keep?: string | null) => {
    const c = (await fetch("/api/setup/catalog").then((r) => r.json())) as { productCodes?: Code[] };
    const list = (c.productCodes ?? []).filter((p) => p.kind === "purchase").sort((a, b) => (a.category + a.code).localeCompare(b.category + b.code));
    setCodes(list);
    const pick = list.find((p) => p.code === (keep ?? null)) ?? null;
    if (pick) choose(pick);
    setReady(true);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(null); }, [load]);

  const loadPrices = useCallback(async (code: string) => {
    const j = (await fetch(`/api/setup/prices?code=${encodeURIComponent(code)}`).then((r) => r.json())) as { rows?: Price[]; current?: Record<string, Price> };
    setPrices(j.rows ?? []); setCurrent(j.current ?? {});
  }, []);

  function choose(p: Code) {
    const [name, t] = Object.entries(p.tables).find(([, x]) => x.role === "buy") ?? ["buy", null];
    setSelCode(p.code); setBuyName(name); setDraft(t ? JSON.parse(JSON.stringify(t)) : JSON.parse(JSON.stringify(DEFAULT_BUY))); setMsg(null);
    setPf((f) => ({ ...f, item: t?.rows[0]?.item ?? "", supplier: String(t?.rows[0]?.cells.A ?? "") }));
    void loadPrices(p.code);
  }
  const sel = codes.find((c) => c.code === selCode) ?? null;
  const saved = sel ? Object.values(sel.tables).find((x) => x.role === "buy") ?? null : null;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved ?? DEFAULT_BUY);

  // 분류 트리: category 경로를 한 단계씩
  const tree = useMemo(() => {
    const m = new Map<string, Code[]>();
    for (const c of codes) { const k = c.category || "(분류 없음)"; m.set(k, [...(m.get(k) ?? []), c]); }
    return [...m.entries()];
  }, [codes]);

  async function saveCode(body: Code, okText: string) {
    const r = await fetch("/api/setup/product-codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부: ${j.error ?? r.status}` });
    return r.ok;
  }
  async function saveTable() {
    if (!sel || !draft) return;
    if (await saveCode({ ...sel, tables: { ...sel.tables, [buyName]: draft } }, `${sel.code} 속성 표를 저장했습니다`)) await load(sel.code);
  }
  async function create() {
    const code = nw.code.trim(), name = nw.name.trim();
    if (!code || !name) return;
    if (codes.some((c) => c.code === code)) { setMsg({ ok: false, text: `이미 있는 코드: ${code}` }); return; }
    const body: Code = { code, name, kind: "purchase", category: nw.category.trim().replace(/\/+$/, ""), unit: nw.unit || "ea", specTemplate: "", materialTemplate: "", tables: { buy: DEFAULT_BUY } };
    if (await saveCode(body, `새 자재 코드 ${code} 를 등록했습니다`)) { setNw({ code: "", name: "", category: nw.category, unit: "ea" }); await load(code); }
  }
  async function addPrice() {
    if (!sel) return;
    const r = await fetch("/api/setup/prices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: sel.code, ...pf, price: Number(pf.price) }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: `단가를 쌓았습니다 — ${sel.code} ${won(Number(pf.price), pf.currency)} (${pf.effectiveFrom} 부터)` } : { ok: false, text: `거부: ${j.error ?? r.status}` });
    if (r.ok) { setPf((f) => ({ ...f, price: "", note: "" })); await loadPrices(sel.code); }
  }
  const setCell = (i: number, k: string, v: string) => setDraft((d) => d && { ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, cells: { ...r.cells, [k]: v } } : r)) });

  return (
    <section data-testid="material-reg" data-ready={ready ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 12, marginTop: 12, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={card}>
          <div style={{ ...lab, marginBottom: 6 }}>Code management · 구매품 {codes.length}종</div>
          {tree.map(([cat, list]) => (
            <div key={cat} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{cat.split("/").join(" › ")}</div>
              {list.map((c) => (
                <button key={c.code} type="button" data-testid={`mat-code-${c.code}`} data-selected={c.code === selCode ? "1" : undefined} onClick={() => choose(c)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "3px 6px", marginTop: 2, borderRadius: 4, cursor: "pointer", color: "var(--ink)",
                    border: `1px solid ${c.code === selCode ? "var(--accent)" : "transparent"}`, background: c.code === selCode ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", color: "var(--accent)" }}>{c.code}</span> <span style={{ fontSize: "var(--fs-12)" }}>{c.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        {canEdit && (
          <div style={{ ...card, display: "grid", gap: 6 }} data-testid="mat-new">
            <div style={lab}>New · 새 자재 코드</div>
            <input data-testid="mat-new-code" placeholder="Code (예: PMT 3)" value={nw.code} onChange={(e) => setNw({ ...nw, code: e.target.value })} style={inp} />
            <input data-testid="mat-new-name" placeholder="Description (예: Motor AC Φ3)" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} style={inp} />
            <input data-testid="mat-new-cat" placeholder="분류 경로 (a/b/c)" value={nw.category} onChange={(e) => setNw({ ...nw, category: e.target.value })} style={inp} />
            <button type="button" data-testid="mat-create" disabled={!nw.code.trim() || !nw.name.trim()} onClick={() => void create()} style={btn(true, !nw.code.trim() || !nw.name.trim())}>등록</button>
          </div>
        )}
      </div>

      {sel && draft ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={card} data-testid="mat-table" data-code={sel.code}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
              <span style={lab}>Registered Code Table</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{sel.code}</span><span>{sel.name}</span>
              <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{sel.category} · {sel.unit}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                <thead><tr>
                  <th style={th}>Item</th>
                  {draft.cols.map((c, ci) => (
                    <th key={c.key} style={th}>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{c.key}</span>{" "}
                      <input data-testid={`mat-col-${c.key}`} disabled={!canEdit} value={c.name} style={{ ...inp, width: 90, display: "inline-block" }}
                        onChange={(e) => setDraft((d) => d && { ...d, cols: d.cols.map((x, j) => (j === ci ? { ...x, name: e.target.value.replace(/\W/g, "") } : x)) })} />
                    </th>
                  ))}
                  <th style={th}>G : Price (현재)</th>
                </tr></thead>
                <tbody>
                  {draft.rows.map((r, i) => (
                    <tr key={i}>
                      <td style={td}><input data-testid={`mat-item-${i}`} disabled={!canEdit} value={r.item} placeholder="(기본)" style={{ ...inp, width: 70 }}
                        onChange={(e) => setDraft((d) => d && { ...d, rows: d.rows.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)) })} /></td>
                      {draft.cols.map((c) => (
                        <td key={c.key} style={td}><input data-testid={`mat-cell-${i}-${c.key}`} disabled={!canEdit} value={String(r.cells[c.key] ?? "")} style={inp} onChange={(e) => setCell(i, c.key, e.target.value)} /></td>
                      ))}
                      <td style={{ ...td, fontFamily: "var(--font-mono)" }} data-testid={`mat-price-${i}`}>{current[r.item] ? won(current[r.item]!.price, current[r.item]!.currency) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canEdit && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                <button type="button" data-testid="mat-add-col" disabled={draft.cols.length >= 12} onClick={() => setDraft((d) => d && { ...d, cols: [...d.cols, { key: nextKey(d.cols), name: `attr${d.cols.length + 1}` }] })} style={btn()}>+ 속성</button>
                <button type="button" data-testid="mat-add-row" onClick={() => setDraft((d) => d && { ...d, rows: [...d.rows, { item: `V${d.rows.length + 1}`, cells: {} }] })} style={btn()}>+ 행</button>
                <button type="button" data-testid="mat-save" disabled={!dirty} onClick={() => void saveTable()} style={btn(true, !dirty)}>저장</button>
                {dirty && <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>저장하지 않은 변경이 있습니다</span>}
              </div>
            )}
          </div>

          <div style={card} data-testid="mat-prices">
            <div style={{ ...lab, marginBottom: 6 }}>G : Price · 단가 이력 (p67) — 고치지 않고 쌓습니다. 현재 = 오늘까지 유효한 가장 최근 행</div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr><th style={th}>Item</th><th style={th}>단가</th><th style={th}>공급처</th><th style={th}>유효일</th><th style={th}>상태</th><th style={th}>메모</th></tr></thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id} data-testid="mat-price-row" data-state={p.state}>
                    <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{p.item || "(기본)"}</td><td style={{ ...td, fontFamily: "var(--font-mono)" }}>{won(p.price, p.currency)}</td>
                    <td style={td}>{p.supplier || "—"}</td><td style={td}>{p.effectiveFrom}</td>
                    <td style={{ ...td, color: p.state === "현재" ? "var(--accent)" : "var(--ink-muted)", fontWeight: p.state === "현재" ? 700 : 400 }}>{p.state}</td><td style={td}>{p.note ?? ""}</td>
                  </tr>
                ))}
                {prices.length === 0 && <tr><td colSpan={6} style={{ ...td, color: "var(--ink-muted)" }}>아직 단가가 없습니다</td></tr>}
              </tbody>
            </table>
            {canEdit && (
              <div style={{ display: "grid", gridTemplateColumns: "90px 110px 70px 1fr 120px 1fr auto", gap: 6, marginTop: 8 }}>
                <select data-testid="mat-p-item" value={pf.item} onChange={(e) => setPf({ ...pf, item: e.target.value })} style={inp}>
                  {draft.rows.map((r) => <option key={r.item} value={r.item}>{r.item || "(기본)"}</option>)}
                </select>
                <input data-testid="mat-p-price" type="number" min={0} placeholder="단가" value={pf.price} onChange={(e) => setPf({ ...pf, price: e.target.value })} style={inp} />
                <select data-testid="mat-p-cur" value={pf.currency} onChange={(e) => setPf({ ...pf, currency: e.target.value })} style={inp}>{["KRW", "USD", "EUR", "JPY", "CNY"].map((c) => <option key={c}>{c}</option>)}</select>
                <input data-testid="mat-p-supplier" placeholder="공급처" value={pf.supplier} onChange={(e) => setPf({ ...pf, supplier: e.target.value })} style={inp} />
                <input data-testid="mat-p-date" type="date" value={pf.effectiveFrom} onChange={(e) => setPf({ ...pf, effectiveFrom: e.target.value })} style={inp} />
                <input data-testid="mat-p-note" placeholder="메모" value={pf.note} onChange={(e) => setPf({ ...pf, note: e.target.value })} style={inp} />
                <button type="button" data-testid="mat-p-add" disabled={!(Number(pf.price) > 0)} onClick={() => void addPrice()} style={btn(true, !(Number(pf.price) > 0))}>쌓기</button>
              </div>
            )}
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>아직 없음: 코드별 Approval Status · DWG(3D/2D) 첨부 · 이 단가의 BOM 원가 자동 반영.</p>
          </div>
          {msg && <p data-testid="mat-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
        </div>
      ) : (
        <div style={{ ...card, color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>{ready ? "왼쪽에서 자재 코드를 고르십시오" : "불러오는 중…"}</div>
      )}
    </section>
  );
}
