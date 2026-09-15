"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
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

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={sec}>
      <div style={title}>{name}</div>
      {children}
    </div>
  );
}

export function Inspector({
  project,
  code,
  canEdit,
  canDecide,
}: {
  project: WorkbenchProject | null;
  code: string;
  canEdit: boolean;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function request(tier: ApprovalTier) {
    if (!project) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/projects/${project.id}/approvals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: `${TIER_PREFIX[tier]} · code=${code}` }),
    });
    setBusy(false);
    setMsg(res.ok ? `${tier} 승인 요청됨` : `실패 (${res.status})`);
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
          <CodeChip code={code || "—"} />
        </Section>
        <p style={{ margin: 0 }}>프로젝트 노드를 선택하면 Spec · Data Up-Load · Schedule · Approval · Description이 바인딩됩니다.</p>
      </div>
    );
  }

  const p = project.pipeline;
  return (
    <div data-testid="inspector-bound" data-project={project.id}>
      <Section name="Code">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <CodeChip code={code || "—"} />
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

      <Section name="Schedule">
        {project.tasks.length === 0 ? (
          <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>일정 없음</span>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: "var(--fs-12)" }}>
            {project.tasks.map((t) => (
              <li key={t.id} style={{ textDecoration: t.state === "done" ? "line-through" : "none" }}>
                {t.title}
                {t.dueAt && <span style={k}> · {t.dueAt.slice(0, 10)}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section name="Approval">
        <div style={{ fontSize: "var(--fs-13)", marginBottom: 6 }}>
          현재 단계{" "}
          <span data-testid="pipeline-stage" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
            {p.stage}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {canEdit && p.next === "org" && (
            <button type="button" disabled={busy} style={btn(true)} onClick={() => request("org")}>
              Check 요청 (조직)
            </button>
          )}
          {canEdit && p.next === "platform" && (
            <button type="button" disabled={busy} style={btn(true)} onClick={() => request("platform")}>
              Accepted 요청 (플랫폼)
            </button>
          )}
          {canDecide && p.pending && (
            <>
              <button type="button" disabled={busy} style={btn(true)} onClick={() => decide(p.pending!.id, "approved")}>
                승인
              </button>
              <button type="button" disabled={busy} style={btn()} onClick={() => decide(p.pending!.id, "rejected")}>
                반려
              </button>
            </>
          )}
          {p.stage === "Accepted" && (
            <span style={{ fontSize: "var(--fs-12)", color: "var(--accent)" }}>✓ 플랫폼 승인 완료 · 잠금</span>
          )}
        </div>
        {msg && <div style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", marginTop: 6 }}>{msg}</div>}
        <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 11, color: "var(--ink-muted)" }}>
          {project.approvals.map((a) => (
            <li key={a.id}>
              {a.requestedAt.slice(0, 10)} · {a.state} · {a.note?.slice(0, 40) ?? ""}
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
