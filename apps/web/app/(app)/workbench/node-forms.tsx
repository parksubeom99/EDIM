"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { UiSpec } from "@/app/lib/ui-form";
import { UiRun, useCatalog } from "../setup/ui/ui-run";

/**
 * ccmd M · p26 Work Hierarchy 노드별 UI — UI Design 작업장에서 이 노드에 붙인 사용자 UI Form 을 작업대에서 바로 연다.
 * 작업대 Inspector 와 Toolbox 'UI Tool' 탭이 같이 쓴다. Run 은 작업장과 같은 컴포넌트(ui-run.tsx) — 매크로 실행은 **지금 노드**의 승인 매크로.
 */
interface FormRow { id: string; name: string; scope: string; spec: UiSpec }

const btn = (primary = false): CSSProperties => ({ fontSize: "var(--fs-12)", fontWeight: 600, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
  border: primary ? "none" : "1px solid var(--line)", background: primary ? "var(--accent)" : "var(--surface-2)", color: primary ? "var(--accent-contrast)" : "var(--ink)" });

export function NodeForms({ nodeStable, testid = "node-forms" }: { nodeStable: string | null; testid?: string }) {
  const [rows, setRows] = useState<FormRow[] | null>(null);
  const [open, setOpen] = useState<FormRow | null>(null);
  const load = useCallback(async () => {
    const j = (await fetch("/api/ui-forms").then((r) => r.json()).catch(() => ({}))) as { rows?: FormRow[] };
    setRows((j.rows ?? []).filter((f) => !!nodeStable && (f.spec?.nodes ?? []).includes(nodeStable)));
  }, [nodeStable]);
  useEffect(() => { void load(); }, [load]);
  if (!nodeStable) return null;
  return (
    <div data-testid={testid} data-ready={rows ? "1" : "0"} data-count={rows?.length ?? 0} style={{ display: "grid", gap: 4 }}>
      {rows?.length ? rows.map((f) => (
        <div key={f.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: "var(--fs-12)", flex: 1 }}>{f.name} <span style={{ color: "var(--ink-muted)" }}>· {f.scope}</span></span>
          <button type="button" data-testid={`${testid}-open-${f.name}`} onClick={() => setOpen(f)} style={btn(true)}>열기</button>
        </div>
      )) : <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>이 노드에 붙은 UI Form 이 없습니다 — <a href="/setup/ui" style={{ color: "var(--accent)" }}>UI Design</a> 에서 노드를 고르십시오</span>}
      {open && <NodeFormDialog form={open} nodeStable={nodeStable} testid={testid} onClose={() => setOpen(null)} />}
    </div>
  );
}

function NodeFormDialog({ form, nodeStable, testid, onClose }: { form: FormRow; nodeStable: string; testid: string; onClose: () => void }) {
  const { subCodes, codes, ready, reload } = useCatalog();
  return (
    <div role="dialog" aria-label={form.name} data-testid={`${testid}-dialog`} data-ready={ready ? "1" : "0"}
      style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--ink) 35%, transparent)", display: "grid", placeItems: "center", zIndex: 60, padding: 16 }}>
      <div style={{ background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12, display: "grid", gap: 8, maxWidth: "min(880px, 100%)", maxHeight: "100%", overflow: "auto" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <b style={{ fontFamily: "var(--font-display)" }}>{form.name}</b>
          <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>{form.scope} · 이 노드의 UI Form(p26)</span>
          <button type="button" data-testid={`${testid}-close`} onClick={onClose} style={{ ...btn(), marginLeft: "auto" }}>닫기</button>
        </div>
        {ready && <UiRun formId={form.id} spec={form.spec} subCodes={subCodes} codes={codes} nodeStable={nodeStable} onWritten={reload} testid={`${testid}-run`} />}
      </div>
    </div>
  );
}
