"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * F7 · p15 Technical data 목록 — 스냅샷별 Tech Data 문서 모아보기 · 거르기(상태 · 문서번호/코드). 읽기만.
 * 아직 없음: 기술 계산서 수준의 여러 결과값 · 그래프(청사진 p15 의 팬 곡선) — 필요한 입력: 회사 계산서 양식·성능 데이터.
 */
interface Row { id: string; docNo: string; rev: string; status: string; code: string; runId: string; date: string; inputData: { key: string; label: string; unit: string; value: number }[]; output: { name: string; value: number } | null; projectNo: string | null }
const ST: Record<string, string> = { draft: "작성중", review: "검토", approved: "승인", issued: "발행" };
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "5px 10px 5px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "5px 10px 5px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const inp: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 7px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--surface-0)", color: "var(--ink)" };

export function TechdataList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ status: "", q: "" });
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    setReady(false);
    const u = new URLSearchParams();
    if (applied.status) u.set("status", applied.status);
    if (applied.q) u.set("q", applied.q);
    const j = await fetch(`/api/techdata?${u.toString()}`).then((r) => r.json()).catch(() => ({}));
    setRows(j.rows ?? []); setReady(true);
  }, [applied]);
  useEffect(() => { void load(); }, [load]);
  const keys = [...new Map(rows.flatMap((r) => r.inputData.map((i) => [i.key, `${i.label}${i.unit ? ` (${i.unit})` : ""}`] as const))).entries()];

  return (
    <section data-testid="techdata-list" data-ready={ready ? "1" : "0"} data-filter={`${applied.status}|${applied.q}`} style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <select data-testid="td-status" value={status} onChange={(e) => setStatus(e.target.value)} style={inp}>
          <option value="">상태 전체</option>
          {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input data-testid="td-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="문서번호 · 코드" style={{ ...inp, width: 220 }} />
        <button type="button" data-testid="td-apply" onClick={() => { setReady(false); setApplied({ status, q: q.trim() }); }} style={{ fontSize: "var(--fs-12)", fontWeight: 600 }}>거르기</button>
        <span style={{ marginLeft: "auto", fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>{rows.length}건</span>
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th style={th}>문서</th><th style={th}>상태</th><th style={th}>날짜</th><th style={th}>Project</th><th style={th}>코드</th>
          {keys.map(([k, l]) => <th key={k} style={th}>{l}</th>)}<th style={th}>Output</th><th style={th}>스냅샷</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid="td-row" data-status={r.status} data-doc={r.docNo}>
              <td style={td}><a href={`/api/documents/${r.id}/print`} target="_blank" rel="noreferrer" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{r.docNo} Rev {r.rev}</a></td>
              <td style={td}>{ST[r.status] ?? r.status}</td><td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.date}</td>
              <td style={td}>{r.projectNo ?? "—"}</td><td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.code}</td>
              {keys.map(([k]) => { const v = r.inputData.find((i) => i.key === k); return <td key={k} data-key={k} style={{ ...td, fontFamily: "var(--font-mono)" }}>{v ? v.value : "—"}</td>; })}
              <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.output ? `${r.output.name} ${Math.round(r.output.value * 1000) / 1000}` : "—"}</td>
              <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.runId.slice(0, 8)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ready && rows.length === 0 && <p style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>조건에 맞는 Tech Data 가 없습니다.</p>}
      <p style={{ fontSize: 11, color: "var(--ink-muted)" }}>문서 body(스냅샷)를 그대로 보입니다. 아직 없음: 기술 계산서 수준의 여러 결과값·팬 곡선 그래프 — 필요한 입력: 회사 계산서 양식·성능 데이터.</p>
    </section>
  );
}
