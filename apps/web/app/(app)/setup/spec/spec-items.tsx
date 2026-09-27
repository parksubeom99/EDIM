"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * ⑥ Set-up / 사양 항목 (청사진 p46 [Spec List in-put table]).
 * 제품 코드마다 사양 항목을 정의한다: 이름 · 단위 · 정하는 슬롯 · 값을 읽는 곳(슬롯 값 × 배율 / 제품 표의 열 / 값 그대로 고르기).
 * 작업대 Code 탭의 "사양 입력 → 코드 추천"이 이 정의를 쓴다.
 * 수정(이름·단위)·삭제 · CSV Import(미리보기 → 확정) — F3. 아직 없음: xlsx · Option 정의(Item Image).
 */
interface Col { key: string; name: string; label?: string }
interface Table { no: number; by: string; role?: string; cols: Col[] }
interface Product { code: string; name: string; kind: string; tables: Record<string, Table> }
interface Row { id: string; key: string; label: string; unit: string; slot: string; source: { kind: string; op?: string; scale?: number; table?: string; col?: string } }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const OP: Record<string, string> = { ge: "이상 중 최소", le: "이하 중 최대", eq: "같음" };
const SLOTS = ["A", "B", "C", "D", "E", "F"];

function describe(s: Row["source"], unit: string): string {
  if (s.kind === "choice") return "등록값 그대로 고르기";
  if (s.kind === "item") return `슬롯 값 × ${s.scale ?? 1}${unit ? ` ${unit}` : ""} · ${OP[s.op ?? ""] ?? s.op}`;
  return `표 ${s.table}.${s.col} · ${OP[s.op ?? ""] ?? s.op}`;
}

export function SpecItems({ canEdit }: { canEdit: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nw, setNw] = useState({ key: "", label: "", unit: "", slot: "B", kind: "table", op: "ge", scale: "1", table: "", col: "" });

  const [edit, setEdit] = useState<Row | null>(null);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<{ line: number; key: string; label: string; slot: string; kind: string; ok: boolean; error: string | null }[] | null>(null);
  async function call(url: string, method: string, body: unknown, okText: string): Promise<Record<string, unknown> | null> {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: `거부 (${r.status}): ${String(j.error ?? "")}` }); return null; }
    if (okText) setMsg({ ok: true, text: okText });
    return j;
  }
  const load = useCallback(async (p: string) => {
    const r = await fetch("/api/setup/spec-items?product=" + encodeURIComponent(p)).then((x) => x.json());
    setRows(r.rows ?? []);
    setReady(true);
  }, []);
  useEffect(() => {
    fetch("/api/setup/catalog").then((r) => r.json()).then((c) => {
      const ps = ((c.productCodes ?? []) as Product[]).filter((p) => p.kind === "product");
      setProducts(ps);
      const first = ps[0]?.code ?? "";
      setProduct((cur) => cur || first);
    });
  }, []);
  useEffect(() => { if (product) void load(product); }, [product, load]);

  const prod = products.find((p) => p.code === product);
  const tables = Object.entries(prod?.tables ?? {}).filter(([, t]) => t.by === nw.slot && (t.role ?? "tech") === "tech");
  const table = tables.find(([k]) => k === nw.table)?.[1];

  async function add() {
    setBusy(true); setMsg(null);
    const source = nw.kind === "choice" ? { kind: "choice" }
      : nw.kind === "item" ? { kind: "item", op: nw.op, scale: Number(nw.scale) }
      : { kind: "table", table: nw.table, col: nw.col, op: nw.op };
    const r = await fetch("/api/setup/spec-items", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ productCode: product, key: nw.key.trim(), label: nw.label.trim(), unit: nw.unit.trim(), slot: nw.slot, source }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` }); return; }
    setMsg({ ok: true, text: `${nw.label} 사양 항목을 ${product} 에 추가했습니다 — 작업대 Code 탭의 사양 입력표에 나타납니다` });
    setNw({ ...nw, key: "", label: "", unit: "" });
    await load(product);
  }

  return (
    <section data-testid="spec-items" data-ready={ready ? "1" : "0"} data-product={product} style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12, marginTop: 12, alignItems: "start" }}>
      <div style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <span style={lab}>제품 코드</span>
          <select data-testid="spec-product" value={product} onChange={(e) => { setProduct(e.target.value); setReady(false); }} style={inp}>
            {products.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
          <span style={{ ...lab, marginLeft: "auto" }}>사양 항목 {rows.length}개</span>
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>#</th><th style={th}>key</th><th style={th}>사양</th><th style={th}>단위</th><th style={th}>슬롯</th><th style={th}>값을 읽는 곳</th>{canEdit && <th style={th}></th>}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} data-testid={`spec-row-${r.key}`}>
                <td style={td}>{i + 1}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.key}</td>
                <td style={{ ...td, fontWeight: 600 }}>{edit?.id === r.id ? <input data-testid="se-label" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} style={inp} /> : r.label}</td>
                <td style={td}>{edit?.id === r.id ? <input data-testid="se-unit" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} style={{ ...inp, width: 70 }} /> : r.unit || "—"}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{r.slot}</td>
                <td style={td}>{describe(r.source, r.unit)}</td>
                {canEdit && (
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {edit?.id === r.id
                      ? <button type="button" data-testid="se-save" disabled={busy} onClick={() => void call(`/api/setup/spec-items/${r.id}`, "PATCH", { label: edit.label, unit: edit.unit }, `${edit.label} 을 고쳤습니다`).then((j) => { if (j) { setEdit(null); void load(product); } })} style={{ fontSize: 11 }}>저장</button>
                      : <button type="button" data-testid={`se-edit-${r.key}`} onClick={() => setEdit(r)} style={{ fontSize: 11 }}>수정</button>}{" "}
                    <button type="button" data-testid={`se-del-${r.key}`} disabled={busy} onClick={() => void call(`/api/setup/spec-items/${r.id}`, "DELETE", undefined, `${r.label} 항목을 지웠습니다`).then((j) => j && load(product))} style={{ fontSize: 11 }}>삭제</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {ready && rows.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>이 제품에는 사양 항목이 없습니다.</p>}
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>같은 슬롯을 여러 사양이 가리키면 모두 만족하는 등록값 중에서 고릅니다. 추천은 새 값을 만들지 않습니다.</p>
      </div>
      {canEdit && (
        <div style={{ ...card, display: "grid", gap: 6 }} data-testid="spec-new">
          <div style={lab}>사양 항목 추가</div>
          <input data-testid="spec-new-key" placeholder="key (영문 소문자, 예: fan_kw)" value={nw.key} onChange={(e) => setNw({ ...nw, key: e.target.value })} style={inp} />
          <input data-testid="spec-new-label" placeholder="사양 이름 (예: 팬 동력)" value={nw.label} onChange={(e) => setNw({ ...nw, label: e.target.value })} style={inp} />
          <input data-testid="spec-new-unit" placeholder="단위 (예: kW)" value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })} style={inp} />
          <label style={lab}>정하는 슬롯
            <select data-testid="spec-new-slot" value={nw.slot} onChange={(e) => setNw({ ...nw, slot: e.target.value, table: "", col: "" })} style={{ ...inp, marginLeft: 6 }}>
              {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={lab}>값을 읽는 곳
            <select data-testid="spec-new-kind" value={nw.kind} onChange={(e) => setNw({ ...nw, kind: e.target.value })} style={{ ...inp, marginLeft: 6 }}>
              <option value="table">제품 표의 열</option>
              <option value="item">슬롯 값 × 배율</option>
              <option value="choice">등록값 그대로</option>
            </select>
          </label>
          {nw.kind === "table" && (
            <div style={{ display: "flex", gap: 6 }}>
              <select data-testid="spec-new-table" value={nw.table} onChange={(e) => setNw({ ...nw, table: e.target.value, col: "" })} style={{ ...inp, flex: 1 }}>
                <option value="">표 (행 = 슬롯 {nw.slot})</option>
                {tables.map(([k, t]) => <option key={k} value={k}>{k} · Table {t.no}</option>)}
              </select>
              <select data-testid="spec-new-col" value={nw.col} onChange={(e) => setNw({ ...nw, col: e.target.value })} style={{ ...inp, flex: 1 }}>
                <option value="">열</option>
                {(table?.cols ?? []).map((c) => <option key={c.key} value={c.key}>{c.key} · {c.label ?? c.name}</option>)}
              </select>
            </div>
          )}
          {nw.kind === "item" && <input data-testid="spec-new-scale" placeholder="배율 (예: 1000)" value={nw.scale} onChange={(e) => setNw({ ...nw, scale: e.target.value })} style={inp} />}
          {nw.kind !== "choice" && (
            <select data-testid="spec-new-op" value={nw.op} onChange={(e) => setNw({ ...nw, op: e.target.value })} style={inp}>
              <option value="ge">입력 이상 중 가장 작은 값</option>
              <option value="le">입력 이하 중 가장 큰 값</option>
              <option value="eq">입력과 같은 값</option>
            </select>
          )}
          <button type="button" data-testid="spec-add" disabled={busy || !nw.key.trim() || !nw.label.trim() || !product} onClick={() => void add()}
            style={{ fontSize: "var(--fs-12)", fontWeight: 600, padding: "5px 12px", borderRadius: 4, border: "none", cursor: "pointer", background: "var(--accent)", color: "var(--accent-contrast)" }}>추가</button>
          {msg && <p data-testid="spec-items-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
        </div>
      )}
      {canEdit && (
        <div style={{ ...card, gridColumn: "1 / -1", display: "grid", gap: 6 }} data-testid="spec-import">
          <div style={lab}>Import · CSV (미리보기 → 확정) — 머리글: key,label,unit,slot,kind,op,scale,table,col</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input data-testid="spec-import-file" type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then((t) => { setCsv(t); setPreview(null); }); }} style={{ fontSize: 12 }} />
            <button type="button" data-testid="spec-import-preview" disabled={busy || !csv.trim()} onClick={() => void call("/api/setup/spec-items/import", "POST", { productCode: product, csv, confirm: false }, "").then((j) => { if (j) { setPreview(j.preview as never); setMsg({ ok: j.bad === 0, text: `미리보기 — 맞음 ${String(j.ok)} · 틀림 ${String(j.bad)}` }); } })} style={{ fontSize: 12 }}>미리보기</button>
            <button type="button" data-testid="spec-import-confirm" disabled={busy || !preview || preview.some((x) => !x.ok) || preview.length === 0}
              onClick={() => void call("/api/setup/spec-items/import", "POST", { productCode: product, csv, confirm: true }, "").then((j) => { if (j) { setMsg({ ok: true, text: `${String(j.imported)}개 항목을 들였습니다` }); setPreview(null); setCsv(""); void load(product); } })}
              style={{ fontSize: 12, fontWeight: 600 }}>확정</button>
          </div>
          <textarea data-testid="spec-import-text" rows={3} value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null); }} placeholder="또는 CSV 를 붙여 넣기" style={{ ...inp, fontFamily: "var(--font-mono)" }} />
          {preview && (
            <table data-testid="spec-import-preview-table" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr><th style={th}>줄</th><th style={th}>key</th><th style={th}>사양</th><th style={th}>슬롯</th><th style={th}>판정</th></tr></thead>
              <tbody>{preview.map((x) => (
                <tr key={x.line} data-testid={`spec-import-line-${x.line}`} data-ok={x.ok ? "1" : "0"}>
                  <td style={td}>{x.line}</td><td style={{ ...td, fontFamily: "var(--font-mono)" }}>{x.key}</td><td style={td}>{x.label}</td><td style={td}>{x.slot}</td>
                  <td style={{ ...td, color: x.ok ? "var(--accent)" : "var(--warn)" }}>{x.ok ? "✓" : `✗ ${x.error}`}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      )}
      <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>key 는 바꾸지 않습니다(사양 입력표가 key 로 값을 보냄). 아직 없음: xlsx 파일(엑셀에서 "CSV UTF-8" 로 저장해 올리면 됩니다) · Option 정의(Item Image — 필요한 입력: 회사 선택 항목 이미지).</p>
    </section>
  );
}
