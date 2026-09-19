"use client";

import { useState } from "react";

/**
 * 요청 대기열의 결정 UI. 결정은 서버(POST /api/platform/requests)로만 나가고,
 * 그 라우트는 플랫폼 세션이 없으면 401 이다 — 버튼을 숨기는 것이 방어가 아니다.
 */
export interface QueueRow {
  id: string;
  tenantName: string;
  kind: string;
  subject: string;
  detail: string;
  state: string;
  requestedAt: string;
  decisionNote: string;
}

const KIND_LABEL: Record<string, string> = {
  special: "Special 의뢰",
  question: "문의",
};
const STATE_LABEL: Record<string, string> = {
  requested: "대기",
  approved: "승인됨",
  rejected: "반려됨",
};

export function RequestQueue({ initial }: { initial: QueueRow[] }) {
  const [rows, setRows] = useState<QueueRow[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function decide(id: string, state: "approved" | "rejected") {
    setBusy(id);
    setError(null);
    const res = await fetch("/api/platform/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, state, note }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "결정 실패");
      return;
    }
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, state, decisionNote: note } : r)),
    );
    setNote("");
  }

  if (rows.length === 0)
    return (
      <p style={{ color: "var(--ink-muted)" }} data-testid="queue-empty">
        올라온 요청이 없습니다.
      </p>
    );

  return (
    <div data-testid="request-queue">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="결정 메모 (선택)"
        data-testid="decision-note"
        style={{
          width: "100%",
          padding: 6,
          marginBottom: 8,
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: 6,
        }}
      />
      {error && <p style={{ color: "var(--warn)" }}>{error}</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map((r) => (
          <li
            key={r.id}
            data-testid="request-row"
            data-state={r.state}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              gap: 12,
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                fontSize: "var(--fs-13)",
              }}
            >
              {r.tenantName}
            </span>
            <span style={{ flex: 1 }}>
              [{KIND_LABEL[r.kind] ?? r.kind}] {r.subject}
              {r.detail && (
                <span
                  style={{
                    display: "block",
                    color: "var(--ink-muted)",
                    fontSize: "var(--fs-13)",
                  }}
                >
                  {r.detail}
                </span>
              )}
            </span>
            <span
              style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}
            >
              {r.requestedAt}
            </span>
            {r.state === "requested" ? (
              <>
                <button
                  type="button"
                  data-testid="approve"
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "approved")}
                >
                  승인
                </button>
                <button
                  type="button"
                  data-testid="reject"
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "rejected")}
                >
                  반려
                </button>
              </>
            ) : (
              <span data-testid="request-state">{STATE_LABEL[r.state] ?? r.state}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
