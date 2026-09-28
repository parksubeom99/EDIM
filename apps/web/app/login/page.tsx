import { LoginForm } from "./login-form";

/**
 * 로그인 (p11). 이메일 + 비밀번호. SSO 는 만들지 않는다(고객사 IdP 가 외부 입력) —
 * EDIM_OIDC_ISSUER 가 설정됐을 때만 버튼 자리가 보인다(docs/DEPLOY.md "SSO 연결 자리").
 */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm sso={!!process.env.EDIM_OIDC_ISSUER} />;
}
