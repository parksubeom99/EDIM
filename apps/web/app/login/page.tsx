import { LoginForm } from "./login-form";

/**
 * 로그인 (p11). 이메일 + 비밀번호. SSO 는 만들지 않는다(고객사 IdP 가 외부 입력) —
 * EDIM_OIDC_ISSUER 가 설정됐을 때만 버튼 자리가 보인다(docs/DEPLOY.md "SSO 연결 자리").
 */
export const dynamic = "force-dynamic";

/** ccmd L · LA7 — ?next= 는 같은 사이트의 상대 경로만(열린 리다이렉트 금지 — "//" · 스킴 거부). QR 페이지(/q/{토큰})가 로그인 뒤 돌아오려고 쓴다. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const n = (await searchParams).next;
  const next = typeof n === "string" && /^\/(?!\/)[A-Za-z0-9/_\-.?=&%]*$/.test(n) ? n : null;
  return <LoginForm sso={!!process.env.EDIM_OIDC_ISSUER} next={next} />;
}
