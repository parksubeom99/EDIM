"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AttachmentPanel } from "../../attachment-panel";

/**
 * p32 · p30 — 자재·구매 코드별 Approval Status(작성중 → 승인 → 사용중지, 역행 금지) · DWG 2D/3D 첨부. 0025.
 * 사용중지 코드에는 새 단가·새 도면을 붙이지 않는다(서버 409). 이미 뜬 BOM 스냅샷은 그대로.
 */
const LABEL: Record<string, string> = { "": "미지정", draft: "작성중", approved: "승인", retired: "사용중지" };
const ORDER = ["draft", "approved", "retired"];
const card: CSSProperties = { background: "var(--surface-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 12, display: "grid", gap: 10 };

export function CodeDocs({ code, canEdit }: { code: string; canEdit: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const j = await fetch(`/api/setup/code-status?code=${encodeURIComponent(code)}`).then((r) => r.json()).catch(() => ({}));
    setStatus(j.status ?? null); setLoaded(true);
  }, [code]);
  useEffect(() => { setLoaded(false); setMsg(null); void load(); }, [load]);
  async function go(to: string) {
    setMsg(null);
    const r = await fetch("/api/setup/code-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, status: to }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setMsg(r.ok ? { ok: true, text: `${code} → ${LABEL[to]}` } : { ok: false, text: `거부 (${r.status}): ${j.error ?? ""}` });
    if (r.ok) await load();
  }
  const cur = status ?? "";
  const next = ORDER.filter((s) => ORDER.indexOf(s) > (cur ? ORDER.indexOf(cur) : -1));
  return (
    <div style={card} data-testid="code-docs">
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 600 }}>Approval Status (p32)</span>
        <span data-testid="code-status" data-status={cur} data-loaded={loaded ? "1" : "0"}
          style={{ fontWeight: 700, fontSize: "var(--fs-12)", color: cur === "approved" ? "var(--accent)" : cur === "retired" ? "var(--warn)" : "var(--ink)" }}>{LABEL[cur]}</span>
        {canEdit && loaded && next.map((s) => (
          <button key={s} type="button" data-testid={`code-status-${s}`} onClick={() => void go(s)} style={{ fontSize: 11 }}>→ {LABEL[s]}</button>
        ))}
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>한 방향만 — 되돌릴 수 없음. 사용중지 코드에는 새 단가·도면을 붙이지 않습니다.</span>
        {msg && <span data-testid="code-status-msg" style={{ fontSize: "var(--fs-12)", color: msg.ok ? "var(--accent)" : "var(--warn)" }}>{msg.text}</span>}
      </div>
      <AttachmentPanel ownerKind="product_code" ownerKey={code} kinds={["dwg2d", "dwg3d"]} canEdit={canEdit} title="DWG (2D / 3D) — Drawing Information" testid="code-dwg"
        disabledReason={cur === "retired" ? "사용중지된 코드 — 새 도면을 붙이지 않습니다" : null} />
    </div>
  );
}
