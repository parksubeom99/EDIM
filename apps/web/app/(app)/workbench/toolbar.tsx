"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { ModuleDef } from "@/app/lib/modules";
import { PIPELINE, stageIndex, type PipelineStage } from "@/app/lib/approval-state";

export type WorkTab = "design" | "bom" | "code" | "macro" | "document";

const TABS: { key: WorkTab; label: string }[] = [
  { key: "design", label: "Design" },
  { key: "bom", label: "BOM" },
  { key: "code", label: "Code Builder" },
  { key: "macro", label: "Macro" },
  { key: "document", label: "Document" },
];

const DEPTS = ["영업", "기술", "설계", "구매", "생산", "품질"];
const CANVAS_CMDS = ["Arrangement", "Move", "Delete", "Add", "DWG", "View", "Free CAD", "설계 심볼", "승인"];

const tier: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 12px",
  borderBottom: "1px solid var(--line)",
};

const chip = (on: boolean): CSSProperties => ({
  fontFamily: "var(--font-body)",
  fontSize: "var(--fs-12)",
  color: on ? "var(--accent-contrast)" : "var(--ink-muted)",
  background: on ? "var(--accent)" : "transparent",
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "2px 9px",
  whiteSpace: "nowrap",
});

export function Toolbar({
  modules,
  stage,
  tab,
  onTab,
  right,
}: {
  modules: ModuleDef[];
  stage: PipelineStage;
  tab: WorkTab;
  onTab: (t: WorkTab) => void;
  right: ReactNode;
}) {
  const primary = modules.filter((m) => ["cpq", "plm", "toolbox", "project"].includes(m.key));
  const idx = stageIndex(stage);

  return (
    <header data-testid="region-toolbar" style={{ background: "var(--surface-1)" }}>
      {/* L1 — global module nav + department chips */}
      <div style={{ ...tier, height: "var(--topbar-h)" }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-16)",
            fontWeight: 600,
            color: "var(--ink)",
            marginRight: 6,
          }}
        >
          EDIM <span style={{ color: "var(--accent)", fontWeight: 500 }}>MainForm</span>
        </span>
        <nav style={{ display: "flex", gap: 2 }}>
          {primary.map((m) => (
            <Link
              key={m.key}
              href={`/m/${m.key}`}
              style={{
                fontSize: "var(--fs-13)",
                color: ["cpq", "plm"].includes(m.key) ? "var(--ink)" : "var(--ink-muted)",
                textDecoration: "none",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {m.label}
            </Link>
          ))}
          <Link
            href="/m/company"
            style={{ fontSize: "var(--fs-13)", color: "var(--ink-muted)", textDecoration: "none", padding: "4px 8px" }}
          >
            ERP
          </Link>
        </nav>
        <span style={{ width: 1, height: 20, background: "var(--line)" }} />
        <div style={{ display: "flex", gap: 4, overflow: "hidden" }}>
          {DEPTS.map((d, i) => (
            <span key={d} style={chip(i === 2)}>
              {d}
            </span>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
      </div>

      {/* L2 — business process bar (approval pipeline) */}
      <div data-testid="process-bar" style={{ ...tier, height: 34, gap: 0 }}>
        <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", marginRight: 10 }}>Process</span>
        {PIPELINE.map((s, i) => {
          const done = i < idx;
          const cur = i === idx;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <span
                data-stage={s}
                data-current={cur ? "true" : undefined}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-12)",
                  padding: "2px 10px",
                  borderRadius: 4,
                  color: cur ? "var(--accent-contrast)" : done ? "var(--accent)" : "var(--ink-muted)",
                  background: cur ? "var(--accent)" : done ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                  border: `1px solid ${cur || done ? "var(--accent)" : "var(--line)"}`,
                }}
              >
                {done ? "✓ " : ""}
                {s}
              </span>
              {i < PIPELINE.length - 1 && (
                <span style={{ color: "var(--ink-muted)", padding: "0 6px", fontSize: 11 }}>→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* L3 — canvas command bar + work tabs */}
      <div style={{ ...tier, height: 34 }}>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              data-tab={t.key}
              onClick={() => onTab(t.key)}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--fs-13)",
                color: tab === t.key ? "var(--ink)" : "var(--ink-muted)",
                background: "transparent",
                border: "none",
                borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 6px" }} />
        <div style={{ display: "flex", gap: 3, overflow: "hidden" }}>
          {CANVAS_CMDS.map((c) => (
            <button
              key={c}
              type="button"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-muted)",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 4,
                padding: "2px 7px",
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
