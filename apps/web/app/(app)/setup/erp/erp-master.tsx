"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ERP_KINDS, ERP_DEF, type ErpKind, type ErpAttrs, type ErpField } from "@/app/lib/erp-master";

/**
 * H4 · p64 [ERP Set-up] 기준정보 6종 — 종류 탭 · 목록 · 등록 · 수정 · 사용 중지 · 삭제(가리키면 409).
 * Company DB(고객·공급처, /setup/company)와 같은 틀. 가리키는 칸(상위 부서 · 부서 · 창고 · 국가)은 사용 중인 목록에서 고른다.
 */
interface Row { id: string; kind: ErpKind; code: string; name: string; attrs: ErpAttrs; remarks: string; active: boolean }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const tab = (on: boolean): CSSProperties => ({ fontSize: "var(--fs-12)", fontWeight: 600, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--line)", cursor: "pointer", background: on ? "var(--accent)" : "var(--surface-1)", color: on ? "var(--accent-contrast, #fff)" : "var(--ink)" });
const blank = (k: ErpKind): Record<string, string> => Object.fromEntries([["code", ""], ["name", ""], ...ERP_DEF[k].fields.map((f) => [f.key, ""])]);

export function ErpMaster({ canEdit, initialKind }: { canEdit: boolean; initialKind: ErpKind }) {
  const [kind, setKind] = useState<ErpKind>(initialKind);
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nw, setNw] = useState<Record<string, string>>(blank(initialKind));
  const [edit, setEdit] = useState<{ id: string; name: string; attrs: Record<string, string> } | null>(null);

  const load = useCallback(async () => {
    const j = await fetch("/api/setup/erp-master").then((r) => r.json()).catch(() => ({}));
    setRows(j.rows ?? []); setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function call(url: string, method: string, body: unknown, okText: string): Promise<boolean> {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) { setEdit(null); await load(); }
    return r.ok;
  }

  const def = ERP_DEF[kind];
  const list = rows.filter((r) => r.kind === kind);
  const choices = (f: ErpField) => rows.filter((r) => r.kind === f.ref && r.active);
  const attrsOf = (src: Record<string, string>) => Object.fromEntries(def.fields.map((f) => [f.key, src[f.key] ?? ""]));
  const show = (v: string | number | undefined) => (v === undefined || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("ko-KR") : v);

  function field(f: ErpField, value: string, set: (v: string) => void, testid: string) {
    if (f.ref) return (
      <select data-testid={testid} value={value} onChange={(e) => set(e.target.value)} style={inp}>
        <option value="">{f.required ? `${f.label} 고르기` : "—"}</option>
        {choices(f).map((c) => <option key={c.id} value={c.code}>{c.code} · {c.name}</option>)}
      </select>
    );
    return <input data-testid={testid} placeholder={f.label} value={value} inputMode={f.type === "number" ? "decimal" : undefined} onChange={(e) => set(e.target.value)} style={inp} />;
  }

  return (
    <section data-testid="erp-master" data-ready={ready ? "1" : "0"} data-kind={kind} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ERP_KINDS.map((k) => (
          <button key={k} type="button" data-testid={`erp-tab-${k}`} onClick={() => { setKind(k); setNw(blank(k)); setEdit(null); setMsg(null); }} style={tab(k === kind)}>
            {ERP_DEF[k].label} · {rows.filter((r) => r.kind === k).length}
          </button>
        ))}
      </nav>
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th style={th}>Code</th><th style={th}>Name</th>{def.fields.map((f) => <th key={f.key} style={th}>{f.label}{f.required ? " *" : ""}</th>)}{canEdit && <th style={th}></th>}</tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} data-testid={`erp-row-${r.code}`} data-active={r.active ? "1" : "0"} style={{ opacity: r.active ? 1 : 0.55 }}>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--accent)", whiteSpace: "nowrap" }}>{r.code}{r.active ? "" : " · 사용 중지"}</td>
                  {edit?.id === r.id ? (
                    <>
                      <td style={td}><input data-testid="erp-e-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={inp} /></td>
                      {def.fields.map((f) => <td key={f.key} style={td}>{field(f, edit.attrs[f.key] ?? "", (v) => setEdit({ ...edit, attrs: { ...edit.attrs, [f.key]: v } }), `erp-e-${f.key}`)}</td>)}
                      <td style={td}><button type="button" data-testid="erp-save" disabled={busy} onClick={() => void call(`/api/setup/erp-master/${r.id}`, "PATCH", { name: edit.name, attrs: edit.attrs }, `${edit.name} 을(를) 고쳤습니다`)} style={{ fontSize: 11 }}>저장</button></td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                      {def.fields.map((f) => <td key={f.key} style={{ ...td, fontFamily: f.ref || f.type === "number" ? "var(--font-mono)" : undefined }}>{show(r.attrs[f.key])}</td>)}
                      {canEdit && (
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          <button type="button" data-testid={`erp-edit-${r.code}`} onClick={() => setEdit({ id: r.id, name: r.name, attrs: Object.fromEntries(def.fields.map((f) => [f.key, r.attrs[f.key] === undefined ? "" : String(r.attrs[f.key])])) })} style={{ fontSize: 11 }}>수정</button>{" "}
                          <button type="button" data-testid={`erp-toggle-${r.code}`} disabled={busy} onClick={() => void call(`/api/setup/erp-master/${r.id}`, "PATCH", { active: !r.active }, r.active ? `${r.name} 사용 중지 — 새로 고르는 목록에서 빠집니다` : `${r.name} 다시 사용`)} style={{ fontSize: 11 }}>{r.active ? "사용 중지" : "다시 사용"}</button>{" "}
                          <button type="button" data-testid={`erp-del-${r.code}`} disabled={busy} onClick={() => void call(`/api/setup/erp-master/${r.id}`, "DELETE", undefined, `${r.name} 을(를) 지웠습니다`)} style={{ fontSize: 11 }}>삭제</button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ready && list.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>아직 없습니다 — 회사가 채웁니다.</p>}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: `90px 1fr repeat(${def.fields.length}, minmax(90px, 1fr)) auto`, gap: 6, marginTop: 10 }}>
            <input data-testid="erp-new-code" placeholder={def.codePh} value={nw.code ?? ""} onChange={(e) => setNw({ ...nw, code: e.target.value })} style={inp} />
            <input data-testid="erp-new-name" placeholder="Name" value={nw.name ?? ""} onChange={(e) => setNw({ ...nw, name: e.target.value })} style={inp} />
            {def.fields.map((f) => <div key={f.key}>{field(f, nw[f.key] ?? "", (v) => setNw({ ...nw, [f.key]: v }), `erp-new-${f.key}`)}</div>)}
            <button type="button" data-testid="erp-add" disabled={busy || !(nw.code ?? "").trim() || !(nw.name ?? "").trim()}
              onClick={() => void call("/api/setup/erp-master", "POST", { kind, code: nw.code, name: nw.name, attrs: attrsOf(nw) }, `${nw.name} 을(를) ${def.label}에 등록했습니다`).then((ok) => ok && setNw(blank(kind)))}
              style={{ fontSize: "var(--fs-12)", fontWeight: 600, padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", background: "var(--accent)", color: "var(--accent-contrast, #fff)" }}>등록</button>
          </div>
        )}
      </div>
      {msg && <p data-testid="erp-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
      <p style={{ margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>
        가리키는 관계: 직원 → 부서 · 부서 → 상위 부서 · 재고 → 창고 · 은행 → 국가 · Company DB 고객·공급처의 Nation → 국가. 가리키는 곳이 있으면 삭제 대신 사용 중지. 코드는 바꾸지 않습니다.
        값은 회사가 채웁니다(예시 두 행만 들어 있음). 재고 수량의 입출고 흐름(Inventory Management)은 아직 없음 — 필요한 입력: 회사 재고 데이터.
      </p>
    </section>
  );
}
