"use client";

import { useEffect, useState } from "react";

/**
 * Company Info. 모듈의 P3-a 내용물 — 3계층 중 2층↔3층, 그리고 2층→1층 통로.
 *
 *  (1) User Management (p54 "2. User Management") — owner 가 하부 사용자의 역할을
 *      바꾼다. 마지막 owner 강등은 서버가 거부한다(409).
 *  (2) 플랫폼 요청 — 회사에서 플랫폼으로 올라가는 유일한 통로. 올라가는 종류는
 *      Special 의뢰/문의뿐(Q1 = 좁게). 회사가 자기 코드·표·Macro 를 고치는 일은
 *      여기로 올라오지 않는다 — 회사 관리자 선에서 끝난다.
 */

const ROLES = ["owner", "engineer", "cad", "sales", "viewer"] as const;

interface Member {
  userId: string;
  email: string;
  name: string;
  role: string;
}
interface RequestRow {
  id: string;
  kind: string;
  subject: string;
  state: string;
  decisionNote: string;
}

const STATE_LABEL: Record<string, string> = {
  requested: "대기",
  approved: "승인됨",
  rejected: "반려됨",
};

export function CompanyAdmin({ myRole }: { myRole: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwner = myRole === "owner";

  async function load() {
    const [m, r] = await Promise.all([
      fetch("/api/company/members").then((x) => x.json()),
      fetch("/api/platform-requests").then((x) => x.json()),
    ]);
    setMembers((m.rows ?? []) as Member[]);
    setRequests((r.rows ?? []) as RequestRow[]);
  }
  useEffect(() => {
    void load();
  }, []);

  async function changeRole(userId: string, role: string) {
    setError(null);
    const res = await fetch("/api/company/members", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "변경 실패");
      await load();
      return;
    }
    setMembers((ms) =>
      ms.map((m) => (m.userId === userId ? { ...m, role } : m)),
    );
  }

  async function submitRequest() {
    if (!subject.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/platform-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "special", subject, detail }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "제출 실패");
      return;
    }
    setSubject("");
    setDetail("");
    await load();
  }

  const box: React.CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  };
  const td: React.CSSProperties = {
    padding: "6px 8px",
    borderBottom: "1px solid var(--line)",
  };
  const input: React.CSSProperties = {
    width: "100%",
    padding: 6,
    marginTop: 6,
    background: "transparent",
    color: "var(--ink)",
    border: "1px solid var(--line)",
    borderRadius: 6,
  };

  return (
    <div>
      {error && (
        <p style={{ color: "var(--warn)" }} data-testid="company-error">
          {error}
        </p>
      )}

      <section style={box} data-testid="user-management">
        <h2 style={{ fontSize: 15, marginTop: 0 }}>User Management</h2>
        <p style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
          {isOwner
            ? "회사 관리자(owner)만 역할을 바꿀 수 있습니다. 마지막 owner 는 강등되지 않습니다."
            : "역할 변경은 회사 관리자(owner)만 할 수 있습니다."}
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} data-testid="member-row" data-role={m.role}>
                <td style={td}>{m.name}</td>
                <td
                  style={{
                    ...td,
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink-muted)",
                    fontSize: "var(--fs-13)",
                  }}
                >
                  {m.email}
                </td>
                <td style={td}>
                  {isOwner ? (
                    <select
                      value={m.role}
                      data-testid={`role-${m.email}`}
                      onChange={(e) => void changeRole(m.userId, e.target.value)}
                      style={{
                        background: "transparent",
                        color: "var(--ink)",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: 4,
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    m.role
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={box} data-testid="platform-requests">
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Special 의뢰 · 문의</h2>
        <p style={{ color: "var(--ink-muted)", fontSize: "var(--fs-13)" }}>
          매크로로 안 되는 계산·기능은 플랫폼에 의뢰합니다. 이것이 회사에서
          플랫폼으로 올라가는 유일한 통로입니다.
        </p>
        {isOwner && (
          <div style={{ marginBottom: 12 }}>
            <input
              value={subject}
              data-testid="request-subject"
              onChange={(e) => setSubject(e.target.value)}
              placeholder="제목 (예: 코일 열교환 계산 Special 요청)"
              style={input}
            />
            <input
              value={detail}
              data-testid="request-detail"
              onChange={(e) => setDetail(e.target.value)}
              placeholder="내용"
              style={input}
            />
            <button
              type="button"
              data-testid="request-submit"
              disabled={busy}
              onClick={() => void submitRequest()}
              style={{ marginTop: 8, padding: "6px 14px" }}
            >
              {busy ? "…" : "플랫폼에 의뢰"}
            </button>
          </div>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {requests.map((r) => (
            <li
              key={r.id}
              data-testid="my-request"
              data-state={r.state}
              style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}
            >
              {r.subject}{" "}
              <span
                style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}
                data-testid="my-request-state"
              >
                {STATE_LABEL[r.state] ?? r.state}
              </span>
              {r.decisionNote && (
                <span
                  style={{
                    color: "var(--ink-muted)",
                    fontSize: "var(--fs-13)",
                  }}
                >
                  {" "}
                  — {r.decisionNote}
                </span>
              )}
            </li>
          ))}
          {requests.length === 0 && (
            <li style={{ color: "var(--ink-muted)" }}>올린 의뢰가 없습니다.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
