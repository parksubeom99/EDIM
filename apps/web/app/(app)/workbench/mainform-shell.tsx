"use client";

import { useState, type CSSProperties } from "react";
import type { HierarchyTreeNode } from "@edim/core-ontology";
import { ThemeToggle } from "@edim/ui";
import type { ModuleDef } from "@/app/lib/modules";
import { assembleCode, type SlotValues } from "@/app/lib/rccs";
import type { PipelineState } from "@/app/lib/approval-state";
import { HierarchyTree } from "../hierarchy-tree";
import { SignOutButton } from "../sign-out-button";
import { Toolbar, type WorkTab } from "./toolbar";
import { WorkPlace } from "./work-place";
import { Inspector } from "./inspector";
import { ActionBar, type RunResult } from "./action-bar";

export interface WorkbenchProject {
  id: string;
  projectNo: string;
  name: string;
  type: string;
  clientName: string | null;
  clientContact: string | null;
  itemType: string | null;
  salesStage: string;
  status: string;
  tasks: { id: string; title: string; state: string; dueAt: string | null }[];
  attachments: {
    id: string;
    department: string;
    docType: string;
    name: string;
    description: string | null;
    uploadedAt: string;
  }[];
  approvals: { id: string; state: string; note: string | null; requestedAt: string }[];
  pipeline: PipelineState;
}

export interface MainFormShellProps {
  session: { email: string; role: string; tenantId: string } | null;
  modules: ModuleDef[];
  tree: HierarchyTreeNode[];
  selectedNode: string | null;
  project: WorkbenchProject | null;
  canEdit: boolean;
  canDecide: boolean;
}

const DEFAULT_SLOTS: SlotValues = { A: "EU", B: "55", C: "2123", D: "", E: "", F: "" };

const panelHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: 32,
  padding: "0 10px",
  borderBottom: "1px solid var(--line)",
  fontFamily: "var(--font-display)",
  fontSize: "var(--fs-12)",
  color: "var(--ink-muted)",
  letterSpacing: ".3px",
  textTransform: "uppercase",
};

export function MainFormShell({
  session,
  modules,
  tree,
  selectedNode,
  project,
  canEdit,
  canDecide,
}: MainFormShellProps) {
  const [tab, setTab] = useState<WorkTab>("code");
  const [slots, setSlots] = useState<SlotValues>(DEFAULT_SLOTS);
  const [runs, setRuns] = useState<RunResult[]>([]);
  const assembled = assembleCode(slots);

  return (
    <div
      data-testid="mainform-shell"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100vh",
        background: "var(--surface-0)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* ── Region 1: Toolbar (3 tiers) ── */}
      <Toolbar
        modules={modules}
        stage={project?.pipeline.stage ?? "Design"}
        tab={tab}
        onTab={setTab}
        right={
          <>
            <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
              {session?.email}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--fs-12)",
                color: "var(--accent)",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                borderRadius: "var(--radius-sm)",
                padding: "0 6px",
              }}
            >
              {session?.role}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </>
        }
      />

      {/* ── Body: Hierarchy | Work Place | Inspector ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "var(--rail-w) 1fr var(--inspector-w)",
          minHeight: 0,
        }}
      >
        {/* Region 2: Work Hierarchy */}
        <aside
          data-testid="region-hierarchy"
          style={{
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--line)",
            background: "var(--surface-1)",
            minHeight: 0,
          }}
        >
          <div style={panelHead}>
            <span>Work Hierarchy</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{tree.length} root</span>
          </div>
          <div style={{ overflow: "auto", padding: "8px 6px", flex: 1 }}>
            <HierarchyTree nodes={tree} selected={selectedNode} basePath="/workbench" />
          </div>
          <div
            style={{
              borderTop: "1px solid var(--line)",
              padding: "8px 10px",
              fontSize: "var(--fs-12)",
              color: "var(--ink-muted)",
            }}
          >
            <div style={{ marginBottom: 4 }}>설계 심볼 (p59)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["Fan", "Coil", "Filter", "Damper", "Mixing", "Humid."].map((s) => (
                <span
                  key={s}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    background: "var(--surface-2)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* Region 3: Main / Sub / Key Work Place */}
        <main
          data-testid="region-workplace"
          style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}
        >
          <WorkPlace
            tab={tab}
            project={project}
            slots={slots}
            onSlots={setSlots}
            assembled={assembled}
            runs={runs}
          />
        </main>

        {/* Region 4: Inspector */}
        <aside
          data-testid="region-inspector"
          style={{
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--line)",
            background: "var(--surface-1)",
            minHeight: 0,
          }}
        >
          <div style={panelHead}>
            <span>Inspector</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {project ? project.projectNo : "—"}
            </span>
          </div>
          <div style={{ overflow: "auto", padding: 12, flex: 1 }}>
            <Inspector
              project={project}
              code={assembled.code}
              canEdit={canEdit}
              canDecide={canDecide}
            />
          </div>
        </aside>
      </div>

      {/* ── Region 5: Action Bar ── */}
      <ActionBar
        project={project}
        code={assembled.code}
        codeOk={assembled.ok}
        canEdit={canEdit}
        onResult={(r) => setRuns((xs) => [r, ...xs].slice(0, 20))}
      />
    </div>
  );
}
