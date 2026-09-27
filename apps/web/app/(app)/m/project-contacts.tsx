"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { localToday } from "@/app/lib/today";
import { ACTIVITY_KINDS } from "@/app/lib/project-contact";

/**
 * p12 · p50 — Client 담당자 여러 명(주담당 1명) · 영업 활동 이력(쌓기만 — 수정·삭제 없음). 0023.
 */
interface Contact { id: string; name: string; department: string; contact: string; isPrimary: boolean }
interface Activity { id: string; date: string; kind: string; content: string }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 14 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 8px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 8px 4px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const btn = (primary = false): CSSProperties => ({ fontSize: "var(--fs-12)", fontWeight: 600, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
  border: primary ? "none" : "1px solid var(--line)", background: primary ? "var(--accent)" : "var(--surface-2)", color: primary ? "var(--accent-contrast)" : "var(--ink)" });

async function send(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  return { ok: r.ok, status: r.status, error: j.error };
}

export function ProjectContacts({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nc, setNc] = useState({ name: "", department: "", contact: "", isPrimary: false });
  const [edit, setEdit] = useState<Contact | null>(null);
  const [na, setNa] = useState({ date: localToday(), kind: "visit", content: "" });

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([fetch(`/api/projects/${projectId}/contacts`).then((r) => r.json()), fetch(`/api/projects/${projectId}/activities`).then((r) => r.json())]);
    setContacts(c.rows ?? []); setActs(a.rows ?? []); setReady(true);
  }, [projectId]);
  useEffect(() => { setReady(false); setEdit(null); void load(); }, [load]);

  async function run(p: Promise<{ ok: boolean; status: number; error?: string }>, okText: string) {
    const r = await p;
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: `거부 (${r.status}): ${r.error ?? ""}` });
    if (r.ok) await load();
    return r.ok;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} data-testid="pm-crm" data-ready={ready ? "1" : "0"}>
      <div style={card} data-testid="pm-contacts">
        <div style={{ ...lab, marginBottom: 6 }}>Client 담당자 · {contacts.length}명 (p12)</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>이름</th><th style={th}>부서</th><th style={th}>연락처</th><th style={th}>주담당</th>{canEdit && <th style={th}></th>}</tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} data-testid={`pm-contact-${c.name}`} data-primary={c.isPrimary ? "1" : "0"}>
                {edit?.id === c.id ? (
                  <>
                    <td style={td}><input data-testid="pm-ce-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={inp} /></td>
                    <td style={td}><input data-testid="pm-ce-dept" value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} style={inp} /></td>
                    <td style={td}><input data-testid="pm-ce-contact" value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} style={inp} /></td>
                    <td style={td}>{c.isPrimary ? "주" : ""}</td>
                    <td style={td}>
                      <button type="button" data-testid="pm-ce-save" onClick={() => void run(send(`/api/project-contacts/${c.id}`, "PATCH", { name: edit.name, department: edit.department, contact: edit.contact }), "담당자를 고쳤습니다").then((ok) => ok && setEdit(null))} style={btn(true)}>저장</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...td, fontWeight: 600 }}>{c.name}</td><td style={td}>{c.department || "—"}</td><td style={td}>{c.contact || "—"}</td>
                    <td style={{ ...td, color: "var(--accent)", fontWeight: 700 }}>{c.isPrimary ? "주담당" : ""}</td>
                    {canEdit && (
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {!c.isPrimary && <button type="button" data-testid={`pm-c-primary-${c.name}`} onClick={() => void run(send(`/api/project-contacts/${c.id}`, "PATCH", { isPrimary: true }), `${c.name} 을 주담당으로`)} style={btn()}>주담당</button>}{" "}
                        <button type="button" data-testid={`pm-c-edit-${c.name}`} onClick={() => setEdit(c)} style={btn()}>수정</button>{" "}
                        <button type="button" data-testid={`pm-c-del-${c.name}`} onClick={() => void run(send(`/api/project-contacts/${c.id}`, "DELETE"), `${c.name} 을 지웠습니다`)} style={btn()}>삭제</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {ready && contacts.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>아직 담당자가 없습니다.</p>}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr auto auto", gap: 6, marginTop: 8, alignItems: "center" }}>
            <input data-testid="pm-c-name" placeholder="이름" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} style={inp} />
            <input data-testid="pm-c-dept" placeholder="부서" value={nc.department} onChange={(e) => setNc({ ...nc, department: e.target.value })} style={inp} />
            <input data-testid="pm-c-contact" placeholder="연락처" value={nc.contact} onChange={(e) => setNc({ ...nc, contact: e.target.value })} style={inp} />
            <label style={{ fontSize: 11, whiteSpace: "nowrap" }}><input data-testid="pm-c-isprimary" type="checkbox" checked={nc.isPrimary} onChange={(e) => setNc({ ...nc, isPrimary: e.target.checked })} /> 주담당</label>
            <button type="button" data-testid="pm-c-add" disabled={!nc.name.trim()} onClick={() => void run(send(`/api/projects/${projectId}/contacts`, "POST", nc), `${nc.name} 담당자 추가`).then((ok) => ok && setNc({ name: "", department: "", contact: "", isPrimary: false }))} style={btn(true)}>추가</button>
          </div>
        )}
      </div>
      <div style={card} data-testid="pm-activities">
        <div style={{ ...lab, marginBottom: 6 }}>영업 활동 이력 · {acts.length}건 (쌓기만 — 수정·삭제 없음)</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>날짜</th><th style={th}>종류</th><th style={th}>내용</th></tr></thead>
          <tbody>
            {acts.map((a) => (
              <tr key={a.id} data-testid="pm-activity-row" data-kind={a.kind}>
                <td style={{ ...td, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{a.date}</td><td style={{ ...td, whiteSpace: "nowrap" }}>{ACTIVITY_KINDS[a.kind] ?? a.kind}</td><td style={td}>{a.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ready && acts.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>아직 활동 이력이 없습니다.</p>}
        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "130px 80px 1fr auto", gap: 6, marginTop: 8 }}>
            <input data-testid="pm-a-date" type="date" value={na.date} onChange={(e) => setNa({ ...na, date: e.target.value })} style={inp} />
            <select data-testid="pm-a-kind" value={na.kind} onChange={(e) => setNa({ ...na, kind: e.target.value })} style={inp}>
              {Object.entries(ACTIVITY_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input data-testid="pm-a-content" placeholder="내용 (예: 사양 회의 — 풍량 55,000 CMH 확정)" value={na.content} onChange={(e) => setNa({ ...na, content: e.target.value })} style={inp} />
            <button type="button" data-testid="pm-a-add" disabled={!na.content.trim()} onClick={() => void run(send(`/api/projects/${projectId}/activities`, "POST", na), "활동을 쌓았습니다").then((ok) => ok && setNa({ ...na, content: "" }))} style={btn(true)}>쌓기</button>
          </div>
        )}
      </div>
      {msg && <p data-testid="pm-crm-msg" data-ok={msg.ok ? "1" : "0"} style={{ gridColumn: "1 / -1", margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
    </div>
  );
}
