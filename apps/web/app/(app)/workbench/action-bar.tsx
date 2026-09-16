"use client";

import { useState, type CSSProperties } from "react";
import type { WorkbenchProject } from "./mainform-shell";
import type { SlotValues } from "@/app/lib/rccs";

export interface RunResult {
  kind: string;
  status: string;
  message: string;
  at: string;
  value?: number | number[] | string | null;
  lines?: unknown;
  groups?: unknown;
  cost?: unknown;
}

const RUNS: { kind: "bom" | "edim" | "ebom" | "cost"; label: string }[] = [
  { kind: "bom", label: "BOM Run" },
  { kind: "edim", label: "EDIM Run" },
  { kind: "ebom", label: "EBOM Run" },
  { kind: "cost", label: "Cost" },
];

const btn = (primary: boolean, disabled: boolean): CSSProperties => ({
  fontFamily: "var(--font-body)",
  fontSize: "var(--fs-13)",
  color: primary ? "var(--accent-contrast)" : "var(--ink)",
  background: primary ? "var(--accent)" : "var(--surface-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 12px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

export function ActionBar({
  macroValue,
  project,
  code,
  codeOk,
  canEdit,
  onResult,
  nodeStable,
  slots,
}: {
  project: WorkbenchProject | null;
  code: string;
  codeOk: boolean;
  canEdit: boolean;
  onResult: (r: RunResult) => void;
  nodeStable: string | null;
  slots: SlotValues;
  macroValue: number | null;
}) {
  const [last, setLast] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const runDisabled = !canEdit || !codeOk;

  async function run(kind: string) {
    setBusy(kind);
    try {
      const res = await fetch(`/api/run/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project?.id ?? null, code, node: nodeStable, slots, macroValue }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<RunResult> & { error?: string };
      const r: RunResult = {
        kind,
        status: res.ok ? (body.status ?? "ok") : `HTTP ${res.status}`,
        message: res.ok ? (body.message ?? "") : (body.error ?? "error"),
        at: body.at ?? new Date().toISOString(),
        value: body.value ?? null,
        lines: body.lines,
        groups: body.groups,
        cost: body.cost,
      };
      setLast(r);
      onResult(r);
    } finally {
      setBusy(null);
    }
  }

  return (
    <footer
      data-testid="region-actionbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderTop: "1px solid var(--line)",
        background: "var(--surface-1)",
      }}
    >
      {RUNS.map((r) => (
        <button
          key={r.kind}
          type="button"
          data-run={r.kind}
          disabled={runDisabled || busy !== null}
          style={btn(r.kind === "edim", runDisabled)}
          onClick={() => run(r.kind)}
          title={!canEdit ? "편집 권한 필요" : !codeOk ? "코드 검증 오류" : ""}
        >
          {busy === r.kind ? "…" : r.label}
        </button>
      ))}
      <span style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />
      <a
        data-run="export"
        href={project ? `/api/export?project=${project.id}&code=${encodeURIComponent(code)}` : undefined}
        aria-disabled={!project}
        style={{ ...btn(false, !project), textDecoration: "none", pointerEvents: project ? "auto" : "none" }}
      >
        Export
      </a>
      <button type="button" style={btn(false, false)} onClick={() => window.print()}>
        Print
      </button>
      <span
        data-testid="run-status"
        style={{
          marginLeft: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-12)",
          color: last ? (last.status === "ran" ? "var(--accent)" : "var(--warn)") : "var(--ink-muted)",
        }}
      >
        {last ? `${last.kind.toUpperCase()} · ${last.status} · ${last.message}` : "ready"}
      </span>
    </footer>
  );
}
