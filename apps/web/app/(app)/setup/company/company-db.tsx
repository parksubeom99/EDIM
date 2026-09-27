"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * ⑧ Company DB (청사진 p64 [ERP Set-up]) — 고객 · 공급처 두 목록.
 * 프로젝트 관리의 Client 와 자재 단가 이력의 공급처가 이 목록에서 고른다(글자 열도 함께 채워 옛 데이터를 보존).
 * 수정 · 사용 중지 · 삭제(0024 — 프로젝트·단가 이력·구매 요청이 가리키면 삭제 409, 대신 사용 중지).
 * 아직 없음: Warehouse · Inventory · Bank · Employee · Nation 표.
 */
interface Partner { id: string; kind: string; code: string; name: string; contact: string; nation: string; remarks: string; active: boolean }
const KINDS = [{ kind: "customer", label: "고객 · Customer", ph: "C-001" }, { kind: "supplier", label: "공급처 · Supplier", ph: "S-001" }] as const;

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)" };

export function CompanyDb({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Partner[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nw, setNw] = useState<Record<string, { code: string; name: string; contact: string; nation: string }>>({
    customer: { code: "", name: "", contact: "", nation: "" }, supplier: { code: "", name: "", contact: "", nation: "" },
  });
  const [edit, setEdit] = useState<Partner | null>(null);
  async function call(url: string, method: string, body: unknown, okText: string) {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) { setEdit(null); await load(); }
  }
  const load = useCallback(async () => {
    const j = await fetch("/api/setup/partners").then((r) => r.json()).catch(() => ({}));
    setRows(j.rows ?? []); setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add(kind: string) {
    const f = nw[kind]!;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/setup/partners", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, ...f }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` }); return; }
    setMsg({ ok: true, text: `${f.name} 을 ${kind === "customer" ? "고객" : "공급처"}로 등록했습니다` });
    setNw({ ...nw, [kind]: { code: "", name: "", contact: "", nation: "" } });
    await load();
  }

  return (
    <section data-testid="company-db" data-ready={ready ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, alignItems: "start" }}>
      {KINDS.map(({ kind, label, ph }) => {
        const list = rows.filter((r) => r.kind === kind);
        const f = nw[kind]!;
        return (
          <div key={kind} style={card} data-testid={`partner-${kind}`}>
            <div style={{ ...lab, marginBottom: 6 }}>{label} · {list.length}곳</div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr><th style={th}>Code</th><th style={th}>Name</th><th style={th}>담당 · 연락</th><th style={th}>Nation</th>{canEdit && <th style={th}></th>}</tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} data-testid={`partner-row-${r.code}`} data-active={r.active ? "1" : "0"} style={{ opacity: r.active ? 1 : 0.55 }}>
                    <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{r.code}{r.active ? "" : " · 사용 중지"}</td>
                    {edit?.id === r.id ? (
                      <>
                        <td style={td}><input data-testid="pe-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={inp} /></td>
                        <td style={td}><input data-testid="pe-contact" value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} style={inp} /></td>
                        <td style={td}><input data-testid="pe-nation" value={edit.nation} onChange={(e) => setEdit({ ...edit, nation: e.target.value })} style={inp} /></td>
                        <td style={td}><button type="button" data-testid="pe-save" disabled={busy} onClick={() => void call(`/api/setup/partners/${r.id}`, "PATCH", { name: edit.name, contact: edit.contact, nation: edit.nation }, `${edit.name} 을 고쳤습니다`)} style={{ fontSize: 11 }}>저장</button></td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...td, fontWeight: 600 }}>{r.name}</td><td style={td}>{r.contact || "—"}</td><td style={td}>{r.nation || "—"}</td>
                        {canEdit && (
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            <button type="button" data-testid={`pe-edit-${r.code}`} onClick={() => setEdit(r)} style={{ fontSize: 11 }}>수정</button>{" "}
                            <button type="button" data-testid={`pe-toggle-${r.code}`} disabled={busy} onClick={() => void call(`/api/setup/partners/${r.id}`, "PATCH", { active: !r.active }, r.active ? `${r.name} 사용 중지 — 새로 고르는 목록에서 빠집니다` : `${r.name} 다시 사용`)} style={{ fontSize: 11 }}>{r.active ? "사용 중지" : "다시 사용"}</button>{" "}
                            <button type="button" data-testid={`pe-del-${r.code}`} disabled={busy} onClick={() => void call(`/api/setup/partners/${r.id}`, "DELETE", undefined, `${r.name} 을 지웠습니다`)} style={{ fontSize: 11 }}>삭제</button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {ready && list.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>아직 없습니다.</p>}
            {canEdit && (
              <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 60px auto", gap: 6, marginTop: 10 }}>
                <input data-testid={`pn-${kind}-code`} placeholder={ph} value={f.code} onChange={(e) => setNw({ ...nw, [kind]: { ...f, code: e.target.value } })} style={inp} />
                <input data-testid={`pn-${kind}-name`} placeholder="Name" value={f.name} onChange={(e) => setNw({ ...nw, [kind]: { ...f, name: e.target.value } })} style={inp} />
                <input data-testid={`pn-${kind}-contact`} placeholder="담당 · 연락처" value={f.contact} onChange={(e) => setNw({ ...nw, [kind]: { ...f, contact: e.target.value } })} style={inp} />
                <input data-testid={`pn-${kind}-nation`} placeholder="KR" value={f.nation} onChange={(e) => setNw({ ...nw, [kind]: { ...f, nation: e.target.value } })} style={inp} />
                <button type="button" data-testid={`pn-${kind}-add`} disabled={busy || !f.code.trim() || !f.name.trim()} onClick={() => void add(kind)}
                  style={{ fontSize: "var(--fs-12)", fontWeight: 600, padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", background: "var(--accent)", color: "var(--accent-contrast)" }}>등록</button>
              </div>
            )}
          </div>
        );
      })}
      {msg && <p data-testid="company-db-msg" data-ok={msg.ok ? "1" : "0"} style={{ gridColumn: "1 / -1", margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
      <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 11, color: "var(--ink-muted)" }}>
        쓰는 곳: 프로젝트 관리 ▸ Client (고객) · Set-Up ▸ 자재·구매품 ▸ 단가 이력 공급처. 가리키는 곳이 있으면 삭제 대신 사용 중지. 코드는 바꾸지 않습니다. 아직 없음: Warehouse · Inventory · Bank · Employee · Nation 표 — 필요한 입력: 회사 창고·재고·계좌 데이터.
      </p>
    </section>
  );
}
