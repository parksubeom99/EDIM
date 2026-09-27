"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DwgViewer } from "./dwg-viewer";
import { ToolboxWindow, DEFAULT_COMMANDS, type CommandDef } from "./toolbox-window";
import type { HierarchyTreeNode } from "@edim/core-ontology";
import { ThemeToggle } from "@edim/ui";
import type { ModuleDef } from "@/app/lib/modules";
import { assembleCode, RCCS_SLOTS, type SlotDef, type SlotValues } from "@/app/lib/rccs";
import type { PipelineState } from "@/app/lib/approval-state";
import { HierarchyTree } from "../hierarchy-tree";
import { SignOutButton } from "../sign-out-button";
import { Toolbar, type WorkTab, type CanvasCmd } from "./toolbar";
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
  approvals: { id: string; state: string; note: string | null; requestedAt: string; bomRunId: string | null; bomCode: string | null }[];
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
  /** Tier B: saved revision of the selected node (null = never saved). */
  /** P1: slot catalog built from the registered Sub Codes (falls back to samples). */
  slotDefs?: readonly SlotDef[];
  initialSlots?: SlotValues | null;
  initialRev?: { revNo: number; rev: string; code: string } | null;
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
  slotDefs = RCCS_SLOTS,
  initialSlots = null,
  initialRev = null,
}: MainFormShellProps) {
  const [tab, setTab] = useState<WorkTab>("code");
  const [slots, setSlots] = useState<SlotValues>(initialSlots ?? DEFAULT_SLOTS);
  const [rev, setRev] = useState<{ revNo: number; rev: string; code: string } | null>(initialRev);
  const [runs, setRuns] = useState<RunResult[]>([]);
  const assembled = assembleCode(slots, slotDefs);
  /* P2 — EDIM Toolbox: a floating window beside the MainForm. Its command set-up drives the
     Action Bar live, and its Run goes through the Action Bar's own run (runRef). */
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [commands, setCommandsState] = useState<CommandDef[]>(DEFAULT_COMMANDS);
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const runRef = useRef<((kind: string) => void) | null>(null);
  /* p58 — Main Work place Toolbar 명령. 버튼은 명령만 보내고(seq 로 한 번씩), 받는 쪽이 처리한 뒤 비운다. */
  const [canvasCmd, setCanvasCmd] = useState<{ cmd: CanvasCmd; seq: number } | null>(null);
  const [canvasSel, setCanvasSel] = useState<string | null>(null);
  const [canvasMoving, setCanvasMoving] = useState(false);
  const [dwgView, setDwgView] = useState<string | null>(null);   // F6 · DWG View 뷰어
  const sendCmd = (cmd: CanvasCmd) => {
    if (cmd === "approval") {
      const el = document.querySelector<HTMLElement>("[data-testid=inspector-approval]");
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.setAttribute("data-focused", "1");
      el.style.outline = "2px solid var(--accent)";
      el.style.outlineOffset = "4px";
      window.setTimeout(() => { el.removeAttribute("data-focused"); el.style.outline = ""; }, 1500);
      return;
    }
    setTab("design");
    setCanvasCmd((c) => ({ cmd, seq: (c?.seq ?? 0) + 1 }));
  };
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("edim.toolbox.commands.v1");
      if (raw) {
        const saved = JSON.parse(raw) as CommandDef[];
        const known = new Set(DEFAULT_COMMANDS.map((c) => c.kind));
        if (Array.isArray(saved) && saved.length === known.size && saved.every((c) => known.has(c.kind))) setCommandsState(saved);
      }
      if (window.localStorage.getItem("edim.toolbox.open.v1") === "1") setToolboxOpen(true);
    } catch { /* storage unavailable → defaults */ }
  }, []);
  const setCommands = (c: CommandDef[]) => { setCommandsState(c); try { window.localStorage.setItem("edim.toolbox.commands.v1", JSON.stringify(c)); } catch { /* ignore */ } };
  const toggleToolbox = (open: boolean) => { setToolboxOpen(open); try { window.localStorage.setItem("edim.toolbox.open.v1", open ? "1" : "0"); } catch { /* ignore */ } };

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
        onCmd={sendCmd}
        canEdit={canEdit}
        runId={runs.find((r) => r.kind === "bom" && r.runId)?.runId ?? null}
        selected={canvasSel}
        moving={canvasMoving}
        hasProject={!!project}
        onDwgView={setDwgView}
        right={
          <>
            <button
              type="button"
              data-testid="toolbox-toggle"
              aria-pressed={toolboxOpen}
              onClick={() => toggleToolbox(!toolboxOpen)}
              style={{ fontSize: "var(--fs-12)", fontWeight: 600, color: toolboxOpen ? "var(--accent-contrast)" : "var(--accent)", background: toolboxOpen ? "var(--accent)" : "transparent", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", padding: "2px 10px", cursor: "pointer" }}
            >
              Toolbox
            </button>
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
            slotDefs={slotDefs}
            runs={runs}
            nodeStable={selectedNode}
            canEdit={canEdit}
            canDecide={canDecide}
            rev={rev}
            onRev={setRev}
            canvas={{ cmd: canvasCmd, done: () => setCanvasCmd(null), sel: canvasSel, onSel: setCanvasSel, moving: canvasMoving, onMoving: setCanvasMoving }}
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
              rev={rev && rev.code === assembled.code ? rev.rev : null}
              canEdit={canEdit}
              canDecide={canDecide}
              runId={runs.find((r) => r.kind === "bom" && r.runId)?.runId ?? null}
              nodeStable={selectedNode}
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
        nodeStable={selectedNode}
        slots={slots}
        commands={commands}
        runRef={runRef}
        onBusy={setBusyKind}
      />
      {/* ── EDIM Toolbox (floating, outside the 5 regions) ── */}
      <ToolboxWindow
        open={toolboxOpen}
        onClose={() => toggleToolbox(false)}
        commands={commands}
        onCommands={setCommands}
        onRun={(k) => runRef.current?.(k)}
        runs={runs}
        busyKind={busyKind}
        nodeStable={selectedNode}
        canEdit={canEdit}
        canDecide={canDecide}
        runDisabled={!canEdit || !assembled.ok}
      />
      {dwgView && runs.find((r) => r.kind === "bom" && r.runId)?.runId && (
        <DwgViewer runId={runs.find((r) => r.kind === "bom" && r.runId)!.runId!} view={dwgView} onView={setDwgView} onClose={() => setDwgView(null)} />
      )}
    </div>
  );
}
