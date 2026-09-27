"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ProductCode, TechTable, BomCodeLine, SlotKey, Cell } from "@edim/bom-code";

type Tab = "sub" | "product" | "relationship";
interface SubRow { id: string; group: string; itemKey: SlotKey; itemName: string; seq: number; value: string; description: string }
interface RelRow { id: string; parent: string; child: string; seq: number; section: string; qty: Bind; unitCost: Bind & { scale?: string }; when: { slot?: string; eq?: string; macro?: boolean } | null; remarks: string | null }
type Bind = { lit?: number; ref?: string };
interface CatalogView { canEdit: boolean; fingerprint: string; rejected: string[]; subCodes: SubRow[]; productCodes: ProductCode[]; relationships: RelRow[] }

const KEYS: SlotKey[] = ["A", "B", "C", "D", "E", "F"];
const card: CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 14 };
const h: CSSProperties = { fontFamily: "var(--font-display)", fontSize: "var(--fs-14)", fontWeight: 600, margin: "0 0 8px" };
const muted: CSSProperties = { color: "var(--ink-muted)", fontSize: "var(--fs-12)" };
const th: CSSProperties = { padding: "6px", borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--ink-muted)", fontWeight: 600, fontSize: "var(--fs-12)", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "6px", borderBottom: "1px solid var(--line)", fontSize: "var(--fs-13)", verticalAlign: "top" };
const mono: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" };
const input: CSSProperties = { background: "var(--surface-1)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 7px", fontSize: "var(--fs-13)", minWidth: 0 };
const btn = (primary = false): CSSProperties => ({ background: primary ? "var(--accent)" : "var(--surface-1)", color: primary ? "var(--accent-ink, #04211c)" : "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 11px", fontSize: "var(--fs-13)", fontWeight: 600, cursor: "pointer" });
const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
const bindText = (b: Bind & { scale?: string }) => (b.ref ? b.ref : String(b.lit ?? "")) + (b.scale ? ` × ${b.scale}` : "");
const whenText = (w: RelRow["when"]) => (!w ? "항상" : w.macro ? "매크로 값 있을 때" : `${w.slot} = ${w.eq === "" ? "(없음)" : w.eq}`);

async function api(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export function SetupShell({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [cat, setCat] = useState<CatalogView | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(async () => {
    const r = await api("/api/setup/catalog", "GET");
    if (r.ok) setCat(r.data as unknown as CatalogView);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });
  const tabs: [Tab, string, string][] = [["sub", "S-1-1", "Sub Code"], ["product", "S-1-3", "Product Code · Table"], ["relationship", "S-1-4", "Code Relationship"]];

  return (
    <main data-testid="setup" style={{ padding: "14px 18px", display: "grid", gap: 12 }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <Link href="/workbench" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← MainForm</Link>
        <Link href="/setup/map" data-testid="setup-link-map" style={{ color: "var(--accent)", fontSize: "var(--fs-13)", fontWeight: 700 }}>Set-Up 지도 (p54) →</Link>
        <Link href="/setup/arrangement-code" data-testid="setup-link-arrangement-code" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>Arrangement Code (p35) →</Link>
        <Link href="/setup/toolbox" data-testid="setup-link-toolbox" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>Toolbox Macro · 마법사 (p57) →</Link>
        <Link href="/setup/coding-list" data-testid="setup-link-coding-list" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>Coding List (p47) →</Link>
        <Link href="/setup/document" data-testid="setup-link-document" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>Output · 그래프 · Table List (p47) →</Link>
        <Link href="/setup/input-data" data-testid="setup-link-input-data" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>Input Data (p16) →</Link>
        <Link href="/setup/erp" data-testid="setup-link-erp" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>ERP 기준정보 (p64) →</Link>
        <Link href="/setup/company" data-testid="setup-link-company" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>Company DB (p64) →</Link>
        <Link href="/setup/spec" data-testid="setup-link-spec" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>사양 항목 (p46) →</Link>
        <Link href="/setup/material" data-testid="setup-link-material" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>자재·구매품 등록 (p32) →</Link>
        <Link href="/setup/drawing-template" data-testid="setup-link-drawing-template" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>도면 템플릿 (p39) →</Link>
        <Link href="/setup/mfg" data-testid="setup-link-mfg" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>제조 정보 표 (p66) →</Link>
        <Link href="/setup/print" data-testid="setup-link-print" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>Print 설정 (p48) →</Link>
        <Link href="/setup/ui" data-testid="setup-link-ui" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>UI Design (p26) →</Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-18, 18px)", fontWeight: 600, margin: 0 }}>Set-up / PLM · BOM Code Set-Up</h1>
        <span style={muted}>Code › Product › Item › Hierarchy › Relationship</span>
        {cat && <span data-testid="catalog-fp" style={{ ...muted, ...mono, marginLeft: "auto" }}>catalog {cat.fingerprint} · {cat.subCodes.length} sub · {cat.productCodes.length} codes · {cat.relationships.length} rel</span>}
      </header>
      <nav style={{ display: "flex", gap: 6 }}>
        {tabs.map(([k, no, label]) => (
          <button key={k} type="button" data-tab={k} onClick={() => { setTab(k); setMsg(null); }} style={{ ...btn(tab === k), display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ ...mono, opacity: 0.75 }}>{no}</span>{label}
          </button>
        ))}
      </nav>
      {msg && <div data-testid="setup-msg" style={{ ...card, padding: "8px 12px", borderColor: msg.ok ? "var(--accent)" : "var(--danger, #e06a5b)", fontSize: "var(--fs-13)" }}>{msg.text}</div>}
      {cat && cat.rejected.length > 0 && <div style={{ ...card, borderColor: "var(--danger, #e06a5b)", fontSize: "var(--fs-13)" }}>형식 오류로 실행에서 제외된 행: {cat.rejected.join(", ")}</div>}
      {!cat ? <p style={muted}>불러오는 중…</p>
        : tab === "sub" ? <SubTab cat={cat} reload={reload} say={say} />
        : tab === "product" ? <ProductTab cat={cat} reload={reload} say={say} />
        : <RelationshipTab cat={cat} reload={reload} say={say} />}
    </main>
  );
}

interface TabProps { cat: CatalogView; reload: () => Promise<void>; say: (ok: boolean, text: string) => void }

/* ───────────────────────────── S-1-1 Sub Code (p31) ───────────────────────────── */
function SubTab({ cat, reload, say }: TabProps) {
  const groups = useMemo(() => [...new Set(cat.subCodes.map((s) => s.group))], [cat]);
  const [group, setGroup] = useState(groups[0] ?? "AHU Code");
  const [f, setF] = useState({ itemKey: "B" as SlotKey, itemName: "", value: "", description: "" });
  const inGroup = cat.subCodes.filter((s) => s.group === group);
  const nameOf = (k: SlotKey) => inGroup.find((s) => s.itemKey === k)?.itemName ?? "";

  async function add() {
    const r = await api("/api/setup/sub-codes", "POST", { group, itemKey: f.itemKey, itemName: f.itemName || nameOf(f.itemKey), value: f.value, description: f.description });
    say(r.ok, r.ok ? `Sub Code 등록: ${f.itemKey} · ${f.value}` : String(r.data.error ?? "실패"));
    if (r.ok) { setF({ ...f, value: "", description: "" }); await reload(); }
  }
  async function del(s: SubRow) {
    const r = await api(`/api/setup/sub-codes?id=${s.id}`, "DELETE");
    say(r.ok, r.ok ? `삭제: ${s.itemKey} · ${s.value}` : String(r.data.error ?? "실패"));
    if (r.ok) await reload();
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 8 }}>
          <div style={h}>Registered Code Table</div>
          <span style={muted}>Group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)} style={input}>{groups.map((g) => <option key={g}>{g}</option>)}</select>
          <span style={muted}>Item(A~F)마다 Sub Item을 순번으로 등록 — Code Builder의 선택지가 된다 (p31)</span>
        </div>
        <div data-testid="sub-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 10 }}>
          {KEYS.map((k) => (
            <div key={k} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 8 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--fs-13)", marginBottom: 6 }}><span style={{ ...mono, color: "var(--accent)" }}>{k}</span> : {nameOf(k) || "—"}</div>
              {inGroup.filter((s) => s.itemKey === k).map((s) => (
                <div key={s.id} data-sub={`${k}:${s.value}`} style={{ display: "flex", gap: 6, alignItems: "baseline", padding: "2px 0", fontSize: "var(--fs-13)" }}>
                  <span style={{ ...mono, color: "var(--ink-muted)" }}>{s.seq}.</span><span style={mono}>{s.value}</span>
                  <span style={{ ...muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</span>
                  {cat.canEdit && <button type="button" aria-label="delete" onClick={() => del(s)} style={{ marginLeft: "auto", background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer" }}>×</button>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {cat.canEdit && (
        <div style={card}>
          <div style={h}>Sub Code Registration · New</div>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 2fr auto", gap: 8, alignItems: "center" }}>
            <select data-testid="sub-item" value={f.itemKey} onChange={(e) => setF({ ...f, itemKey: e.target.value as SlotKey })} style={input}>{KEYS.map((k) => <option key={k}>{k}</option>)}</select>
            <input placeholder={nameOf(f.itemKey) || "Item 이름 (예: 용량)"} value={f.itemName} onChange={(e) => setF({ ...f, itemName: e.target.value })} style={input} />
            <input data-testid="sub-value" placeholder="값 (예: 80)" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} style={input} />
            <input data-testid="sub-desc" placeholder="Description (예: 80,000 CMH)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} style={input} />
            <button type="button" data-testid="sub-add" onClick={add} disabled={!f.value} style={btn(true)}>등록</button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ──────────────────────── S-1-3 Product Code + Table (p33) ─────────────────────── */
function ProductTab({ cat, reload, say }: TabProps) {
  const [sel, setSel] = useState((cat.productCodes.find((p) => p.kind === "product" && p.code === "EU") ?? cat.productCodes[0])?.code ?? "");
  const current = cat.productCodes.find((p) => p.code === sel) ?? null;
  const [draft, setDraft] = useState<ProductCode | null>(current);
  useEffect(() => { setDraft(current ? (JSON.parse(JSON.stringify(current)) as ProductCode) : null); }, [sel, cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const blank: ProductCode = { code: "", name: "", kind: "part", category: "", unit: "ea", specTemplate: "", materialTemplate: "", tables: {} };
  async function save() {
    if (!draft) return;
    const r = await api("/api/setup/product-codes", "POST", draft);
    say(r.ok, r.ok ? `Product Code 저장: ${draft.code}` : String(r.data.error ?? "실패"));
    if (r.ok) { await reload(); setSel(draft.code); }
  }
  function setCell(t: string, item: string, colKey: string, raw: string) {
    if (!draft) return;
    const d = JSON.parse(JSON.stringify(draft)) as ProductCode;
    const n = Number(raw);
    d.tables[t]!.rows.find((r) => r.item === item)!.cells[colKey] = raw.trim() !== "" && Number.isFinite(n) ? n : raw;
    setDraft(d);
  }
  function addTable() {
    if (!draft) return;
    const no = Math.max(0, ...Object.values(draft.tables).map((t) => t.no)) + 1;
    setDraft({ ...draft, tables: { ...draft.tables, [`t${no}`]: { no, by: "B", default: "", cols: [{ key: "A", name: "value" }], rows: [{ item: "", cells: { A: 0 } }] } } });
  }
  function addRow(t: string) {
    if (!draft) return;
    const d = JSON.parse(JSON.stringify(draft)) as ProductCode;
    const tbl = d.tables[t]!;
    const item = window.prompt(`새 행의 Item (${tbl.by} 슬롯 값)`) ?? "";
    if (tbl.rows.some((r) => r.item === item)) return;
    tbl.rows.push({ item, cells: Object.fromEntries(tbl.cols.map((c) => [c.key, 0])) });
    setDraft(d);
  }
  function addCol(t: string) {
    if (!draft) return;
    const name = (window.prompt("새 열 이름 (영문·숫자·_) — 열 글자는 자동으로 다음 글자") ?? "").trim();
    if (!/^\w+$/.test(name)) return;
    const d = JSON.parse(JSON.stringify(draft)) as ProductCode;
    const tbl = d.tables[t]!;
    if (tbl.cols.some((c) => c.name === name) || tbl.cols.length >= 26) return;
    const key = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[tbl.cols.length]!;
    tbl.cols.push({ key, name });
    for (const row of tbl.rows) row.cells[key] = 0;
    setDraft(d);
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: 12 }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline" }}><div style={h}>Registered Code</div>
          {cat.canEdit && <button type="button" data-testid="pc-new" onClick={() => { setSel(""); setDraft(blank); }} style={{ ...btn(), marginLeft: "auto" }}>New</button>}</div>
        {(["product", "part", "purchase"] as const).map((k) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".06em", margin: "6px 0 2px" }}>{k === "product" ? "Product Code" : k === "part" ? "Specification · Part" : "General Purchase items"}</div>
            {cat.productCodes.filter((p) => p.kind === k).map((p) => (
              <button key={p.code} type="button" data-pc={p.code} onClick={() => setSel(p.code)} style={{ display: "flex", gap: 8, width: "100%", textAlign: "left", background: sel === p.code ? "var(--surface-1)" : "none", border: 0, borderLeft: sel === p.code ? "2px solid var(--accent)" : "2px solid transparent", color: "var(--ink)", padding: "4px 6px", cursor: "pointer", fontSize: "var(--fs-13)" }}>
                <span style={{ ...mono, color: "var(--accent)", minWidth: 48 }}>{p.code}</span><span>{p.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {draft && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={card}>
            <div style={h}>Product Code Registration</div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 130px 90px", gap: 8 }}>
              <input data-testid="pc-code" placeholder="Code" value={draft.code} disabled={!!current} onChange={(e) => setDraft({ ...draft, code: e.target.value })} style={{ ...input, ...mono }} />
              <input data-testid="pc-name" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={input} />
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ProductCode["kind"] })} style={input}><option value="product">product</option><option value="part">part</option><option value="purchase">purchase</option></select>
              <input placeholder="Unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} style={input} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <input placeholder="Category (예: Specification/Fan)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={input} />
              <input placeholder="Material 템플릿 (예: {mat.label})" value={draft.materialTemplate} onChange={(e) => setDraft({ ...draft, materialTemplate: e.target.value })} style={{ ...input, ...mono }} />
            </div>
            <input data-testid="pc-spec" placeholder="Spec 템플릿 — {표.열}은 등록 표에서 조회 (예: {cap.fanKw}kW 380V)" value={draft.specTemplate} onChange={(e) => setDraft({ ...draft, specTemplate: e.target.value })} style={{ ...input, ...mono, width: "100%", marginTop: 8, boxSizing: "border-box" }} />
            {draft.sections && <p style={{ ...muted, margin: "8px 0 0" }}>Section 순서: {draft.sections.map((s) => s.name + (s.when && "slot" in s.when ? `(${s.when.slot}=${s.when.eq})` : "")).join(" → ")}</p>}
          </div>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={h}>Table 참조 · Edit Table</div>
              <span style={muted}>슬롯 값으로 행을 찾는다 — 수식이 아니라 회사가 등록하는 표 (p32·33)</span>
              {cat.canEdit && <button type="button" onClick={addTable} style={{ ...btn(), marginLeft: "auto" }}>Add Table</button>}
            </div>
            {Object.keys(draft.tables).length === 0 && <p style={{ ...muted, margin: 0 }}>이 코드에 등록된 표 없음 — 상위 Product Code의 표를 참조한다.</p>}
            {Object.entries(draft.tables).sort((a, b) => a[1].no - b[1].no).map(([tName, t]: [string, TechTable]) => (
              <div key={tName} data-table={tName} style={{ marginTop: 10, overflowX: "auto" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ ...mono, color: "var(--accent)" }}>Table{t.no}</span><span style={mono}>{tName}</span>
                  <span style={muted}>Item = 슬롯 {t.by} 값 · 빈 슬롯이면 “{t.default || "(없음)"}” 행 · Macro에서는 <span style={mono}>Table{t.no}(열글자, 행번호:행번호)</span></span>
                  <select data-testid={`tbl-role-${tName}`} value={t.role ?? "tech"} disabled={!cat.canEdit}
                    onChange={(e) => setDraft({ ...draft, tables: { ...draft.tables, [tName]: { ...t, role: e.target.value as TechTable["role"] } } })}
                    style={{ ...input, ...mono, padding: "1px 4px", width: 148 }} title="표의 쓰임 — dim 은 도면 치수(p38) · buy 는 구매 속성(p32)">
                    <option value="tech">tech · 기술/원가</option>
                    <option value="dim">dim · 도면 치수</option>
                    <option value="buy">buy · 구매 속성</option>
                    <option value="rule">rule · 설계 검증</option>
                  </select>
                  {cat.canEdit && <><button type="button" onClick={() => addRow(tName)} style={{ ...btn(), padding: "2px 8px", marginLeft: "auto" }}>+ 행</button><button type="button" onClick={() => addCol(tName)} style={{ ...btn(), padding: "2px 8px" }}>+ 열</button></>}
                </div>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr><th style={th}>#</th><th style={th}>Item</th>{t.cols.map((c) => <th key={c.key} style={{ ...th, ...mono, color: "var(--accent)" }}>{c.key}</th>)}</tr>
                    <tr><th style={th} /><th style={th} />{t.cols.map((c) => <th key={c.key} title={c.label ?? ""} style={{ ...th, ...mono, fontWeight: 400 }}>{c.name}{c.label ? <div style={{ fontFamily: "var(--font-body)", fontSize: 11 }}>{c.label}</div> : null}</th>)}</tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, ri) => (
                      <tr key={row.item}><td style={{ ...td, ...mono, color: "var(--ink-muted)" }}>{ri + 1}</td><td style={{ ...td, ...mono, color: "var(--accent)" }}>{row.item || "(없음)"}</td>
                        {t.cols.map((c) => (
                          <td key={c.key} style={{ ...td, padding: 2 }}>
                            <input data-cell={`${tName}:${row.item}:${c.name}`} value={String((row.cells[c.key] as Cell | undefined) ?? "")} disabled={!cat.canEdit} onChange={(e) => setCell(tName, row.item, c.key, e.target.value)} style={{ ...input, ...mono, width: "100%", minWidth: 64, boxSizing: "border-box", border: "1px solid transparent", background: "transparent" }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {cat.canEdit && <div><button type="button" data-testid="pc-save" onClick={save} disabled={!draft.code || !draft.name} style={btn(true)}>저장</button></div>}
        </div>
      )}
    </section>
  );
}

/* ─────────────── S-1-4 Product Code Relationship + Running Test (p34) ───────────── */
function RelationshipTab({ cat, reload, say }: TabProps) {
  const products = cat.productCodes.filter((p) => p.kind === "product");
  const [parent, setParent] = useState((products.find((p) => p.code === "EU") ?? products[0])?.code ?? "");
  const rels = cat.relationships.filter((r) => r.parent === parent).sort((a, b) => a.seq - b.seq);
  const nameOf = (c: string) => cat.productCodes.find((p) => p.code === c)?.name ?? "?";
  const children = cat.productCodes.filter((p) => p.kind !== "product");
  const [f, setF] = useState({ child: "", section: "Fan", qty: "1", cost: "0", scale: "", whenSlot: "", whenEq: "", remarks: "" });
  const bind = (s: string): Bind => (/^\w+\.\w+$/.test(s.trim()) ? { ref: s.trim() } : { lit: Number(s) });

  async function addChild() {
    const when = f.whenSlot === "macro" ? { macro: true } : f.whenSlot ? { slot: f.whenSlot, eq: f.whenEq } : null;
    const r = await api("/api/setup/relationships", "POST", { parent, child: f.child, section: f.section, qty: bind(f.qty), unitCost: { ...bind(f.cost), ...(f.scale ? { scale: f.scale } : {}) }, when, remarks: f.remarks });
    say(r.ok, r.ok ? `Add Child: ${parent} → ${f.child}` : String(r.data.error ?? "실패"));
    if (r.ok) await reload();
  }
  async function del(rel: RelRow) {
    const r = await api(`/api/setup/relationships?id=${rel.id}`, "DELETE");
    say(r.ok, r.ok ? `관계 삭제: ${rel.parent} → ${rel.child}` : String(r.data.error ?? "실패"));
    if (r.ok) await reload();
  }

  const optionsOf = (k: SlotKey) => cat.subCodes.filter((s) => s.itemKey === k).sort((a, b) => a.seq - b.seq);
  const [slots, setSlots] = useState<Partial<Record<SlotKey, string>>>({ B: "55", C: "2123", D: "630", E: "SS" });
  const [macro, setMacro] = useState("");
  const [run, setRun] = useState<{ lines: BomCodeLine[]; sections: string[]; mainCode: string } | null>(null);
  async function runTest() {
    const r = await api("/api/setup/part-list-run", "POST", { slots: { ...slots, A: parent }, macroValue: macro.trim() === "" ? null : Number(macro) });
    if (r.ok) { setRun({ lines: r.data.lines as BomCodeLine[], sections: r.data.sections as string[], mainCode: String(r.data.mainCode ?? "") }); say(true, `Part List Run: ${(r.data.lines as unknown[]).length}행`); }
    else { setRun(null); const e = r.data.error as { code?: string; message?: string } | undefined; say(false, `${e?.code ?? "오류"}: ${e?.message ?? ""}`); }
  }
  const total = run ? run.lines.reduce((a, l) => a + l.qty * l.unitCost, 0) : 0;

  return (
    <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 12 }}>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <div style={card}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6 }}>
            <div style={h}>Child Group</div>
            <select data-testid="rel-parent" value={parent} onChange={(e) => { setParent(e.target.value); setRun(null); }} style={{ ...input, ...mono }}>{products.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}</select>
            <span style={{ ...muted, marginLeft: "auto" }}>{rels.length} children</span>
          </div>
          <table data-testid="rel-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Seq</th><th style={th}>Child</th><th style={th}>Description</th><th style={th}>Section</th><th style={th}>Q’ty</th><th style={th}>Unit ₩</th><th style={th}>조건</th><th style={th} /></tr></thead>
            <tbody>
              {rels.map((r) => (
                <tr key={r.id} data-rel={r.child}>
                  <td style={{ ...td, ...mono, color: "var(--ink-muted)" }}>{r.seq}</td><td style={{ ...td, ...mono, color: "var(--accent)", whiteSpace: "nowrap" }}>{r.child}</td>
                  <td style={td}>{nameOf(r.child)}{r.remarks ? <span style={muted}> · {r.remarks}</span> : null}</td><td style={td}>{r.section}</td>
                  <td style={{ ...td, ...mono }}>{bindText(r.qty)}</td><td style={{ ...td, ...mono }}>{bindText(r.unitCost)}</td><td style={{ ...td, fontSize: "var(--fs-12)" }}>{whenText(r.when)}</td>
                  <td style={td}>{cat.canEdit && <button type="button" aria-label="delete" onClick={() => del(r)} style={{ background: "none", border: 0, color: "var(--ink-muted)", cursor: "pointer" }}>×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cat.canEdit && (
          <div style={card}>
            <div style={h}>Add Child</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr .8fr 1fr 1fr", gap: 8 }}>
              <select data-testid="rel-child" value={f.child} onChange={(e) => setF({ ...f, child: e.target.value })} style={input}><option value="">Product / Sub Code…</option>{children.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}</select>
              <input data-testid="rel-section" placeholder="Section" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} style={input} />
              <input data-testid="rel-qty" placeholder="Q’ty (수 또는 표.열)" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} style={{ ...input, ...mono }} />
              <input data-testid="rel-cost" placeholder="단가 (수 또는 표.열)" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} style={{ ...input, ...mono }} />
              <input placeholder="배율 (예: mat.mf)" value={f.scale} onChange={(e) => setF({ ...f, scale: e.target.value })} style={{ ...input, ...mono }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 8, marginTop: 8 }}>
              <select value={f.whenSlot} onChange={(e) => setF({ ...f, whenSlot: e.target.value })} style={input}><option value="">조건 없음(항상)</option>{KEYS.map((k) => <option key={k} value={k}>슬롯 {k} =</option>)}<option value="macro">매크로 값 있을 때</option></select>
              <input placeholder="조건 값 (예: 630)" value={f.whenEq} disabled={!f.whenSlot || f.whenSlot === "macro"} onChange={(e) => setF({ ...f, whenEq: e.target.value })} style={{ ...input, ...mono }} />
              <input data-testid="rel-remarks" placeholder="Remarks" value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} style={input} />
              <button type="button" data-testid="rel-add" onClick={addChild} disabled={!f.child} style={btn(true)}>Add</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ ...card, alignSelf: "start" }}>
        <div style={h}>Part List Running Test</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr)) auto", gap: 6, alignItems: "end" }}>
          {(["B", "C", "D", "E"] as SlotKey[]).map((k) => (
            <label key={k} style={{ display: "grid", gap: 2, ...muted }}>{k} · {optionsOf(k)[0]?.itemName ?? ""}
              <select data-slot={k} value={slots[k] ?? ""} onChange={(e) => setSlots({ ...slots, [k]: e.target.value })} style={{ ...input, ...mono }}><option value="">—</option>{optionsOf(k).map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}</select>
            </label>
          ))}
          <label style={{ display: "grid", gap: 2, ...muted }}>매크로 값<input value={macro} onChange={(e) => setMacro(e.target.value)} placeholder="(없음)" style={{ ...input, ...mono }} /></label>
          <button type="button" data-testid="plr-run" onClick={runTest} style={btn(true)}>Run</button>
        </div>
        {run && (
          <>
            <p style={{ ...muted, margin: "10px 0 4px" }}>Main <span data-testid="plr-main" style={{ ...mono, color: "var(--accent)" }}>{run.mainCode}</span> <span style={mono}>({[parent, slots.B, slots.C, `${slots.D ?? ""}${slots.E ?? ""}`].filter(Boolean).join("-")})</span> · Section {run.sections.join(" → ")}</p>
            <table data-testid="plr-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>No.</th><th style={th}>Code</th><th style={th}>Name · Spec</th><th style={{ ...th, textAlign: "right" }}>Q’ty</th><th style={{ ...th, textAlign: "right" }}>Amount</th></tr></thead>
              <tbody>
                {run.lines.map((l) => (
                  <tr key={l.no} data-plr-row={l.childCode}><td style={{ ...td, ...mono, color: "var(--ink-muted)" }}>{l.no}</td><td data-plr-code={l.childCode} style={{ ...td, ...mono, color: "var(--accent)", whiteSpace: "nowrap" }}>{l.resolvedCode}</td>
                    <td style={td}>{l.part}<div style={{ ...mono, color: "var(--ink-muted)" }}>{l.spec}</div></td>
                    <td style={{ ...td, ...mono, textAlign: "right", whiteSpace: "nowrap" }}>{l.qty} {l.unit}</td><td style={{ ...td, ...mono, textAlign: "right" }}>{won(l.qty * l.unitCost)}</td></tr>
                ))}
                <tr><td colSpan={4} style={{ ...td, textAlign: "right", fontWeight: 600 }}>재료비 합계</td><td data-testid="plr-total" style={{ ...td, ...mono, textAlign: "right", fontWeight: 600 }}>{won(total)}</td></tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
