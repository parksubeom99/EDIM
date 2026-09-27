"use client";

import type { CSSProperties } from "react";
import type { RunResult } from "./action-bar";

/**
 * F6 · p13 Sub Item list — BOM 스냅샷 줄(Item · Description · Q'ty · Remarks · Info)을 그대로 보인다(다시 계산하지 않음).
 * 개념도에서 구획을 고르면 그 구획의 줄만.
 */
interface Line { no: number; section: string; part: string; spec: string; qty: number; unit: string }
interface Trace { no: number; childCode: string; resolvedCode: string; remarks: string | null }
const th: CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--ink-muted)", fontWeight: 600, padding: "4px 8px 4px 0", borderBottom: "1px solid var(--line)" };
const td: CSSProperties = { fontSize: "var(--fs-12)", padding: "4px 8px 4px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };

export function SubItemList({ runs, section }: { runs: RunResult[]; section: string | null }) {
  const bom = runs.find((r) => r.kind === "bom" && r.runId) as unknown as ({ runId?: string; lines?: Line[]; trace?: Trace[] }) | undefined;
  if (!bom?.lines) return <p data-testid="sub-item-list" data-rows="0" style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", margin: "8px 0 0" }}>Sub Item list — 먼저 BOM Run 을 실행하세요(스냅샷 줄을 보입니다).</p>;
  const tr = new Map((bom.trace ?? []).map((t) => [t.no, t]));
  const rows = bom.lines.filter((l) => !section || l.section === section);
  return (
    <div data-testid="sub-item-list" data-rows={rows.length} data-section={section ?? ""} style={{ marginTop: 10 }}>
      <div style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600, marginBottom: 4 }}>
        Sub Item list (p13) · {section ? `구획 ${section}` : "전체"} {rows.length}줄 · 스냅샷 {String(bom.runId).slice(0, 8)}
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th style={th}>#</th><th style={th}>Item</th><th style={th}>Description</th><th style={{ ...th, textAlign: "right" }}>Q&apos;ty</th><th style={th}>Remarks</th><th style={th}>Info</th></tr></thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.no} data-testid="sub-item-row" data-section={l.section}>
              <td style={td}>{l.no}</td>
              <td style={{ ...td, fontFamily: "var(--font-mono)", color: "var(--accent)", whiteSpace: "nowrap" }}>{tr.get(l.no)?.resolvedCode ?? "—"}</td>
              <td style={td}>{l.part}</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{l.qty} {l.unit}</td>
              <td style={td}>{tr.get(l.no)?.remarks ?? ""}</td>
              <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{l.section} · {l.spec}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
