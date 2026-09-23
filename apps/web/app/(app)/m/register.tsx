"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * 승인 대장 (p55 [EDIM Approval Management]).
 * 청사진의 열 — DOC No. · Version · Status · Released · Title(코드) — 을 문서와 도면을 합쳐 한 표로 본다.
 * 여기서 상태를 바꾸지는 않는다(전이는 Design 탭의 문서·도면 화면에서). 보는 곳과 고치는 곳을 섞지 않는다.
 */

interface Row {
  id: string; kind: "document" | "drawing"; no: string; type: string;
  rev: string; status: string; code: string; bomRunId: string;
  releasedAt: string | null; updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = { draft: "작성중", review: "검토", approved: "승인", issued: "발행" };
const th: CSSProperties = { textAlign: "left", fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600, padding: "6px 10px 6px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-13)", padding: "6px 10px 6px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const mono: CSSProperties = { fontFamily: "var(--font-mono)" };
const chip = (on: boolean): CSSProperties => ({
  fontSize: "var(--fs-12)", padding: "3px 9px", borderRadius: "var(--radius-sm)", cursor: "pointer",
  border: "1px solid var(--line)", background: on ? "var(--accent)" : "var(--surface-2)", color: on ? "#fff" : "var(--ink)",
});
const dt = (s: string | null) => (s ? s.slice(0, 16).replace("T", " ") : "—");

export function Register() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalInKind, setTotalInKind] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (kind) qs.set("kind", kind);
    setBusy(true);
    void fetch(`/api/register?${qs.toString()}`)
      .then((r) => r.json())
      .then((j: { rows?: Row[]; counts?: Record<string, number>; totalInKind?: number }) => {
        setRows(j.rows ?? []); setCounts(j.counts ?? {}); setTotalInKind(j.totalInKind ?? (j.rows?.length ?? 0));
      })
      .finally(() => setBusy(false));
  }, [status, kind]);

  return (
    <section data-testid="register" style={{ marginTop: 14 }}>
      <p style={{ fontSize: "var(--fs-13)", color: "var(--ink-muted)", margin: "0 0 10px" }}>
        문서와 도면을 한 대장으로 본다 — 번호 · 개정 · 상태 · 발행 시각. 상태 전이는 Design 탭의 각 화면에서 한다.
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" data-testid="reg-f-all" onClick={() => setStatus("")} style={chip(status === "")}>전체 {totalInKind}</button>
        {["draft", "review", "approved", "issued"].map((s) => (
          <button key={s} type="button" data-testid={`reg-f-${s}`} onClick={() => setStatus(s)} style={chip(status === s)}>
            {STATUS_LABEL[s]} {counts[s] ?? 0}
          </button>
        ))}
        <span style={{ width: 10 }} />
        <button type="button" data-testid="reg-k-all" onClick={() => setKind("")} style={chip(kind === "")}>문서+도면</button>
        <button type="button" data-testid="reg-k-document" onClick={() => setKind("document")} style={chip(kind === "document")}>문서</button>
        <button type="button" data-testid="reg-k-drawing" onClick={() => setKind("drawing")} style={chip(kind === "drawing")}>도면</button>
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>DOC No.</th><th style={th}>종류</th><th style={th}>Version</th>
            <th style={th}>Status</th><th style={th}>Released</th><th style={th}>Code</th><th style={th}>BOM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid="reg-row" data-kind={r.kind} data-status={r.status}>
              <td style={{ ...td, ...mono, color: "var(--accent)" }}>{r.no}</td>
              <td style={td}>{r.kind === "document" ? "문서" : "도면"} · {r.type}</td>
              <td style={{ ...td, ...mono }}>Rev {r.rev}</td>
              <td style={td}>{STATUS_LABEL[r.status] ?? r.status}</td>
              <td style={{ ...td, ...mono, color: r.releasedAt ? "var(--ink)" : "var(--ink-muted)" }}>{dt(r.releasedAt)}</td>
              <td style={{ ...td, ...mono }}>{r.code}</td>
              <td style={{ ...td, ...mono, color: "var(--ink-muted)" }}>{r.bomRunId.slice(0, 8)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} style={{ ...td, color: "var(--ink-muted)" }}>{busy ? "불러오는 중…" : "해당하는 문서·도면이 없습니다"}</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
