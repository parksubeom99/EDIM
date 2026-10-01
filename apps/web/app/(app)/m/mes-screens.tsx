"use client";

/**
 * ccmd L · LA-2 · LA-3 — 생산 · 창고 · 품질 화면(p43 · p44) · 모바일(p69). 새 경로 · 새 화면(시연 장면 1~14 화면 불변).
 * 화면은 API 를 부르기만 한다 — 규칙(앞 공정 409 · 완성품 검수 · 음수 재고 409 · 추가만)은 서버 · DB 가 지킨다. 거부 이유는 그대로 보여 준다.
 */
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

type J = Record<string, unknown>;
const cell: CSSProperties = { border: "1px solid var(--line)", padding: "4px 8px", fontSize: 13, textAlign: "left", verticalAlign: "top" };
const num: CSSProperties = { ...cell, textAlign: "right", fontFamily: "var(--font-mono)" };
const btn: CSSProperties = { fontSize: 12, padding: "3px 10px", border: "1px solid var(--accent)", color: "var(--accent)", background: "transparent", borderRadius: 4, cursor: "pointer" };
const inp: CSSProperties = { fontSize: 13, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4 };
export const Sample = () => <span data-testid="mes-sample" style={{ fontSize: 11, fontWeight: 700, color: "#b45309", border: "1px solid #b45309", borderRadius: 3, padding: "0 4px" }}>샘플</span>;

async function call(url: string, method = "GET", body?: unknown): Promise<{ ok: boolean; status: number; j: J }> {
  const r = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, status: r.status, j: ((await r.json().catch(() => ({}))) as J) };
}
function useLoad<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(async () => { if (!url) return; const r = await call(url); setData(r.j as T); }, [url]);
  useEffect(() => { void load(); }, [load]);
  return { data, load };
}
function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return <p data-testid="mes-msg" data-ok={m.ok ? "1" : "0"} style={{ margin: "6px 0", fontSize: 13, color: m.ok ? "var(--accent)" : "var(--warn, #b91c1c)" }}>{m.text}</p>;
}
const say = (r: { ok: boolean; status: number; j: J }, okText: string) => ({ ok: r.ok, text: r.ok ? okText : `거부 (${r.status}): ${String(r.j.error ?? "")}` });
export function Shell({ title, sub, children, testid }: { title: string; sub: ReactNode; children: ReactNode; testid: string }) {
  return (
    <main data-testid={testid} style={{ maxWidth: 1180, margin: "3vh auto", padding: "16px 24px" }}>
      <nav style={{ display: "flex", gap: 12, fontSize: "var(--fs-13)" }}>
        <Link href="/workbench" style={{ color: "var(--accent)" }}>← 작업대</Link>
        <Link href="/setup/work-process">Work Process</Link><Link href="/m/warehouse">창고 · 재고</Link><Link href="/m/mrp">MRP</Link>
        <Link href="/m/work-orders">작업지시</Link><Link href="/m/capacity">Capacity</Link><Link href="/m/quality">품질</Link><Link href="/mobile">모바일</Link>
      </nav>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "10px 0 2px" }}>{title}</h1>
      <div style={{ margin: "0 0 10px", fontSize: "var(--fs-13)", color: "var(--ink-muted)" }}>{sub}</div>
      {children}
    </main>
  );
}

type Master = { workCenters: { id: string; code: string; name: string; hoursPerDay: number; isSample: boolean }[]; machines: { id: string; code: string; kind: string; workCenterId: string }[];
  workers: { id: string; code: string; displayName: string; skillGrade: string }[]; warehouses: { id: string; code: string; name: string; location: string }[];
  items: { itemCode: string; warehouseId: string; minStack: number; supplier: string | null; makeBuy: "make" | "buy"; leadDays: number; unit: string }[];
  routes: { itemCode: string; seq: number; name: string; workCenterId: string; persons: number; skill: string; hours: number; prevSeq: number | null }[] };

/* ───────── p43 Work Process — Material 표 · Process 표 ───────── */
export function WorkProcess({ canEdit }: { canEdit: boolean }) {
  const { data: m, load } = useLoad<Master>("/api/mes/master");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [it, setIt] = useState({ itemCode: "", warehouseId: "", minStack: "0", supplier: "", makeBuy: "buy", leadDays: "0", unit: "ea" });
  const [st, setSt] = useState({ itemCode: "", seq: "1", name: "", workCenterId: "", persons: "1", skill: "H1", hours: "1", prevSeq: "" });
  if (!m) return <p>불러오는 중…</p>;
  const wc = (id: string) => m.workCenters.find((w) => w.id === id)?.code ?? "?";
  const wh = (id: string) => m.warehouses.find((w) => w.id === id)?.code ?? "?";
  async function saveItem() {
    const r = await call("/api/mes/master", "POST", { kind: "item", row: { ...it, minStack: Number(it.minStack), leadDays: Number(it.leadDays), supplier: it.supplier || null } });
    setMsg(say(r, `품목 자재 정보 ${it.itemCode} 저장`)); if (r.ok) await load();
  }
  async function saveStep() {
    const cur = m!.routes.filter((r) => r.itemCode === st.itemCode && r.seq !== Number(st.seq)).map(({ itemCode: _i, ...x }) => x);
    const steps = [...cur, { seq: Number(st.seq), name: st.name, workCenterId: st.workCenterId, persons: Number(st.persons), skill: st.skill, hours: Number(st.hours), prevSeq: st.prevSeq ? Number(st.prevSeq) : null }].sort((a, b) => a.seq - b.seq);
    const r = await call("/api/mes/master", "POST", { kind: "route", row: { itemCode: st.itemCode, steps } });
    setMsg(say(r, `공정 순서 ${st.itemCode} #${st.seq} 저장`)); if (r.ok) await load();
  }
  return (
    <>
      <h2 style={{ fontSize: 15 }}>Material <Sample /></h2>
      <table data-testid="wp-material" style={{ borderCollapse: "collapse" }}>
        <thead><tr>{["Item", "warehouse", "Min Stack", "공급자", "제조/구매", "Time(리드타임 일)", "단위"].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{m.items.map((i) => <tr key={i.itemCode} data-item={i.itemCode}><td style={cell}>{i.itemCode}</td><td style={cell}>{wh(i.warehouseId)}</td><td style={num}>{i.minStack}</td><td style={cell}>{i.supplier ?? "—"}</td><td style={cell}>{i.makeBuy === "make" ? "제조" : "구매"}</td><td style={num}>{i.leadDays}</td><td style={cell}>{i.unit}</td></tr>)}</tbody>
      </table>
      {canEdit && <div data-testid="wp-item-form" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
        <input data-f="itemCode" placeholder="품목 코드" value={it.itemCode} onChange={(e) => setIt({ ...it, itemCode: e.target.value })} style={inp} />
        <select data-f="warehouseId" value={it.warehouseId} onChange={(e) => setIt({ ...it, warehouseId: e.target.value })} style={inp}><option value="">창고</option>{m.warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select>
        <input data-f="minStack" value={it.minStack} onChange={(e) => setIt({ ...it, minStack: e.target.value })} style={{ ...inp, width: 70 }} title="Min Stack" />
        <input data-f="supplier" placeholder="공급자" value={it.supplier} onChange={(e) => setIt({ ...it, supplier: e.target.value })} style={inp} />
        <select data-f="makeBuy" value={it.makeBuy} onChange={(e) => setIt({ ...it, makeBuy: e.target.value })} style={inp}><option value="buy">구매</option><option value="make">제조</option></select>
        <input data-f="leadDays" value={it.leadDays} onChange={(e) => setIt({ ...it, leadDays: e.target.value })} style={{ ...inp, width: 60 }} title="리드타임(일)" />
        <button type="button" data-testid="wp-item-save" onClick={() => void saveItem()} style={btn}>저장</button>
      </div>}
      <h2 style={{ fontSize: 15 }}>Process <Sample /></h2>
      <table data-testid="wp-process" style={{ borderCollapse: "collapse" }}>
        <thead><tr>{["Item", "순번", "Assembling(공정)", "Work shop", "Person", "Skill", "W. Time(h)", "앞 공정"].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{m.routes.map((r) => <tr key={`${r.itemCode}-${r.seq}`} data-route={`${r.itemCode}#${r.seq}`}><td style={cell}>{r.itemCode}</td><td style={num}>{r.seq}</td><td style={cell}>{r.name}</td><td style={cell}>{wc(r.workCenterId)}</td><td style={num}>{r.persons}</td><td style={cell}>{r.skill}</td><td style={num}>{r.hours}</td><td style={num}>{r.prevSeq ?? "—"}</td></tr>)}</tbody>
      </table>
      {canEdit && <div data-testid="wp-route-form" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
        <input data-f="itemCode" placeholder="품목 코드" value={st.itemCode} onChange={(e) => setSt({ ...st, itemCode: e.target.value })} style={inp} />
        <input data-f="seq" value={st.seq} onChange={(e) => setSt({ ...st, seq: e.target.value })} style={{ ...inp, width: 44 }} title="순번" />
        <input data-f="name" placeholder="공정" value={st.name} onChange={(e) => setSt({ ...st, name: e.target.value })} style={inp} />
        <select data-f="workCenterId" value={st.workCenterId} onChange={(e) => setSt({ ...st, workCenterId: e.target.value })} style={inp}><option value="">작업장</option>{m.workCenters.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select>
        <input data-f="persons" value={st.persons} onChange={(e) => setSt({ ...st, persons: e.target.value })} style={{ ...inp, width: 44 }} title="인원" />
        <input data-f="skill" value={st.skill} onChange={(e) => setSt({ ...st, skill: e.target.value })} style={{ ...inp, width: 44 }} title="스킬" />
        <input data-f="hours" value={st.hours} onChange={(e) => setSt({ ...st, hours: e.target.value })} style={{ ...inp, width: 54 }} title="시간(h)" />
        <input data-f="prevSeq" placeholder="앞 공정" value={st.prevSeq} onChange={(e) => setSt({ ...st, prevSeq: e.target.value })} style={{ ...inp, width: 64 }} />
        <button type="button" data-testid="wp-route-save" onClick={() => void saveStep()} style={btn}>공정 저장</button>
      </div>}
      <Msg m={msg} />
      <h2 style={{ fontSize: 15 }}>기준정보 <Sample /></h2>
      <div data-testid="wp-master" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 13 }}>
        <div><b>작업장</b><ul>{m.workCenters.map((w) => <li key={w.id}>{w.code} · {w.name} · 가용 {w.hoursPerDay}h/일</li>)}</ul></div>
        <div><b>기계</b><ul>{m.machines.map((x) => <li key={x.id}>{x.code} · {x.kind} · {wc(x.workCenterId)}</li>)}</ul></div>
        <div><b>작업자</b><ul>{m.workers.map((w) => <li key={w.id}>{w.displayName} · 스킬 {w.skillGrade}</li>)}</ul></div>
        <div><b>창고</b><ul>{m.warehouses.map((w) => <li key={w.id}>{w.code} · {w.name} · {w.location}</li>)}</ul></div>
      </div>
    </>
  );
}

/* ───────── p44-4 창고 · 재고 ───────── */
type StockRow = { itemCode: string; warehouseId: string; warehouseCode: string; onHand: number; unit: string; minStack: number; warn: boolean; price: { max: number | null; min: number | null; avg: number | null; latest: number | null } };
export function Warehouse({ canEdit, item = null }: { canEdit: boolean; item?: string | null }) {
  const { data, load } = useLoad<{ rows: StockRow[]; moves: { id: string; itemCode: string; qty: number; unitPrice: number | null; reason: string; createdAt: string }[] }>("/api/mes/stock");
  const { data: m } = useLoad<Master>("/api/mes/master");
  const [f, setF] = useState({ itemCode: "", warehouseId: "", kind: "receipt", qty: "1", unitPrice: "", refId: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const w = (v: number | null) => (v === null ? "—" : v.toLocaleString("ko-KR"));
  async function move() {
    const r = await call("/api/mes/stock", "POST", { ...f, qty: Number(f.qty), unitPrice: f.unitPrice === "" ? null : Number(f.unitPrice), refId: f.refId || undefined });
    setMsg(say(r, `${f.kind === "receipt" ? "입고" : "출고"} ${f.itemCode} ${f.qty}`)); if (r.ok) await load();
  }
  return (
    <>
      <table data-testid="wh-stock" style={{ borderCollapse: "collapse" }}>
        <thead><tr>{["품목", "창고", "현재고", "Min Stack", "경고", "단가 최고", "최저", "평균", "최근"].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{(data?.rows ?? []).filter((r) => !item || r.itemCode === item).map((r) => <tr key={`${r.itemCode}|${r.warehouseId}`} data-item={r.itemCode} data-onhand={r.onHand} data-warn={r.warn ? "1" : "0"}>
          <td style={cell}>{r.itemCode}</td><td style={cell}>{r.warehouseCode}</td><td style={num}>{r.onHand} {r.unit}</td><td style={num}>{r.minStack}</td>
          <td style={{ ...cell, color: r.warn ? "#b91c1c" : undefined }}>{r.warn ? "Min Stack 미만" : ""}</td>
          <td style={num}>{w(r.price.max)}</td><td style={num}>{w(r.price.min)}</td><td style={num}>{w(r.price.avg)}</td><td style={num}>{w(r.price.latest)}</td></tr>)}</tbody>
      </table>
      {canEdit && m && <div data-testid="wh-form" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
        <select data-f="kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} style={inp}><option value="receipt">입고</option><option value="issue">출고</option></select>
        <input data-f="itemCode" placeholder="품목 코드(QR 로도)" value={f.itemCode} onChange={(e) => setF({ ...f, itemCode: e.target.value })} style={inp} />
        <select data-f="warehouseId" value={f.warehouseId} onChange={(e) => setF({ ...f, warehouseId: e.target.value })} style={inp}><option value="">창고</option>{m.warehouses.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>
        <input data-f="qty" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} style={{ ...inp, width: 60 }} title="수량" />
        <input data-f="unitPrice" placeholder="입고 단가" value={f.unitPrice} onChange={(e) => setF({ ...f, unitPrice: e.target.value })} style={{ ...inp, width: 90 }} />
        <button type="button" data-testid="wh-move" onClick={() => void move()} style={btn}>기록</button>
      </div>}
      <Msg m={msg} />
      <h2 style={{ fontSize: 15 }}>이동 기록(추가만)</h2>
      <table data-testid="wh-moves" style={{ borderCollapse: "collapse" }}><tbody>{(data?.moves ?? []).map((x) => <tr key={x.id} data-reason={x.reason}><td style={cell}>{x.createdAt.slice(0, 16).replace("T", " ")}</td><td style={cell}>{x.itemCode}</td><td style={num}>{x.qty}</td><td style={num}>{x.unitPrice ?? ""}</td><td style={cell}>{x.reason}</td></tr>)}</tbody></table>
    </>
  );
}

/* ───────── p44-1 MRP ───────── */
type MrpOut = { project: { id: string; projectNo: string; qty: number; due: string | null }; run: { id: string; code: string }; head: { snapshotId: string; stockSum: number; today: string; product: string };
  rows: { item: string; part: string; kind: string; gross: number; onHand: number; incoming: number; net: number; startBy: string | null; late: boolean; days: number; source: string }[]; error?: string };
export function Mrp({ canEdit, projects }: { canEdit: boolean; projects: { id: string; projectNo: string; name: string; qty: number; due: string | null }[] }) {
  const [pid, setPid] = useState(projects[0]?.id ?? "");
  const p = projects.find((x) => x.id === pid);
  const [qd, setQd] = useState({ qty: String(p?.qty ?? 1), due: p?.due ?? "" });
  const { data, load } = useLoad<MrpOut>(pid ? `/api/mes/mrp?project=${pid}` : null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function saveQd() { const r = await call(`/api/mes/projects/${pid}`, "PATCH", { qty: Number(qd.qty), dueDate: qd.due || null }); setMsg(say(r, `수량 ${qd.qty} · 납기 ${qd.due || "—"} 저장`)); if (r.ok) await load(); }
  async function act(action: string) {
    const r = await call("/api/mes/mrp", "POST", { project: pid, action });
    setMsg(say(r, action === "purchase" ? `구매 요청 초안 ${String(r.j.prNo ?? "")}` : `작업지시 초안 ${((r.j.workOrders as { woNo: string }[]) ?? []).map((w) => w.woNo).join(", ")}${(r.j.skipped as string[] | undefined)?.length ? ` · 공정 순서 없어 건너뜀: ${(r.j.skipped as string[]).join(", ")}` : ""}`));
    if (r.ok) await load();
  }
  return (
    <>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <select data-testid="mrp-project" value={pid} onChange={(e) => { setPid(e.target.value); const q = projects.find((x) => x.id === e.target.value); setQd({ qty: String(q?.qty ?? 1), due: q?.due ?? "" }); }} style={inp}>{projects.map((x) => <option key={x.id} value={x.id}>{x.projectNo} · {x.name}</option>)}</select>
        수량 <input data-testid="mrp-qty" value={qd.qty} onChange={(e) => setQd({ ...qd, qty: e.target.value })} style={{ ...inp, width: 60 }} disabled={!canEdit} />
        납기 <input data-testid="mrp-due" type="date" value={qd.due} onChange={(e) => setQd({ ...qd, due: e.target.value })} style={inp} disabled={!canEdit} />
        {canEdit && <button type="button" data-testid="mrp-save" onClick={() => void saveQd()} style={btn}>저장</button>}
      </div>
      {data?.error ? <p data-testid="mrp-error" style={{ color: "#b91c1c" }}>{data.error}</p> : data && <>
        <p data-testid="mrp-head" data-snapshot={data.head.snapshotId} data-today={data.head.today} data-stock={data.head.stockSum} style={{ fontSize: 12, color: "var(--ink-muted)" }}>
          스냅샷 <span style={{ fontFamily: "var(--font-mono)" }}>{data.head.snapshotId.slice(0, 8)}</span> ({data.run.code}) · 재고 합 {data.head.stockSum} · 오늘 {data.head.today} — 같은 입력이면 같은 결과 · 제조 시기는 공정 시간 ÷ 8h/일 환산(샘플 가정) <Sample /></p>
        <table data-testid="mrp-table" style={{ borderCollapse: "collapse" }}>
          <thead><tr>{["품목", "이름", "구분", "총소요", "재고", "입고 예정", "순소요", "시기(발주/착수)", "근거"].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
          <tbody>{data.rows.map((r) => <tr key={r.item} data-item={r.item} data-net={r.net} data-kind={r.kind} data-start={r.startBy ?? ""}>
            <td style={cell}>{r.item}</td><td style={cell}>{r.part}</td><td style={cell}>{r.kind === "buy" ? "구매" : "제조"}</td><td style={num}>{r.gross}</td><td style={num}>{r.onHand}</td><td style={num}>{r.incoming}</td>
            <td style={{ ...num, fontWeight: 700 }}>{r.net}</td><td style={{ ...cell, color: r.late ? "#b91c1c" : undefined }}>{r.startBy ?? "—"}{r.late ? " (늦음)" : ""}</td><td style={cell}>{r.source === "item_material" ? "자재 정보" : "스냅샷 줄 종류"}</td></tr>)}</tbody>
        </table>
        {canEdit && <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
          <button type="button" data-testid="mrp-purchase" onClick={() => void act("purchase")} style={btn}>구매 요청 초안 만들기</button>
          <button type="button" data-testid="mrp-workorders" onClick={() => void act("work-orders")} style={btn}>작업지시 초안 만들기</button>
        </div>}
      </>}
      <Msg m={msg} />
    </>
  );
}

/* ───────── p44-2 · 3 작업지시 · 공정 진행 ───────── */
type WoD = { id: string; woNo: string; itemCode: string; qty: number; status: string; dueDate: string | null;
  processCost?: { total: number; missing: string[]; file: string; fingerprint: string; sample: string } | { error: string };
  steps: { seq: number; name: string; workCenter: string; persons: number; skill: string; hours: number; prevSeq: number | null; startedAt: string | null; finishedAt: string | null; actualHours: number | null }[] };
export function WorkOrders({ canEdit, initial }: { canEdit: boolean; initial: string | null }) {
  const { data: list, load: reload } = useLoad<{ rows: { id: string; woNo: string; itemCode: string; qty: number; status: string }[] }>("/api/mes/work-orders");
  const { data: m } = useLoad<Master>("/api/mes/master");
  const [sel, setSel] = useState<string | null>(initial);
  const { data: d, load } = useLoad<WoD>(sel ? `/api/mes/work-orders/${sel}` : null);
  const [worker, setWorker] = useState(""); const [hrs, setHrs] = useState("1");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function act(body: J, text: string) { const r = await call(`/api/mes/work-orders/${sel}`, "POST", body); setMsg(say(r, text)); await load(); await reload(); }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <ul data-testid="wo-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>{(list?.rows ?? []).map((w) =>
        <li key={w.id}><button type="button" data-wo={w.woNo} data-status={w.status} onClick={() => setSel(w.id)} style={{ ...btn, border: sel === w.id ? "2px solid var(--accent)" : btn.border, width: "100%", textAlign: "left", marginBottom: 4 }}>{w.woNo} · {w.itemCode} × {w.qty} · {w.status}</button></li>)}</ul>
      <div>{d && <div data-testid="wo-detail" data-status={d.status} data-wo={d.woNo}>
        <p style={{ margin: 0 }}><b>{d.woNo}</b> · {d.itemCode} × {d.qty} · 납기 {d.dueDate ?? "—"} · 상태 <b>{d.status}</b> ·{" "}
          <a data-testid="wo-print" href={`/api/mes/work-orders/${d.id}/print`} target="_blank" rel="noreferrer">작업지시서(A4 · QR)</a></p>
        {canEdit && d.status === "draft" && <button type="button" data-testid="wo-release" onClick={() => void act({ action: "release" }, "지시했습니다")} style={{ ...btn, margin: "6px 0" }}>지시</button>}
        {canEdit && m && <div style={{ display: "flex", gap: 6, margin: "6px 0" }}>작업자 <select data-testid="wo-worker" value={worker} onChange={(e) => setWorker(e.target.value)} style={inp}><option value="">—</option>{m.workers.map((w) => <option key={w.id} value={w.id}>{w.displayName} · {w.skillGrade}</option>)}</select>
          실제 시간 <input data-testid="wo-hours" value={hrs} onChange={(e) => setHrs(e.target.value)} style={{ ...inp, width: 50 }} /> h <Sample /></div>}
        <table data-testid="wo-steps" style={{ borderCollapse: "collapse" }}>
          <thead><tr>{["순번", "공정", "작업장", "인원", "스킬", "시간", "앞", "착수", "완료", ""].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
          <tbody>{d.steps.map((s) => <tr key={s.seq} data-seq={s.seq} data-started={s.startedAt ? "1" : "0"} data-finished={s.finishedAt ? "1" : "0"}>
            <td style={num}>{s.seq}</td><td style={cell}>{s.name}</td><td style={cell}>{s.workCenter}</td><td style={num}>{s.persons}</td><td style={cell}>{s.skill}</td><td style={num}>{s.hours}</td><td style={num}>{s.prevSeq ?? "—"}</td>
            <td style={cell}>{s.startedAt?.slice(11, 16) ?? ""}</td><td style={cell}>{s.finishedAt?.slice(11, 16) ?? ""}{s.actualHours !== null ? ` · ${s.actualHours}h` : ""}</td>
            <td style={cell}>{canEdit && !s.finishedAt && <>{/* ccmd P · 4-1 — 완료된 공정에는 버튼을 두지 않는다(서버 409 는 그대로) */}
              {!s.startedAt && <button type="button" data-testid={`wo-start-${s.seq}`} onClick={() => void act({ action: "start", seq: s.seq, workerId: worker || undefined }, `공정 ${s.seq} 착수`)} style={btn}>착수</button>}{" "}
              {s.startedAt && <button type="button" data-testid={`wo-finish-${s.seq}`} onClick={() => void act({ action: "finish", seq: s.seq, workerId: worker || undefined, actualHours: Number(hrs) }, `공정 ${s.seq} 완료`)} style={btn}>완료</button>}</>}</td></tr>)}</tbody>
        </table>
        {d.processCost && <p data-testid="wo-process-cost" data-total={"error" in d.processCost ? "" : d.processCost.total} style={{ fontSize: 12, color: "var(--ink-muted)" }}>
          {"error" in d.processCost ? `공정비용(참고 · 원가 미반영): 계산 안 함 — ${d.processCost.error}`
            : <>공정비용(참고 · 원가 미반영): <b>₩{d.processCost.total.toLocaleString("ko-KR")}</b> — 단계마다 시간 × 인원 × 수량 × 작업장 요율 · 요율 {d.processCost.file} #{d.processCost.fingerprint}{d.processCost.missing.length ? ` · 요율 없는 작업장 ${d.processCost.missing.join(", ")}` : ""} {d.processCost.sample && <Sample />}</>}</p>}
        <Msg m={msg} />
      </div>}</div>
    </div>
  );
}

/* ───────── p44-3 Capacity ───────── */
export function Capacity() {
  const { data } = useLoad<{ centers: { id: string; code: string; name: string; hoursPerDay: number }[]; cells: { workCenterId: string; date: string; load: number; available: number; over: boolean; from: string[] }[] }>("/api/mes/capacity");
  if (!data) return <p>불러오는 중…</p>;
  const dates = [...new Set(data.cells.map((c) => c.date))].sort();
  return (
    <table data-testid="cap-table" style={{ borderCollapse: "collapse" }}>
      <thead><tr><th style={cell}>작업장(가용 h/일)</th>{dates.map((d) => <th key={d} style={cell}>{d}</th>)}</tr></thead>
      <tbody>{data.centers.map((c) => <tr key={c.id}><td style={cell}>{c.code} · {c.name} ({c.hoursPerDay})</td>{dates.map((d) => {
        const x = data.cells.find((y) => y.workCenterId === c.id && y.date === d);
        return <td key={d} data-cell={`${c.code}|${d}`} data-over={x?.over ? "1" : "0"} data-load={x?.load ?? 0} title={x?.from.join(", ")} style={{ ...num, background: x?.over ? "#fecaca" : undefined }}>{x ? `${x.load} / ${x.available}` : ""}</td>;
      })}</tr>)}</tbody>
    </table>
  );
}

/* ───────── p44-5 품질 ───────── */
type Q = { inspections: { id: string; target: string; refId: string; itemCode: string | null; result: string; memo: string; createdAt: string }[];
  defects: { id: string; kind: string; title: string; status: string; log: { status: string; note: string; at: string }[] }[] };
export function Quality({ canEdit }: { canEdit: boolean }) {
  const { data, load } = useLoad<Q>("/api/mes/quality");
  const [f, setF] = useState({ target: "material", refId: "", itemCode: "", result: "pass", memo: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function inspect() { const r = await call("/api/mes/quality", "POST", { kind: "inspection", ...f }); setMsg(say(r, `검수 기록 · ${f.result === "pass" ? "합격" : "불합격"}${r.j.defectId ? " → 하자 건 열림" : ""}${r.j.returned ? " → 반품 이동" : ""}`)); await load(); }
  async function adv(id: string, to: string) { const r = await call(`/api/mes/defects/${id}`, "POST", { to, note: to === "action" ? "조치 중" : "조치 완료" }); setMsg(say(r, `하자 → ${to}`)); await load(); }
  return (
    <>
      {canEdit && <div data-testid="q-form" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
        <select data-f="target" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} style={inp}><option value="material">자재 입고</option><option value="product">완성품(작업지시)</option><option value="install">설치완료(프로젝트)</option></select>
        <input data-f="refId" placeholder="대상 id(입고 · 작업지시 · 프로젝트)" value={f.refId} onChange={(e) => setF({ ...f, refId: e.target.value })} style={{ ...inp, width: 300 }} />
        <input data-f="itemCode" placeholder="품목" value={f.itemCode} onChange={(e) => setF({ ...f, itemCode: e.target.value })} style={{ ...inp, width: 90 }} />
        <select data-f="result" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} style={inp}><option value="pass">합격</option><option value="fail">불합격</option></select>
        <input data-f="memo" placeholder="메모(사진 없이)" value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} style={inp} />
        <button type="button" data-testid="q-save" onClick={() => void inspect()} style={btn}>검수 기록</button>
      </div>}
      <Msg m={msg} />
      <h2 style={{ fontSize: 15 }}>하자 · A/S</h2>
      <table data-testid="q-defects" style={{ borderCollapse: "collapse" }}><tbody>{(data?.defects ?? []).map((d) => <tr key={d.id} data-defect={d.id} data-status={d.status} data-kind={d.kind}>
        <td style={cell}>{d.kind === "as" ? "A/S" : "하자"}</td><td style={cell}>{d.title}</td><td style={cell}><b>{d.status}</b> · {d.log.map((l) => l.status).join(" → ")}</td>
        <td style={cell}>{canEdit && d.status === "open" && <button type="button" data-testid={`q-action-${d.id}`} onClick={() => void adv(d.id, "action")} style={btn}>조치</button>}
          {canEdit && d.status === "action" && <button type="button" data-testid={`q-close-${d.id}`} onClick={() => void adv(d.id, "closed")} style={btn}>닫기</button>}</td></tr>)}</tbody></table>
      <h2 style={{ fontSize: 15 }}>검수 기록(추가만)</h2>
      <table data-testid="q-inspections" style={{ borderCollapse: "collapse" }}><tbody>{(data?.inspections ?? []).map((i) => <tr key={i.id} data-target={i.target} data-result={i.result}>
        <td style={cell}>{i.createdAt.slice(0, 16).replace("T", " ")}</td><td style={cell}>{i.target}</td><td style={cell}>{i.itemCode ?? ""}</td><td style={cell}>{i.result === "pass" ? "합격" : "불합격"}</td><td style={cell}>{i.memo}</td></tr>)}</tbody></table>
    </>
  );
}

/* ───────── p69 모바일 — 승인 · 대화 · 입출고 · 검수 · 공지 ───────── */
export function Mobile({ canEdit, canDecide, isOwner, projects, approvals, today }: {
  canEdit: boolean; canDecide: boolean; isOwner: boolean; today: string;
  projects: { id: string; projectNo: string; name: string }[]; approvals: { id: string; projectNo: string; code: string | null }[];
}) {
  const [tab, setTab] = useState<"approve" | "talk" | "stock" | "inspect" | "notice">("approve");
  // 서버가 그린 승인 목록은 하이드레이션 전에는 눌러도 반응이 없다 — 준비 표지(e2e 가 이것을 기다린다)
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [apv, setApv] = useState(approvals);
  const [pid, setPid] = useState(projects[0]?.id ?? "");
  const [talk, setTalk] = useState(""); const { data: acts, load: loadActs } = useLoad<{ rows: { id: string; date: string; kind: string; content: string }[] }>(pid ? `/api/projects/${pid}/activities` : null);
  const { data: notices, load: loadN } = useLoad<{ rows: { id: string; title: string; body: string; createdAt: string }[] }>("/api/mes/notices");
  const { data: m } = useLoad<Master>("/api/mes/master");
  const [mv, setMv] = useState({ kind: "receipt", itemCode: "", warehouseId: "", qty: "1", unitPrice: "" });
  const [iq, setIq] = useState({ target: "material", refId: "", result: "pass", memo: "" });
  const [nt, setNt] = useState({ title: "", body: "" });
  const tabs: [typeof tab, string][] = [["approve", "승인"], ["talk", "대화"], ["stock", "입출고"], ["inspect", "검수"], ["notice", "공지"]];
  const big: CSSProperties = { ...btn, fontSize: 15, padding: "8px 12px" };
  const field: CSSProperties = { ...inp, fontSize: 15, padding: "6px 8px", width: "100%", boxSizing: "border-box", margin: "3px 0" };
  return (
    <main data-testid="mobile" data-ready={ready ? "1" : "0"} style={{ maxWidth: 430, margin: "0 auto", padding: 12, fontSize: 15 }}>
      <h1 style={{ fontSize: 18, margin: "4px 0 8px" }}>EDIM 모바일 업무</h1>
      <nav style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 10 }}>{tabs.map(([k, l]) =>
        <button key={k} type="button" data-tab={k} aria-pressed={tab === k} onClick={() => { setTab(k); setMsg(null); }} style={{ ...big, padding: "8px 2px", background: tab === k ? "var(--accent)" : "transparent", color: tab === k ? "var(--accent-contrast, #fff)" : "var(--accent)" }}>{l}</button>)}</nav>
      {tab === "approve" && <section data-testid="m-approve">{apv.length === 0 ? <p>승인 대기 없음</p> : apv.map((a) => <div key={a.id} data-approval={a.id} style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 8, marginBottom: 6 }}>
        <b>{a.projectNo}</b> · {a.code ?? "—"}<div style={{ display: "flex", gap: 6, marginTop: 6 }}>{canDecide ? <>
          <button type="button" data-testid={`m-approve-${a.id}`} onClick={async () => { const r = await call(`/api/project-approvals/${a.id}`, "POST", { decision: "approved", note: "모바일 승인" }); setMsg(say(r, "승인했습니다")); if (r.ok) setApv(apv.filter((x) => x.id !== a.id)); }} style={big}>승인</button>
          <button type="button" data-testid={`m-reject-${a.id}`} onClick={async () => { const r = await call(`/api/project-approvals/${a.id}`, "POST", { decision: "rejected", note: "모바일 반려" }); setMsg(say(r, "반려했습니다")); if (r.ok) setApv(apv.filter((x) => x.id !== a.id)); }} style={big}>반려</button></> : <span>승인 권한 없음(owner · engineer)</span>}</div></div>)}</section>}
      {tab === "talk" && <section data-testid="m-talk">
        <select value={pid} onChange={(e) => setPid(e.target.value)} style={field}>{projects.map((p) => <option key={p.id} value={p.id}>{p.projectNo} · {p.name}</option>)}</select>
        {canEdit && <><textarea data-testid="m-talk-input" value={talk} onChange={(e) => setTalk(e.target.value)} placeholder="한 줄 남기기" style={{ ...field, minHeight: 60 }} />
          <button type="button" data-testid="m-talk-send" onClick={async () => { const r = await call(`/api/projects/${pid}/activities`, "POST", { date: today, kind: "etc", content: talk }); setMsg(say(r, "남겼습니다")); if (r.ok) { setTalk(""); await loadActs(); } }} style={big}>남기기</button></>}
        <ul data-testid="m-talk-list">{(acts?.rows ?? []).slice(0, 10).map((x) => <li key={x.id}>{x.date} · {x.content}</li>)}</ul></section>}
      {tab === "stock" && <section data-testid="m-stock">{canEdit && m ? <>
        <select data-f="kind" value={mv.kind} onChange={(e) => setMv({ ...mv, kind: e.target.value })} style={field}><option value="receipt">입고</option><option value="issue">출고</option></select>
        <input data-f="itemCode" placeholder="품목 코드(QR 로도)" value={mv.itemCode} onChange={(e) => setMv({ ...mv, itemCode: e.target.value })} style={field} />
        <select data-f="warehouseId" value={mv.warehouseId} onChange={(e) => setMv({ ...mv, warehouseId: e.target.value })} style={field}><option value="">창고</option>{m.warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select>
        <input data-f="qty" value={mv.qty} onChange={(e) => setMv({ ...mv, qty: e.target.value })} style={field} inputMode="decimal" />
        <input data-f="unitPrice" placeholder="입고 단가" value={mv.unitPrice} onChange={(e) => setMv({ ...mv, unitPrice: e.target.value })} style={field} inputMode="decimal" />
        <button type="button" data-testid="m-stock-save" onClick={async () => { const r = await call("/api/mes/stock", "POST", { ...mv, qty: Number(mv.qty), unitPrice: mv.unitPrice === "" ? null : Number(mv.unitPrice) }); setMsg(say(r, `${mv.kind === "receipt" ? "입고" : "출고"} 기록 · id ${String(r.j.id ?? "")}`)); }} style={big}>기록</button> <Sample /></> : <p>입출고 권한 없음</p>}</section>}
      {tab === "inspect" && <section data-testid="m-inspect">{canEdit ? <>
        <select data-f="target" value={iq.target} onChange={(e) => setIq({ ...iq, target: e.target.value })} style={field}><option value="material">자재 입고</option><option value="product">완성품</option><option value="install">설치완료</option></select>
        <input data-f="refId" placeholder="대상 id" value={iq.refId} onChange={(e) => setIq({ ...iq, refId: e.target.value })} style={field} />
        <select data-f="result" value={iq.result} onChange={(e) => setIq({ ...iq, result: e.target.value })} style={field}><option value="pass">합격</option><option value="fail">불합격</option></select>
        <input data-f="memo" placeholder="메모" value={iq.memo} onChange={(e) => setIq({ ...iq, memo: e.target.value })} style={field} />
        <button type="button" data-testid="m-inspect-save" onClick={async () => { const r = await call("/api/mes/quality", "POST", { kind: "inspection", ...iq }); setMsg(say(r, "검수 기록")); }} style={big}>검수 기록</button></> : <p>검수 권한 없음</p>}</section>}
      {tab === "notice" && <section data-testid="m-notice">{isOwner && <>
        <input data-testid="m-notice-title" placeholder="공지 제목" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} style={field} />
        <textarea data-testid="m-notice-body" value={nt.body} onChange={(e) => setNt({ ...nt, body: e.target.value })} style={{ ...field, minHeight: 50 }} />
        <button type="button" data-testid="m-notice-save" onClick={async () => { const r = await call("/api/mes/notices", "POST", nt); setMsg(say(r, "공지했습니다")); if (r.ok) { setNt({ title: "", body: "" }); await loadN(); } }} style={big}>공지</button></>}
        <ul data-testid="m-notice-list">{(notices?.rows ?? []).map((x) => <li key={x.id}><b>{x.title}</b> — {x.body}</li>)}</ul></section>}
      <Msg m={msg} />
      <p style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 14 }}>증강 현실(p69-6) · 파트너 외부 로그인 — 확장 단계 · 아직 없음</p>
    </main>
  );
}
