"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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

/**
 * p58 Main Work place Toolbar — 명령 버튼. 버튼은 일을 직접 하지 않고 **명령만 보낸다**:
 * 편집은 Design 탭의 Arrangement 초안(같은 저장 버튼·같은 API)으로, 승인은 Inspector 의 Approval 로,
 * 도면은 이미 있는 /api/dxf 로 간다. 같은 일을 하는 두 번째 길을 만들지 않기 위해서다.
 */
export type CanvasCmd = "arrangement" | "move" | "delete" | "add" | "copy" | "approval";
export const DWG_VIEWS: [string, string][] = [
  ["plan", "평면도"], ["front", "정면도"], ["right", "우측면도"], ["assembly", "조립도"], ["iso", "3D 등각도"], ["exploded", "분해도"],
];
const EDIT_CMDS: { cmd: CanvasCmd; label: string; needsSel: boolean }[] = [
  { cmd: "move", label: "Move", needsSel: true },
  { cmd: "delete", label: "Delete", needsSel: true },
  { cmd: "add", label: "Add", needsSel: false },
  { cmd: "copy", label: "Copy", needsSel: true },
];
/** 아직 EDIM 안에 없는 것 — 자리만 두고 이유를 적는다(누르면 된다고 착각하지 않게). */
const NOT_YET: [string, string][] = [
  ["Free CAD", "EDIM 안의 CAD 편집기는 아직 없습니다 — 도면은 DWG View 의 DXF 를 외부 CAD(AutoCAD·FreeCAD)에서 여십시오"],
  ["설계 심볼", "설계 심볼 배치(p59)는 아직 없습니다 — 부품 배치는 Arrangement 의 Component 칸에서 합니다"],
];
const cmdBtn = (on: boolean, off: boolean): CSSProperties => ({
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: off ? "var(--line)" : on ? "var(--accent-contrast)" : "var(--ink-muted)",
  background: on ? "var(--accent)" : "var(--surface-2)",
  border: "1px solid var(--line)",
  borderRadius: 4,
  padding: "2px 7px",
  cursor: off ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
});

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
  onCmd,
  canEdit = false,
  runId = null,
  selected = null,
  moving = false,
  hasProject = false,
  onDwgView,
}: {
  modules: ModuleDef[];
  stage: PipelineStage;
  tab: WorkTab;
  onTab: (t: WorkTab) => void;
  right: ReactNode;
  onCmd?: (c: CanvasCmd) => void;
  canEdit?: boolean;
  /** 도면은 BOM 스냅샷에서 나온다 — 스냅샷이 없으면 DWG View 가 잠긴다. */
  runId?: string | null;
  /** Design 개념도에서 고른 구획(Move·Delete·Copy 의 대상). */
  selected?: string | null;
  moving?: boolean;
  hasProject?: boolean;
  /** F6 · DWG View — 도면을 화면에 띄운다(없으면 예전처럼 내려받는다) */
  onDwgView?: (view: string) => void;
}) {
  const primary = modules.filter((m) => ["cpq", "plm", "toolbox", "project"].includes(m.key));
  const idx = stageIndex(stage);
  // 서버 렌더 직후에는 버튼이 보여도 눌러지지 않는다 — 하이드레이션이 끝났다는 표지(e2e 가 이것을 기다린다)
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

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
              href={m.key === "plm" ? "/setup" : `/m/${m.key}`}
              data-nav={m.key}
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
        <div data-testid="canvas-cmds" data-ready={ready ? "1" : "0"} style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
          <button type="button" data-cmd="arrangement" disabled={!canEdit} title={canEdit ? "Design 탭의 Arrangement 편집을 엽니다" : "편집 권한이 없습니다"}
            onClick={() => onCmd?.("arrangement")} style={cmdBtn(false, !canEdit)}>
            Arrangement ▼
          </button>
          {EDIT_CMDS.map(({ cmd, label, needsSel }) => {
            const off = !canEdit || (needsSel && !selected);
            const on = cmd === "move" && moving;
            return (
              <button key={cmd} type="button" data-cmd={cmd} disabled={off} aria-pressed={on || undefined}
                title={!canEdit ? "편집 권한이 없습니다" : off ? "먼저 Design 개념도에서 구획을 고르십시오" : selected ? `대상: ${selected}` : ""}
                onClick={() => onCmd?.(cmd)} style={cmdBtn(on, off)}>
                {label}
              </button>
            );
          })}
          <select data-cmd="dwg-view" value="" disabled={!runId} title={runId ? "BOM 스냅샷의 도면을 화면에 띄웁니다(뷰어 안에서 DXF 내려받기)" : "먼저 BOM Run 을 실행하십시오 — 도면은 BOM 스냅샷에서 나옵니다"}
            onChange={(e) => {
              const t = e.target.value;
              if (!t || !runId) return;
              if (onDwgView) { onDwgView(t); return; }
              const a = document.createElement("a");
              a.href = `/api/dxf?runId=${runId}&type=${t}`;
              a.setAttribute("download", "");
              document.body.appendChild(a); a.click(); a.remove();
            }}
            style={{ ...cmdBtn(false, !runId), padding: "1px 4px" }}>
            <option value="">DWG View ▼</option>
            {DWG_VIEWS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {NOT_YET.map(([label, why]) => (
            <button key={label} type="button" data-cmd-none={label} disabled title={why} style={cmdBtn(false, true)}>{label}</button>
          ))}
          <button type="button" data-cmd="approval" disabled={!hasProject}
            title={hasProject ? "Inspector 의 Approval 로 갑니다 — 요청·결정은 거기서 합니다" : "먼저 Work Hierarchy 에서 프로젝트를 고르십시오"}
            onClick={() => onCmd?.("approval")} style={cmdBtn(false, !hasProject)}>
            승인
          </button>
        </div>
      </div>
    </header>
  );
}
