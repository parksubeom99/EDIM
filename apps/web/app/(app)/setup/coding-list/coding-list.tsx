"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { CodingRow } from "@/app/lib/coding-list";

/** H7 · p47 Coding List — 읽기 전용 표. 행의 노드 이름 → 작업대(그 노드)로 이동. */
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 10px 4px 0", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "5px 10px 5px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const mono: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" };

export function CodingList() {
  const [rows, setRows] = useState<CodingRow[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { fetch("/api/macros/coding-list").then((r) => r.json()).then((j) => { setRows(j.rows ?? []); setReady(true); }).catch(() => setReady(true)); }, []);
  const withMacro = rows.filter((r) => r.approved).length;
  return (
    <section data-testid="coding-list" data-ready={ready ? "1" : "0"} style={{ marginTop: 12, background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 12 }}>
      <p style={{ margin: "0 0 8px", fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>노드 {rows.length} · 승인 매크로가 붙은 노드 {withMacro}</p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th style={th}>노드</th><th style={th}>종류</th><th style={th}>승인 매크로</th><th style={th}>Coding (원문)</th><th style={th}>초안 · 반려 · 밀려남</th><th style={th}>마지막 BOM 이 쓴 개정</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.stableId} data-testid={`cl-row-${r.stableId}`} data-approved={r.approved ? String(r.approved.revision) : ""} data-count={r.approvedCount}>
              <td style={{ ...td, paddingLeft: r.depth * 16 }}>
                <Link href={`/workbench?node=${r.stableId}`} data-testid={`cl-open-${r.stableId}`} style={{ color: "var(--accent)" }}>{r.label}</Link>
              </td>
              <td style={{ ...td, color: "var(--ink-muted)" }}>{r.kind}</td>
              <td style={td}>
                {r.approved
                  ? <span style={mono}>r{r.approved.revision}{r.approved.verified ? " · 검증 통과 후 승인" : ""}{r.approved.approvedAt ? ` · ${r.approved.approvedAt.slice(0, 10)}` : ""}</span>
                  : <span style={{ color: "var(--ink-muted)" }}>승인 매크로 없음</span>}
                {r.approvedCount > 1 && <span data-testid="cl-dup" style={{ color: "var(--warn)", marginLeft: 6 }}>승인 {r.approvedCount}개 — 노드당 1개여야 합니다</span>}
              </td>
              <td style={{ ...td, ...mono, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.approved?.dsl ?? ""}>{r.approved?.dsl ?? "—"}</td>
              <td style={{ ...td, ...mono }}>{r.drafts} · {r.rejected} · {r.superseded}</td>
              <td style={td}>
                {r.lastRun
                  ? <span style={{ ...mono, color: r.lastRun.matchesApproved ? "var(--ink)" : "var(--warn)" }}>{r.lastRun.macroRevision === null ? "매크로 없이" : `r${r.lastRun.macroRevision}`}{r.lastRun.matchesApproved ? "" : r.approved ? " — 지금 승인본과 다름" : ""}</span>
                  : <span style={{ color: "var(--ink-muted)" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
