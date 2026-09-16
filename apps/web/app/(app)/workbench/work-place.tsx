"use client";

import type { CSSProperties } from "react";
import { CodeChip } from "@edim/ui";
import { RCCS_SLOTS, type SlotValues, type AssembleResult } from "@/app/lib/rccs";
import type { WorkTab } from "./toolbar";
import type { WorkbenchProject } from "./mainform-shell";
import type { RunResult } from "./action-bar";
import { MacroPanel } from "./macro-panel";
import { BomPanel } from "./bom-panel";

const card: CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: 14,
};
const h: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--fs-14)",
  fontWeight: 600,
  margin: "0 0 8px",
};
const muted: CSSProperties = { color: "var(--ink-muted)", fontSize: "var(--fs-12)" };

export function WorkPlace({
  tab,
  project,
  slots,
  onSlots,
  assembled,
  runs,
  nodeStable,
  canEdit,
  canDecide,
}: {
  tab: WorkTab;
  project: WorkbenchProject | null;
  slots: SlotValues;
  onSlots: (s: SlotValues) => void;
  assembled: AssembleResult;
  runs: RunResult[];
  nodeStable: string | null;
  canEdit: boolean;
  canDecide: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateRows: "1fr auto", minHeight: 0, height: "100%" }}>
      {/* Main Work Place */}
      <div style={{ overflow: "auto", padding: 16 }}>
        {!project && (
          <div style={{ ...card, marginBottom: 12, borderStyle: "dashed" }}>
            <div style={h}>프로젝트를 선택하세요</div>
            <p style={{ ...muted, margin: 0 }}>
              좌측 Work Hierarchy에서 프로젝트 노드를 클릭하면 Inspector·승인·Action Bar가 그 프로젝트에 바인딩됩니다.
              Code Builder는 프로젝트 없이도 동작합니다.
            </p>
          </div>
        )}
        {tab === "code" && <CodeBuilder slots={slots} onSlots={onSlots} assembled={assembled} />}
        {tab === "design" && <DesignCanvas code={assembled.code} slots={slots} />}
        {tab === "bom" && <BomPanel code={assembled.code} runs={runs} />}
        {tab === "macro" && <MacroPanel project={project} nodeStable={nodeStable} canEdit={canEdit} canDecide={canDecide} runs={runs} />}
        {tab === "document" && <DocumentPanel project={project} code={assembled.code} />}
      </div>

      {/* Sub / Key Work Place */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderTop: "1px solid var(--line)",
          background: "var(--surface-1)",
          minHeight: 96,
        }}
      >
        <div data-testid="sub-workplace" style={{ padding: "8px 12px", borderRight: "1px solid var(--line)" }}>
          <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>Sub Work Place</div>
          <div style={{ fontSize: "var(--fs-13)" }}>
            현재 코드 <CodeChip code={assembled.code || "—"} />
            <span style={{ ...muted, marginLeft: 8 }}>
              {assembled.ok ? "규칙 검증 통과" : `${assembled.diagnostics.filter((d) => d.severity === "error").length}건 오류`}
            </span>
          </div>
        </div>
        <div data-testid="key-workplace" style={{ padding: "8px 12px" }}>
          <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>Key Work Place · 핵심 치수</div>
          <KeyDims slots={slots} runs={runs} />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Code Builder (A~F) ───────────── */
function CodeBuilder({
  slots,
  onSlots,
  assembled,
}: {
  slots: SlotValues;
  onSlots: (s: SlotValues) => void;
  assembled: AssembleResult;
}) {
  return (
    <div data-testid="code-builder" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={h}>Code Builder · RCCS™ 조립</div>
        <span style={muted}>SubCode → ProductCode → Relationship → Arrangement (p61)</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {RCCS_SLOTS.map((s) => {
          const err = assembled.diagnostics.find((d) => d.slot === s.key);
          return (
            <label key={s.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", marginRight: 6 }}>{s.key}</span>
                {s.name} {s.required && <span style={{ color: "var(--warn)" }}>*</span>}
              </span>
              <select
                data-slot={s.key}
                value={slots[s.key] ?? ""}
                onChange={(e) => onSlots({ ...slots, [s.key]: e.target.value })}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-13)",
                  padding: "6px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${err?.severity === "error" ? "var(--warn)" : "var(--line)"}`,
                  background: "var(--surface-0)",
                  color: "var(--ink)",
                }}
              >
                {s.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: err ? "var(--warn)" : "var(--ink-muted)" }}>
                {err ? err.message : s.hint}
              </span>
            </label>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-1)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={muted}>조립 결과</span>
        <span data-testid="assembled-code" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-20)", color: "var(--accent)" }}>
          {assembled.code || "—"}
        </span>
        <span
          data-testid="assembled-status"
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-12)",
            color: assembled.ok ? "var(--accent)" : "var(--warn)",
          }}
        >
          {assembled.ok ? "VALID" : "INVALID"}
        </span>
      </div>
      {assembled.diagnostics.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "var(--fs-12)" }}>
          {assembled.diagnostics.map((d, i) => (
            <li key={i} style={{ color: d.severity === "error" ? "var(--warn)" : "var(--ink-muted)" }}>
              [{d.severity}] {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Design canvas (SVG, driven by slots) ───────────── */
function DesignCanvas({ code, slots }: { code: string; slots: SlotValues }) {
  const cap = Number(slots.B ?? 0) || 10;
  const w = 320 + Math.min(cap, 60) * 4;
  const hasRotor = slots.D === "630";
  const hasHum = slots.D === "A1";
  const sections = ["Mixing", "Filter", ...(hasRotor ? ["Rotor"] : []), "Coil", ...(hasHum ? ["Humid."] : []), "Fan"];
  const sw = w / sections.length;
  return (
    <div data-testid="design-canvas" style={card}>
      <div style={h}>
        Design · Arrangement <span style={muted}>({code || "—"})</span>
      </div>
      <svg viewBox={`0 0 ${w + 40} 220`} width="100%" style={{ maxWidth: 760, display: "block" }}>
        <rect x="20" y="40" width={w} height="120" rx="6" fill="var(--surface-1)" stroke="var(--ink)" strokeWidth="1.5" />
        {sections.map((s, i) => (
          <g key={s}>
            <rect x={20 + i * sw} y="40" width={sw} height="120" fill="none" stroke="var(--line)" />
            <text x={20 + i * sw + sw / 2} y="105" textAnchor="middle" fontSize="13" fill="var(--ink)" fontFamily="var(--font-body)">
              {s}
            </text>
          </g>
        ))}
        <line x1="20" y1="180" x2={20 + w} y2="180" stroke="var(--accent)" strokeWidth="1" />
        <text x={20 + w / 2} y="200" textAnchor="middle" fontSize="12" fill="var(--accent)" fontFamily="var(--font-mono)">
          L = {Math.round(w * 6.25)} mm · 용량 {slots.B ?? "—"}
        </text>
        <text x="20" y="28" fontSize="12" fill="var(--ink-muted)" fontFamily="var(--font-mono)">
          {slots.A ?? "—"} series {slots.C ?? "—"} {slots.E ? `· ${slots.E}` : ""}
        </text>
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <a
          data-testid="dxf-download"
          href={`/api/dxf?${Object.entries(slots).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join("&")}`}
          style={{ fontSize: "var(--fs-12)", color: "var(--accent-contrast)", background: "var(--accent)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textDecoration: "none" }}
        >
          DXF 다운로드
        </a>
        <span style={muted}>평면 배치도 R12 DXF — AutoCAD·FreeCAD에서 열림 (레이어 OUTLINE/SECTION/DIM/TEXT)</span>
      </div>
    </div>
  );
}

/* ───────────── Document panel ───────────── */
function DocumentPanel({ project, code }: { project: WorkbenchProject | null; code: string }) {
  return (
    <div data-testid="document-panel" style={card}>
      <div style={h}>Document · 기술문서</div>
      <p style={{ ...muted, margin: "0 0 8px" }}>Export는 Action Bar에서 실동(JSON). 기술문서 템플릿은 M3.</p>
      <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px 8px", fontSize: "var(--fs-13)", margin: 0 }}>
        <dt style={muted}>프로젝트</dt>
        <dd style={{ margin: 0 }}>{project ? `${project.projectNo} · ${project.name}` : "—"}</dd>
        <dt style={muted}>고객</dt>
        <dd style={{ margin: 0 }}>{project?.clientName ?? "—"}</dd>
        <dt style={muted}>RCCS 코드</dt>
        <dd style={{ margin: 0 }}>
          <CodeChip code={code || "—"} />
        </dd>
      </dl>
    </div>
  );
}

function KeyDims({ slots, runs }: { slots: SlotValues; runs: RunResult[] }) {
  const last = runs.find((r) => r.kind === "edim" && r.status === "ran");
  const cap = Number(slots.B ?? 0) || 0;
  const dims = [
    ["풍량", cap ? `${cap * 1000} CMH` : "—"],
    ["단면", cap ? `${Math.round(Math.sqrt(cap * 1000 / 2.5) * 10)}×${Math.round(Math.sqrt(cap * 1000 / 2.5) * 8)}` : "—"],
    ["패널", slots.C === "2123" ? "이중 50T" : slots.C === "3110" ? "위생 50T" : "표준 25T"],
    ["매크로 산출", typeof last?.value === "number" ? String(Math.round(last.value * 1000) / 1000) : last?.value != null ? String(last.value) : "—"],
  ];
  return (
    <div style={{ display: "flex", gap: 14, fontSize: "var(--fs-13)" }}>
      {dims.map(([k, v]) => (
        <span key={k}>
          <span style={muted}>{k} </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
        </span>
      ))}
    </div>
  );
}
