"use client";

import { useEffect, useState } from "react";

/** 로그인 폼. 실패 문장은 하나 — 계정이 있는지 없는지 흘리지 않는다(서버가 같은 문장을 준다). */
export function LoginForm({ sso, next = null }: { sso: boolean; next?: string | null }) {
  const [email, setEmail] = useState("owner@acme.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { redirect?: string; platform?: boolean };
      window.location.href = next && !data.platform ? next : data.redirect ?? "/";
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "이메일 또는 비밀번호가 맞지 않습니다");
    }
  }

  const field = { width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" } as const;
  return (
    <main data-testid="login" data-ready={ready ? "1" : "0"} style={{ maxWidth: 360, margin: "12vh auto", fontFamily: "system-ui", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 4 }}>EDIM</h1>
      <p style={{ color: "#5B6675", marginTop: 0 }}>로그인</p>
      <form onSubmit={submit}>
        <label style={{ display: "block", fontSize: 13 }}>
          이메일
          <input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} autoComplete="username" />
        </label>
        <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
          비밀번호
          <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={field} autoComplete="current-password" />
        </label>
        <button data-testid="login-submit" type="submit" disabled={busy} style={{ marginTop: 12, padding: "8px 16px" }}>
          {busy ? "…" : "sign in"}
        </button>
      </form>
      {sso && (
        <button data-testid="login-sso" type="button" disabled title="고객사 IdP 연결 전 — docs/DEPLOY.md 'SSO 연결 자리'"
          style={{ marginTop: 8, padding: "8px 16px", width: "100%" }}>
          회사 계정(SSO)으로 로그인 — 연결 전
        </button>
      )}
      {error && <p data-testid="login-error" style={{ color: "#B45309" }}>{error}</p>}
      <p style={{ color: "#5B6675", fontSize: 12, marginTop: 24 }}>
        샘플 계정 · 공개 데모용 — 비밀번호 <code>edim-demo-2026</code>
        <br />
        owner@acme.test · viewer@acme.test · owner@globex.test · platform@edim.test
      </p>
    </main>
  );
}
