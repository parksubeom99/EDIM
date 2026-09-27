"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { graphSvg, parsePoints, pointsFromText, type GraphSnap } from "@/app/lib/output-template";

/**
 * H6 · p16 · p47 Set-Up / CPQ / Document — Tech. Data & Document.
 *   Output Data 템플릿(출처: 승인 매크로 결과 · 스냅샷 값) · 그래프 전용 data + 그래프 · Table List(Department · Table Type · Description).
 * Tech Data 를 만들 때 Output 값과 그래프가 문서 body 에 박힌다. 새 계산식은 없다 — 밀도 같은 값은 승인 매크로가 낼 때만.
 */
interface OutRow { id: string; key: string; label: string; unit: string; source: string; ref: string | null }
interface GraphRow { id: string; name: string; chart: string; xLabel: string; yLabel: string; points: { x: string; y: number }[]; markerKey: string | null }
interface TableRow { name: string; no: number; role: string; rows: number; cols: number; meta: { tableType: string; department: string; description: string; variantOf: string | null } | null }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12, display: "grid", gap: 8 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", boxSizing: "border-box", minWidth: 0, width: "100%" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const h: CSSProperties = { fontSize: "var(--fs-13)", fontWeight: 600, margin: 0 };
const muted: CSSProperties = { fontSize: 11, color: "var(--ink-muted)", margin: 0 };
const TYPE_LABEL: Record<string, string> = { variant: "Variant", tech: "Tech", material: "Material" };

export function DocumentSetup({ canEdit }: { canEdit: boolean }) {
  const [outs, setOuts] = useState<OutRow[]>([]);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [graphs, setGraphs] = useState<GraphRow[]>([]);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [no, setNo] = useState({ key: "", label: "", unit: "", source: "macro", ref: "" });
  const [ng, setNg] = useState({ name: "", chart: "line", xLabel: "", yLabel: "", text: "", markerKey: "" });
  const [products, setProducts] = useState<{ code: string; name: string }[]>([]);
  const [product, setProduct] = useState("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tblReady, setTblReady] = useState(false);
  const [edits, setEdits] = useState<Record<string, { tableType: string; department: string; description: string; variantOf: string }>>({});

  const load = useCallback(async () => {
    const [o, g] = await Promise.all([fetch("/api/setup/output-items").then((r) => r.json()).catch(() => ({})), fetch("/api/setup/graphs").then((r) => r.json()).catch(() => ({}))]);
    setOuts(o.rows ?? []); setRefs(o.refs ?? {}); setGraphs(g.rows ?? []); setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    fetch("/api/setup/catalog").then((r) => r.json()).then((c) => {
      const ps = ((c.productCodes ?? []) as { code: string; name: string; kind: string }[]).filter((p) => p.kind === "product");
      setProducts(ps); setProduct((cur) => cur || (ps.find((p) => p.code === "EU")?.code ?? ps[0]?.code ?? ""));
    });
  }, []);
  const loadTables = useCallback(async (p: string) => {
    setTblReady(false);
    const j = await fetch(`/api/setup/table-meta?product=${encodeURIComponent(p)}`).then((r) => r.json()).catch(() => ({}));
    const ts = (j.tables ?? []) as TableRow[];
    setTables(ts);
    setEdits(Object.fromEntries(ts.map((t) => [t.name, { tableType: t.meta?.tableType ?? (t.role === "tech" ? "tech" : "tech"), department: t.meta?.department ?? "", description: t.meta?.description ?? "", variantOf: t.meta?.variantOf ?? "" }])));
    setTblReady(true);
  }, []);
  useEffect(() => { if (product) void loadTables(product); }, [product, loadTables]);

  async function call(url: string, method: string, body: unknown, okText: string, after?: () => Promise<void>): Promise<boolean> {
    setMsg(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) await (after ?? load)();
    return r.ok;
  }

  const draftPts = parsePoints(pointsFromText(ng.text));
  const preview: GraphSnap | null = draftPts.ok ? { name: ng.name || "미리보기", chart: ng.chart === "bar" ? "bar" : "line", xLabel: ng.xLabel, yLabel: ng.yLabel, points: draftPts.points, marker: null } : null;

  return (
    <section data-testid="doc-setup" data-ready={ready ? "1" : "0"} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <div style={card} data-testid="out-items">
        <p style={h}>Output Data 템플릿 — Tech Data 의 출력 항목</p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>key</th><th style={th}>이름</th><th style={th}>단위</th><th style={th}>출처</th>{canEdit && <th style={th}></th>}</tr></thead>
          <tbody>
            {outs.map((o) => (
              <tr key={o.id} data-testid={`out-row-${o.key}`}>
                <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{o.key}</td><td style={{ ...td, fontWeight: 600 }}>{o.label}</td><td style={td}>{o.unit || "—"}</td>
                <td style={td}>{o.source === "macro" ? "승인 매크로 결과" : `스냅샷 · ${refs[o.ref ?? ""] ?? o.ref}`}</td>
                {canEdit && <td style={td}><button type="button" data-testid={`out-del-${o.key}`} onClick={() => void call(`/api/setup/output-items/${o.id}`, "DELETE", undefined, `${o.label} 항목을 뺐습니다 — 이미 만든 문서는 그대로`)} style={{ fontSize: 11 }}>빼기</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {ready && outs.length === 0 && <p style={muted}>항목이 없습니다 — Tech Data 는 매크로 결과 한 값만 냅니다.</p>}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 80px 150px 1fr auto", gap: 6 }}>
            <input data-testid="out-new-key" placeholder="key (예: density)" value={no.key} onChange={(e) => setNo({ ...no, key: e.target.value })} style={inp} />
            <input data-testid="out-new-label" placeholder="이름 (예: Density)" value={no.label} onChange={(e) => setNo({ ...no, label: e.target.value })} style={inp} />
            <input data-testid="out-new-unit" placeholder="단위" value={no.unit} onChange={(e) => setNo({ ...no, unit: e.target.value })} style={inp} />
            <select data-testid="out-new-source" value={no.source} onChange={(e) => setNo({ ...no, source: e.target.value })} style={inp}>
              <option value="macro">승인 매크로 결과</option><option value="snapshot">스냅샷 값</option>
            </select>
            <select data-testid="out-new-ref" value={no.ref} disabled={no.source !== "snapshot"} onChange={(e) => setNo({ ...no, ref: e.target.value })} style={inp}>
              <option value="">{no.source === "snapshot" ? "값 고르기" : "—"}</option>
              {Object.entries(refs).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button type="button" data-testid="out-add" disabled={!no.key.trim() || !no.label.trim()} onClick={() => void call("/api/setup/output-items", "POST", { key: no.key, label: no.label, unit: no.unit, source: no.source, ref: no.ref || undefined }, `${no.label} 을(를) Output 항목으로 더했습니다 — 다음 Tech Data 부터`).then((ok) => ok && setNo({ key: "", label: "", unit: "", source: "macro", ref: "" }))} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>추가</button>
          </div>
        )}
        <p style={muted}>출처는 둘뿐: 그 BOM 을 낸 승인 매크로의 결과, 또는 스냅샷에 박힌 원가·치수·줄 수. 청사진의 Density(kg/m³)는 그 값을 내는 승인 매크로가 있을 때만 — 아직 없음: 밀도 매크로(필요한 입력: 회사 계산식).</p>
      </div>

      <div style={card} data-testid="graph-defs">
        <p style={h}>그래프 전용 data · 그래프</p>
        {graphs.map((g) => (
          <div key={g.id} data-testid={`graph-row-${g.name}`} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "var(--fs-12)" }}>
            <b>{g.name}</b><span>{g.chart === "bar" ? "막대" : "선"} · 점 {g.points.length}{g.markerKey ? ` · 표시선 ${g.markerKey}` : ""}</span>
            {canEdit && <button type="button" data-testid={`graph-del-${g.name}`} onClick={() => void call(`/api/setup/graphs/${g.id}`, "DELETE", undefined, `${g.name} 그래프를 뺐습니다 — 이미 만든 문서는 그대로`)} style={{ fontSize: 11 }}>빼기</button>}
          </div>
        ))}
        {ready && graphs.length === 0 && <p style={muted}>그래프가 없습니다.</p>}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 6 }}>
                <input data-testid="graph-new-name" placeholder="이름 (예: Fan curve)" value={ng.name} onChange={(e) => setNg({ ...ng, name: e.target.value })} style={inp} />
                <select data-testid="graph-new-chart" value={ng.chart} onChange={(e) => setNg({ ...ng, chart: e.target.value })} style={inp}><option value="line">선</option><option value="bar">막대</option></select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <input data-testid="graph-new-x" placeholder="x 축 이름" value={ng.xLabel} onChange={(e) => setNg({ ...ng, xLabel: e.target.value })} style={inp} />
                <input data-testid="graph-new-y" placeholder="y 축 이름" value={ng.yLabel} onChange={(e) => setNg({ ...ng, yLabel: e.target.value })} style={inp} />
              </div>
              <textarea data-testid="graph-new-points" placeholder={"그래프 전용 data — 한 줄에 x,y\n600,2900\n1200,2800"} value={ng.text} onChange={(e) => setNg({ ...ng, text: e.target.value })} rows={6} style={{ ...inp, fontFamily: "var(--font-mono)" }} />
              <select data-testid="graph-new-marker" value={ng.markerKey} onChange={(e) => setNg({ ...ng, markerKey: e.target.value })} style={inp}>
                <option value="">표시선 없음</option>
                {outs.map((o) => <option key={o.key} value={o.key}>표시선 = {o.label}</option>)}
              </select>
              <button type="button" data-testid="graph-add" disabled={!ng.name.trim() || !draftPts.ok} onClick={() => void call("/api/setup/graphs", "POST", { name: ng.name, chart: ng.chart, xLabel: ng.xLabel, yLabel: ng.yLabel, points: pointsFromText(ng.text), markerKey: ng.markerKey || undefined }, `${ng.name} 그래프를 더했습니다 — 다음 Tech Data 부터`).then((ok) => ok && setNg({ name: "", chart: "line", xLabel: "", yLabel: "", text: "", markerKey: "" }))} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>그래프 추가</button>
              {!draftPts.ok && ng.text.trim() && <p data-testid="graph-new-error" style={{ ...muted, color: "var(--warn)" }}>{draftPts.error}</p>}
            </div>
            <div data-testid="graph-preview" style={{ background: "#fff", borderRadius: 4, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: preview ? graphSvg(preview) : "" }} />
          </div>
        )}
      </div>

      <div style={card} data-testid="table-list" data-ready={tblReady ? "1" : "0"} data-product={product}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <p style={h}>Table List</p>
          <select data-testid="tl-product" value={product} onChange={(e) => setProduct(e.target.value)} style={{ ...inp, width: "auto" }}>
            {products.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>표</th><th style={th}>읽는 쪽</th><th style={th}>크기</th><th style={th}>Table Type</th><th style={th}>변형 원본</th><th style={th}>Department</th><th style={th}>Description</th>{canEdit && <th style={th}></th>}</tr></thead>
          <tbody>
            {tables.map((t) => {
              const e = edits[t.name] ?? { tableType: "tech", department: "", description: "", variantOf: "" };
              const set = (patch: Partial<typeof e>) => setEdits({ ...edits, [t.name]: { ...e, ...patch } });
              return (
                <tr key={t.name} data-testid={`tl-row-${t.name}`} data-type={t.meta?.tableType ?? ""}>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{t.name} <span style={{ color: "var(--ink-muted)" }}>Table{t.no}</span></td>
                  <td style={td}>{t.role}</td><td style={td}>{t.rows}행 × {t.cols}열</td>
                  <td style={td}><select data-testid={`tl-type-${t.name}`} value={e.tableType} disabled={!canEdit} onChange={(ev) => set({ tableType: ev.target.value, ...(ev.target.value !== "variant" ? { variantOf: "" } : {}) })} style={inp}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                  <td style={td}><select data-testid={`tl-variant-${t.name}`} value={e.variantOf} disabled={!canEdit || e.tableType !== "variant"} onChange={(ev) => set({ variantOf: ev.target.value })} style={inp}><option value="">—</option>{tables.filter((x) => x.name !== t.name).map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}</select></td>
                  <td style={td}><input data-testid={`tl-dept-${t.name}`} value={e.department} disabled={!canEdit} placeholder="Engineering" onChange={(ev) => set({ department: ev.target.value })} style={inp} /></td>
                  <td style={td}><input data-testid={`tl-desc-${t.name}`} value={e.description} disabled={!canEdit} onChange={(ev) => set({ description: ev.target.value })} style={inp} /></td>
                  {canEdit && <td style={td}><button type="button" data-testid={`tl-save-${t.name}`} onClick={() => void call("/api/setup/table-meta", "PUT", { productCode: product, tableName: t.name, ...e, variantOf: e.variantOf || undefined }, `${t.name} 표의 칸을 저장했습니다`, () => loadTables(product))} style={{ fontSize: 11 }}>저장</button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={muted}>표의 행·열은 Set-Up ▸ Product Code · Table 에서 고칩니다. 여기서는 목록 칸(부서 · 종류 · 설명 · 변형 원본)만 — 표를 읽는 쪽(tech · dim · buy · rule)은 그대로입니다.</p>
      </div>
      {msg && <p data-testid="doc-setup-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
    </section>
  );
}
