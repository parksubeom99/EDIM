import { cookies } from "next/headers";
import {
  decodeSession,
  membershipRole,
  SESSION_COOKIE,
  type SessionData,
} from "@edim/auth";

/**
 * Resolve the current request's session (server-side). Beyond verifying the
 * signed cookie, it re-checks that the user is *still* a member of the session's
 * tenant with the claimed role — so a revoked membership or a tampered tenant
 * can't ride an old cookie. Returns null when unauthenticated/invalid.
 */
export async function getServerSession(): Promise<SessionData | null> {
  // cookies() 를 **먼저** 부른다 — 이 호출이 페이지를 요청마다 그리는(dynamic) 표지다.
  // 비밀값 검사를 앞에 두면, AUTH_SECRET 없이 빌드할 때(배포 킷 docker build) 세션 없는 화면이
  // "로그인으로 보내기" 정적 페이지로 굳는다(2026-09-28 ccmd I STEP 6 실측 — /setup/print 등).
  const store = await cookies();
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = decodeSession(raw, secret);
  if (!session) return null;

  const role = await membershipRole(session.userId, session.tenantId);
  if (!role) return null;

  return { ...session, role };
}
