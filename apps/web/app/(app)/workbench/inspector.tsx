"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { AttachmentPanel } from "../attachment-panel";
import { localToday } from "@/app/lib/today";
import { useRouter } from "next/navigation";
import { CodeChip } from "@edim/ui";
import { TIER_PREFIX, type ApprovalTier } from "@/app/lib/approval-state";
import type { WorkbenchProject } from "./mainform-shell";

const sec: CSSProperties = { marginBottom: 14 };
const title: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--fs-12)",
  color: "var(--ink-muted)",
  textTransform: "uppercase",
  letterSpacing: ".3px",
  marginBottom: 6,
};
const row: CSSProperties = { fontSize: "var(--fs-13)", display: "grid", gridTemplateColumns: "84px 1fr", gap: "2px 6px" };
const k: CSSProperties = { color: "var(--ink-muted)" };
const btn = (primary = false): CSSProperties => ({
  fontFamily: "var(--font-body)",
  fontSize: "var(--fs-12)",
  color: primary ? "var(--accent-contrast)" : "var(--ink)",
  background: primary ? "var(--accent)" : "var(--surface-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  padding: "4px 10px",
  cursor: "pointer",
});

function Section({ name, children, testid }: { name: string; children: ReactNode; testid?: string }) {
  return (
    <div style={sec} data-testid={testid}>
      <div style={title}>{name}</div>
      {children}
    </div>
  );
}

export function Inspector({
  project,
  code,
  rev,
  canEdit,
  canDecide,
  runId = null,
  nodeStable = null,
}: {
  project: WorkbenchProject | null;
  code: string;
  /** Tier B: revision letter when the shown code equals the saved current revision. */
  rev?: string | null;
  canEdit: boolean;
  canDecide: boolean;
  /** P6 — 방금 돌린 BOM 스냅샷. 승인은 이것에 대해 요청한다. */
  runId?: string | null;
  /** F8 · p18 Data Up-Load — 지금 고른 작업대 노드(프로젝트가 아니어도 된다) */
  nodeStable?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  /** p12·18·50 Schedule management — 할 일 추가(기한 선택). 표는 project_task 로 이미 있던 것이다. */
  async function addTask() {
    if (!project || !taskTitle.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/projects/${project.id}/tasks`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: taskTitle.trim(), ...(taskDue ? { dueAt: `${taskDue}T00:00:00Z` } : {}) }),
    });
    setBusy(false);
    if (r.ok) { setTaskTitle(""); setTaskDue(""); router.refresh(); }
  }

  async function toggleTask(id: string, state: "todo" | "done") {
    setBusy(true);
    const r = await fetch(`/api/project-tasks/${id}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state }),
    });
    setBusy(false);
    if (r.ok) router.refresh();
  }
  const [msg, setMsg] = useState<string | null>(null);

  async function request(tier: ApprovalTier) {
    if (!project) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/projects/${project.id}/approvals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: `${TIER_PREFIX[tier]} · code=${code}`, runId: tier === "platform" ? (project.pipeline.org?.bomRunId ?? runId) : runId }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(res.ok ? `${tier} 승인 요청됨 · BOM ${String(runId ?? "").slice(0, 8)}` : (j.error ?? `실패 (${res.status})`));
    router.refresh();
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    if (!project) return;
    setBusy(true);
    setMsg(null);
    const pending = project.pipeline.pending;
    const tierNote = pending ? TIER_PREFIX[pending.tier] : "";
    const res = await fetch(`/api/project-approvals/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, note: `${tierNote} · ${decision}` }),
    });
    setBusy(false);
    setMsg(res.ok ? `${decision}` : `실패 (${res.status})`);
    router.refresh();
  }

  if (!project) {
    return (
      <div style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
        <Section name="Code">
          <CodeChip code={code || "—"} />{rev ? <span data-testid="code-rev" style={{ marginLeft: 6, fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", color: "var(--accent)" }}>Rev {rev}</span> : null}
          {/* H7 · p47 Coding List — 노드마다 붙은 승인 매크로 개정 목록으로 */}
          <a href="/setup/coding-list" data-testid="inspector-coding-list" style={{ fontSize: "var(--fs-12)", color: "var(--accent)" }}>Coding List (노드별 승인 매크로) →</a>
        </Section>
        <p style={{ margin: 0 }}>프로젝트 노드를 선택하면 Spec · Data Up-Load · Schedule · Approval · Description이 바인딩됩니다.</p>
        {nodeStable && (
          <Section name="Data Up-Load">
            <AttachmentPanel ownerKind="node" ownerKey={nodeStable} kinds={["data", "dwg2d", "dwg3d"]} canEdit={canEdit} title="이 노드의 자료 (p18)" testid="node-upload" />
          </Section>
        )}
      </div>
    );
  }

  const p = project.pipeline;
  return (
    <div data-testid="inspector-bound" data-project={project.id}>
      <Section name="Code">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <CodeChip code={code || "—"} />{rev ? <span data-testid="code-rev" style={{ marginLeft: 6, fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", color: "var(--accent)" }}>Rev {rev}</span> : null}
          {/* H7 · p47 Coding List — 노드마다 붙은 승인 매크로 개정 목록으로 */}
          <a href="/setup/coding-list" data-testid="inspector-coding-list" style={{ fontSize: "var(--fs-12)", color: "var(--accent)" }}>Coding List (노드별 승인 매크로) →</a>
          <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
            item: {project.itemType ?? "—"}
          </span>
        </div>
      </Section>

      <Section name="Spec">
        <div style={row}>
          <span style={k}>No.</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{project.projectNo}</span>
          <span style={k}>Name</span>
          <span>{project.name}</span>
          <span style={k}>Type</span>
          <span>{project.type}</span>
          <span style={k}>Client</span>
          <span>{project.clientName ?? "—"}</span>
          <span style={k}>Stage</span>
          <span>{project.salesStage}</span>
          <span style={k}>Status</span>
          <span>{project.status}</span>
        </div>
      </Section>

      <Section name="Data Up-Load">
        {/* F8 · p18 — 작업대 노드에 자료를 올린다(0025 공용 첨부 · 0014 저장소 재사용). 아래는 프로젝트 접수 자료(p12) */}
        {nodeStable && <AttachmentPanel ownerKind="node" ownerKey={nodeStable} kinds={["data", "dwg2d", "dwg3d"]} canEdit={canEdit} title="이 노드의 자료 (p18)" testid="node-upload" />}
        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 6 }}>프로젝트 접수 자료(p12)</div>
        {project.attachments.length === 0 ? (
          <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>첨부 없음</span>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: "var(--fs-12)" }}>
            {project.attachments.map((a) => (
              <li key={a.id}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{a.docType}</span> {a.name}
                <span style={k}> · {a.department}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* p12·p18·p50 Schedule management — To-do list · Done items · Schedule(기한) · Approval Request List.
          작업대를 떠나지 않고 일정을 잡는다. 데이터는 project_task(이미 있던 표)라 스키마 변경은 없다. */}
      <Section name="Schedule management">
        {canEdit && (
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <input data-testid="task-title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="할 일"
              style={{ flex: 1, minWidth: 0, fontSize: "var(--fs-12)", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface-0)", color: "var(--ink)" }} />
            <input data-testid="task-due" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)}
              style={{ fontSize: "var(--fs-12)", padding: "3px 4px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--surface-0)", color: "var(--ink)" }} />
            <button type="button" data-testid="task-add" disabled={busy || !taskTitle.trim()} onClick={() => void addTask()} style={{ ...btn(), opacity: taskTitle.trim() ? 1 : 0.5 }}>추가</button>
          </div>
        )}
        {(["todo", "done"] as const).map((state) => {
          const list = project.tasks.filter((t) => t.state === state);
          return (
            <div key={state} data-testid={`task-group-${state}`} style={{ marginBottom: 6 }}>
              <div style={{ ...k, fontSize: "var(--fs-12)" }}>{state === "todo" ? "To-do list" : "Done items"} {list.length}</div>
              {list.length === 0 ? (
                <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>{state === "todo" ? "할 일 없음" : "완료 없음"}</span>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "var(--fs-12)" }}>
                  {list.map((t) => {
                    const over = state === "todo" && t.dueAt && t.dueAt.slice(0, 10) < localToday();
                    return (
                      <li key={t.id} data-testid="task-row" data-state={t.state} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        {canEdit && (
                          <button type="button" data-testid={`task-toggle-${t.id}`} disabled={busy}
                            onClick={() => void toggleTask(t.id, state === "todo" ? "done" : "todo")}
                            style={{ ...btn(), padding: "0 5px", fontSize: 11 }}>{state === "todo" ? "완료" : "되돌리기"}</button>
                        )}
                        <span style={{ textDecoration: state === "done" ? "line-through" : "none" }}>{t.title}</span>
                        {t.dueAt && <span style={{ ...k, color: over ? "var(--danger, #b4232a)" : "var(--ink-muted)" }}>· {t.dueAt.slice(0, 10)}{over ? " 지남" : ""}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {/* Approval Request List — 청사진의 같은 상자에 있는 목록. 요청/결정은 아래 Approval 섹션에서 한다. */}
        <div style={{ ...k, fontSize: "var(--fs-12)", marginTop: 4 }}>Approval Request List {project.approvals.length}</div>
        {project.approvals.length === 0 ? (
          <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>요청 없음</span>
        ) : (
          <ul data-testid="approval-request-list" style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "var(--fs-12)" }}>
            {project.approvals.slice(0, 6).map((a) => (
              <li key={a.id}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{a.state}</span>
                {a.bomRunId && <span style={k}> · BOM {a.bomRunId.slice(0, 8)}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section name="Approval" testid="inspector-approval">
        <div style={{ fontSize: "var(--fs-13)", marginBottom: 6 }}>
          현재 단계{" "}
          <span data-testid="pipeline-stage" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
            {p.stage}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {canEdit && p.next === "org" && (
            <button type="button" data-testid="request-org" disabled={busy || !runId} title={runId ? "" : "승인할 BOM 이 없습니다 — 아래 Action Bar 에서 BOM 을 먼저 실행하세요"} style={{ ...btn(true), opacity: runId ? 1 : 0.5 }} onClick={() => request("org")}>
              Check 요청 (조직){runId ? ` · BOM ${runId.slice(0, 8)}` : " — BOM 실행 후"}
            </button>
          )}
          {canEdit && p.next === "platform" && (
            <button type="button" data-testid="request-platform" disabled={busy} style={btn(true)} onClick={() => request("platform")}>
              Accepted 요청 (플랫폼)
            </button>
          )}
          {canDecide && p.pending && (
            <>
              <button type="button" data-testid="approve-btn" disabled={busy} style={btn(true)} onClick={() => decide(p.pending!.id, "approved")}>
                승인
              </button>
              <button type="button" data-testid="reject-btn" disabled={busy} style={btn()} onClick={() => decide(p.pending!.id, "rejected")}>
                반려
              </button>
            </>
          )}
          {p.stage === "Accepted" && (
            <span style={{ fontSize: "var(--fs-12)", color: "var(--accent)" }}>✓ 플랫폼 승인 완료 · 승인된 BOM 은 바뀌지 않습니다</span>
          )}
        </div>
        {(() => {
          // P6: 단계 옆에 **무엇이** 그 단계에 있는지 — 승인(요청)된 BOM 의 코드. 화면의 현재 코드와 다르면 말해 준다.
          const bound = project.approvals.find((a) => a.bomRunId && (a.state === "approved" || a.state === "requested"));
          if (!bound) return null;
          const differs = !!bound.bomCode && !!code && bound.bomCode !== code && !bound.bomCode.startsWith(`${code}-`);
          return (
            <div data-testid="approval-bound" data-differs={differs ? "1" : "0"} style={{ fontSize: "var(--fs-12)", marginTop: 6, lineHeight: 1.5 }}>
              {bound.state === "approved" ? "승인된" : "승인 요청 중인"} BOM <span style={{ fontFamily: "var(--font-mono)" }}>{bound.bomRunId!.slice(0, 8)}</span> · <span style={{ fontFamily: "var(--font-mono)" }}>{bound.bomCode ?? "—"}</span>
              {differs && <div style={{ color: "var(--warn)" }}>지금 화면의 코드({code})는 이 BOM 과 다릅니다 — 승인은 위 BOM 에만 해당합니다.</div>}
            </div>
          );
        })()}
        {msg && <div style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", marginTop: 6 }}>{msg}</div>}
        <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 11, color: "var(--ink-muted)" }}>
          {project.approvals.map((a) => (
            <li key={a.id}>
              {a.requestedAt.slice(0, 10)} · {a.state} · {a.note?.slice(0, 40) ?? ""}{a.bomRunId ? ` · BOM ${a.bomRunId.slice(0, 8)}` : ""}
            </li>
          ))}
        </ul>
      </Section>

      <Section name="Description">
        <textarea
          defaultValue={`${project.name} — ${project.clientName ?? ""} ${project.clientContact ?? ""}`}
          rows={3}
          style={{
            width: "100%",
            fontFamily: "var(--font-body)",
            fontSize: "var(--fs-12)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-0)",
            color: "var(--ink)",
            padding: 6,
            resize: "vertical",
          }}
        />
      </Section>
    </div>
  );
}
