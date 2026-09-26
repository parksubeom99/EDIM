"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * p12 [ERP / Sale / Project Management] · p50 같은 화면의 User ERP 판.
 * 왼쪽 = 프로젝트 목록 + 등록(Registration Process), 오른쪽 = 고른 프로젝트의 청사진 헤더
 * (Project No · Project Type · Client · Client 담당자 정보 · 담당자 · 영업 단계 · Item · Remarks · 등록일 · Description)
 * 와 접수 자료 등록(File) · Data Up-Load(Department · Type · Name · Description).
 * 일정·승인은 작업대 Inspector 에서 한다(p18) — 여기서는 "작업대에서 열기"로 보낸다. 같은 일을 두 곳에 두지 않는다.
 */

const STAGES = ["기술제안", "견적", "협의", "계약", "계약변경", "종료"];
const DEPTS = ["영업", "기술", "설계", "구매", "생산", "품질"];
const DOC_TYPES = ["Data", "File", "Image"];

interface Proj {
  id: string; hierarchyStable: string; projectNo: string; name: string; type: string;
  clientName: string | null; clientContact: string | null; itemType: string | null;
  salesStage: string; status: string; createdAt: string;
  ownerId: string | null; remarks: string | null; description: string | null;
  /** 0021 · Company DB 고객 */
  clientId: string | null;
  owner: { email: string; name: string | null } | null;
}
interface Customer { id: string; code: string; name: string; contact: string }
interface Member { userId: string; email: string; name: string | null; role: string }
interface Att { id: string; department: string; docType: string; name: string; description: string | null; hasFile: boolean; fileMime: string | null; fileSize: number | null; uploadedAt: string }

const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 14 };
const lab: CSSProperties = { fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 };
const inp: CSSProperties = { fontSize: "var(--fs-13)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
const btn = (primary: boolean, off = false): CSSProperties => ({
  fontSize: "var(--fs-12)", fontWeight: 600, padding: "5px 12px", borderRadius: 4, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1,
  border: primary ? "none" : "1px solid var(--line)", background: primary ? "var(--accent)" : "var(--surface-2)", color: primary ? "var(--accent-contrast)" : "var(--ink)",
});
const th: CSSProperties = { textAlign: "left", fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600, padding: "5px 8px 5px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "5px 8px 5px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const kb = (n: number | null) => (n == null ? "—" : n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

async function send(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { error?: string; id?: string };
  return { ok: r.ok, status: r.status, error: j.error, id: j.id };
}

export function ProjectManagement({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<Proj[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Proj>>({});
  const [atts, setAtts] = useState<Att[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [nw, setNw] = useState({ projectNo: "", name: "", type: "client", clientName: "" });
  const [up, setUp] = useState({ department: "영업", docType: "File", name: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const load = useCallback(async (keep?: string | null) => {
    const [p, m, c] = await Promise.all([fetch("/api/projects").then((r) => r.json()), fetch("/api/company/members").then((r) => r.json()),
      fetch("/api/setup/partners?kind=customer").then((r) => r.json()).catch(() => ({}))]);
    const list = (p.rows ?? []) as Proj[];
    setRows(list); setMembers((m.rows ?? []) as Member[]); setCustomers((c.rows ?? []) as Customer[]);
    const pick = list.find((x) => x.id === (keep ?? selId)) ?? list[0] ?? null;
    setSelId(pick?.id ?? null); setForm(pick ?? {});
    setReady(true);
  }, [selId]);
  useEffect(() => { void load(null); }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  const loadAtts = useCallback(async (id: string | null) => {
    if (!id) { setAtts([]); return; }
    const j = await fetch(`/api/project-attachments?projectId=${id}`).then((r) => r.json());
    setAtts((j.rows ?? []) as Att[]);
  }, []);
  useEffect(() => { void loadAtts(selId); }, [selId, loadAtts]);

  const sel = rows.find((r) => r.id === selId) ?? null;
  const set = (k: keyof Proj, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!sel) return;
    setBusy(true); setMsg(null);
    const r = await send(`/api/projects/${sel.id}`, "PATCH", {
      name: form.name ?? "", type: form.type, clientName: form.clientName ?? "", clientContact: form.clientContact ?? "", clientId: form.clientId ?? "",
      itemType: form.itemType ?? "", ownerId: form.ownerId ?? "", remarks: form.remarks ?? "", description: form.description ?? "",
    });
    let ok = r.ok, text = r.ok ? "저장했습니다" : `거부: ${r.error ?? r.status}`;
    if (r.ok && form.salesStage && form.salesStage !== sel.salesStage) {
      const s = await send(`/api/projects/${sel.id}/stage`, "POST", { stage: form.salesStage });
      ok = s.ok; text = s.ok ? `저장했습니다 · 영업 단계 ${sel.salesStage} → ${form.salesStage}` : `단계 거부: ${s.error ?? s.status}`;
    }
    setBusy(false); setMsg({ ok, text });
    await load(sel.id);
  }

  async function create() {
    setBusy(true); setMsg(null);
    const r = await send("/api/projects", "POST", nw);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: `등록 거부: ${r.error ?? r.status}` }); return; }
    setMsg({ ok: true, text: `등록했습니다 — ${nw.projectNo} 가 Work Hierarchy 에도 생겼습니다` });
    setNw({ projectNo: "", name: "", type: "client", clientName: "" });
    await load(r.id ?? null);
  }

  async function upload() {
    if (!sel || !file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.set("projectId", sel.id); fd.set("department", up.department); fd.set("docType", up.docType);
    if (up.name.trim()) fd.set("name", up.name.trim());
    if (up.description.trim()) fd.set("description", up.description.trim());
    fd.set("file", file);
    const r = await fetch("/api/project-attachments", { method: "POST", body: fd });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `접수 자료 등록 — ${up.name.trim() || file.name}` } : { ok: false, text: `등록 거부: ${j.error ?? r.status}` });
    if (r.ok) { setUp((u) => ({ ...u, name: "", description: "" })); setFile(null); setFileKey((k) => k + 1); await loadAtts(sel.id); }
  }

  const dirty = !!sel && (["name", "type", "clientName", "clientContact", "clientId", "itemType", "ownerId", "remarks", "description", "salesStage"] as const)
    .some((k) => (form[k] ?? "") !== (sel[k] ?? ""));

  return (
    <section data-testid="project-mgmt" data-ready={ready ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, marginTop: 14 }}>
      {/* 왼쪽 — 목록 + 등록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={card}>
          <div style={{ ...lab, marginBottom: 6 }}>Project Management · {rows.length}건</div>
          <ul data-testid="pm-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((p) => (
              <li key={p.id}>
                <button type="button" data-testid={`pm-row-${p.projectNo}`} data-selected={p.id === selId ? "1" : undefined}
                  onClick={() => { setSelId(p.id); setForm(p); setMsg(null); }}
                  style={{ width: "100%", textAlign: "left", padding: "6px 8px", marginBottom: 3, borderRadius: 4, cursor: "pointer",
                    border: `1px solid ${p.id === selId ? "var(--accent)" : "var(--line)"}`, background: p.id === selId ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent", color: "var(--ink)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--fs-12)" }}>{p.projectNo}</span>
                  <span style={{ display: "block", fontSize: "var(--fs-13)" }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{p.salesStage} · {p.owner?.name ?? p.owner?.email ?? "담당자 없음"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {canEdit && (
          <div style={card} data-testid="pm-new">
            <div style={{ ...lab, marginBottom: 6 }}>Registration Process · 새 프로젝트</div>
            <div style={{ display: "grid", gap: 6 }}>
              <input data-testid="pm-new-no" placeholder="Project No (예: PS-61314-1)" value={nw.projectNo} onChange={(e) => setNw({ ...nw, projectNo: e.target.value })} style={inp} />
              <input data-testid="pm-new-name" placeholder="Name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} style={inp} />
              <select data-testid="pm-new-type" value={nw.type} onChange={(e) => setNw({ ...nw, type: e.target.value })} style={inp}>
                <option value="client">Client</option><option value="internal">Internal</option>
              </select>
              <input data-testid="pm-new-client" placeholder="Client" value={nw.clientName} onChange={(e) => setNw({ ...nw, clientName: e.target.value })} style={inp} />
              <button type="button" data-testid="pm-create" disabled={busy || !nw.projectNo.trim() || !nw.name.trim()} onClick={() => void create()}
                style={btn(true, busy || !nw.projectNo.trim() || !nw.name.trim())}>등록</button>
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽 — 청사진 헤더 + 접수 자료 */}
      {sel ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card} data-testid="pm-detail" data-project={sel.projectNo}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span style={lab}>Project No. :</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--warn)", fontWeight: 700 }}>{sel.projectNo}</span>
              <Link href={`/workbench?node=${sel.hierarchyStable}`} data-testid="pm-open-workbench" style={{ marginLeft: "auto", fontSize: "var(--fs-12)", color: "var(--accent)" }}>
                작업대에서 열기 (일정·승인·설계) →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 1fr", gap: "8px 10px", alignItems: "center" }}>
              <span style={lab}>Name</span>
              <input data-testid="pm-name" disabled={!canEdit} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} style={inp} />
              <span style={lab}>영업 단계</span>
              <select data-testid="pm-stage" disabled={!canEdit} value={form.salesStage ?? ""} onChange={(e) => set("salesStage", e.target.value)} style={inp}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span style={lab}>Project Type</span>
              <select data-testid="pm-type" disabled={!canEdit} value={form.type ?? "client"} onChange={(e) => set("type", e.target.value)} style={inp}>
                <option value="client">Client</option><option value="internal">Internal</option>
              </select>
              <span style={lab}>Item</span>
              <input data-testid="pm-item" disabled={!canEdit} value={form.itemType ?? ""} placeholder="AHU" onChange={(e) => set("itemType", e.target.value)} style={inp} />
              <span style={lab}>Client</span>
              <span style={{ display: "flex", gap: 6 }}>
                <input data-testid="pm-client" disabled={!canEdit} value={form.clientName ?? ""} onChange={(e) => set("clientName", e.target.value)} style={inp} />
                {/* 0021 · Company DB 고객에서 고르면 id 와 이름(글자 열)을 함께 채운다 — 글자만 있는 옛 데이터도 그대로 보인다 */}
                <select data-testid="pm-client-pick" disabled={!canEdit} value={form.clientId ?? ""} title="Company DB 고객"
                  onChange={(e) => {
                    const c = customers.find((x) => x.id === e.target.value);
                    setForm((f) => ({ ...f, clientId: c?.id ?? null, ...(c ? { clientName: c.name, clientContact: f.clientContact || c.contact } : {}) }));
                  }} style={{ ...inp, width: 150 }}>
                  <option value="">Company DB —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                </select>
              </span>
              <span style={lab}>Remarks</span>
              <input data-testid="pm-remarks" disabled={!canEdit} value={form.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} style={inp} />
              <span style={lab}>Client 담당자 정보</span>
              <input data-testid="pm-contact" disabled={!canEdit} value={form.clientContact ?? ""} placeholder="이름 · 연락처" onChange={(e) => set("clientContact", e.target.value)} style={inp} />
              <span style={lab}>등록일</span>
              <span data-testid="pm-created" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-13)" }}>{sel.createdAt.slice(0, 10)}</span>
              <span style={lab}>담당자</span>
              <select data-testid="pm-owner" disabled={!canEdit} value={form.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value)} style={inp}>
                <option value="">— 없음</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.name ?? m.email} ({m.role})</option>)}
              </select>
              <span />
              <span />
              <span style={lab}>Description</span>
              <textarea data-testid="pm-description" disabled={!canEdit} rows={2} value={form.description ?? ""} placeholder="주요 요구사항 및 Pain Point"
                onChange={(e) => set("description", e.target.value)} style={{ ...inp, gridColumn: "2 / 5", resize: "vertical", fontFamily: "inherit" }} />
            </div>
            {canEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <button type="button" data-testid="pm-save" disabled={busy || !dirty} onClick={() => void save()} style={btn(true, busy || !dirty)}>저장</button>
                {dirty && <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>저장하지 않은 변경이 있습니다</span>}
              </div>
            )}
          </div>

          <div style={card} data-testid="pm-files">
            <div style={{ ...lab, marginBottom: 6 }}>접수 자료 등록 (File) · Data Up-Load — {atts.length}건</div>
            <table data-testid="pm-att-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Department</th><th style={th}>Type</th><th style={th}>Name</th><th style={th}>Description</th><th style={th}>크기</th><th style={th}>등록</th><th style={th}></th></tr></thead>
              <tbody>
                {atts.map((a) => (
                  <tr key={a.id} data-testid="pm-att-row" data-has-file={a.hasFile ? "1" : "0"}>
                    <td style={td}>{a.department}</td><td style={td}>{a.docType}</td>
                    <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{a.name}</td><td style={td}>{a.description ?? "—"}</td>
                    <td style={td}>{kb(a.fileSize)}</td><td style={td}>{a.uploadedAt.slice(0, 10)}</td>
                    <td style={td}>{a.hasFile
                      ? <a data-testid="pm-att-download" href={`/api/project-attachments/${a.id}/file`} style={{ color: "var(--accent)" }}>받기</a>
                      : <span style={{ color: "var(--ink-muted)" }} title="예전 방식으로 이름만 등록된 자료">파일 없음</span>}</td>
                  </tr>
                ))}
                {atts.length === 0 && <tr><td style={{ ...td, color: "var(--ink-muted)" }} colSpan={7}>등록된 자료가 없습니다</td></tr>}
              </tbody>
            </table>
            {canEdit && (
              <div style={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 1fr", gap: 6, marginTop: 10, alignItems: "center" }}>
                <select data-testid="pm-up-dept" value={up.department} onChange={(e) => setUp({ ...up, department: e.target.value })} style={inp}>
                  {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select data-testid="pm-up-type" value={up.docType} onChange={(e) => setUp({ ...up, docType: e.target.value })} style={inp}>
                  {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input data-testid="pm-up-name" placeholder="Name (비우면 파일 이름)" value={up.name} onChange={(e) => setUp({ ...up, name: e.target.value })} style={inp} />
                <input data-testid="pm-up-desc" placeholder="Description" value={up.description} onChange={(e) => setUp({ ...up, description: e.target.value })} style={inp} />
                <input key={fileKey} data-testid="pm-up-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ gridColumn: "1 / 4", fontSize: "var(--fs-12)" }} />
                <button type="button" data-testid="pm-upload" disabled={busy || !file} onClick={() => void upload()} style={btn(true, busy || !file)}>자료 등록 (최대 10MB)</button>
              </div>
            )}
          </div>
          {msg && <p data-testid="pm-msg" data-ok={msg.ok ? "1" : "0"} style={{ margin: 0, fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</p>}
        </div>
      ) : (
        <div style={{ ...card, color: "var(--ink-muted)" }}>{ready ? "프로젝트가 없습니다 — 왼쪽에서 등록하십시오" : "불러오는 중…"}</div>
      )}
    </section>
  );
}
