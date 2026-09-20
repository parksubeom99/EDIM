"use client";

import { useEffect, useState, type CSSProperties, type MutableRefObject } from "react";
import type { CommandDef } from "./toolbox-window";
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
  /** P1: per line — registered child code + p34 resolved code */
  trace?: { no: number; childCode: string; resolvedCode: string }[];
  mainCode?: string;
  /** P4-a — BOM 실행이 남긴 스냅샷 id. 뒤따르는 산출물(EBOM·Cost·도면)의 입력이 된다. */
  runId?: string | null;
  /** P4-a — 등록된 Key Dimension (mm). 화면은 치수를 계산하지 않는다. */
  dims?: { W: number; H: number; L: number; item: string; sections: number } | null;
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
  project,
  code,
  codeOk,
  canEdit,
  onResult,
  nodeStable,
  slots,
  commands,
  runRef,
  onBusy,
}: {
  /** P2: the button set is the Toolbox's "Command button set-up" (order · label · visible). */
  commands?: CommandDef[];
  /** P2: the Toolbox runs THROUGH the Action Bar — one run path, one result stream. */
  runRef?: MutableRefObject<((kind: string) => void) | null>;
  onBusy?: (kind: string | null) => void;
  project: WorkbenchProject | null;
  code: string;
  codeOk: boolean;
  canEdit: boolean;
  onResult: (r: RunResult) => void;
  nodeStable: string | null;
  slots: SlotValues;
}) {
  const [last, setLast] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // P4-a: 가장 최근 BOM 스냅샷. EBOM·Cost·도면은 화면 상태가 아니라 이 id 로 돈다.
  const [runId, setRunId] = useState<string | null>(null);
  const runDisabled = !canEdit || !codeOk;

  async function run(kind: string) {
    if (runDisabled || busy !== null) return;
    setBusy(kind); onBusy?.(kind);
    try {
      const res = await fetch(`/api/run/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // macroValue 는 더 이상 보내지 않는다 — 서버가 승인 매크로를 직접 실행한다.
        body: JSON.stringify({ projectId: project?.id ?? null, code, node: nodeStable, slots, runId }),
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
        trace: body.trace,
        mainCode: body.mainCode,
        runId: body.runId ?? null,
        dims: body.dims ?? null,
      };
      if (kind === "bom" && body.runId) setRunId(body.runId);
      setLast(r);
      onResult(r);
    } finally {
      setBusy(null); onBusy?.(null);
    }
  }

  useEffect(() => { if (runRef) runRef.current = run; });
  const shown = (commands ?? RUNS.map((r) => ({ ...r, visible: true }))).filter((c) => c.visible);

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
      {shown.map((r) => (
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
