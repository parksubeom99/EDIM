import { cookies } from "next/headers";
import {
  decodePlatformSession,
  PLATFORM_SESSION_COOKIE,
  type PlatformSessionData,
} from "@edim/auth";
import { findPlatformAdmin } from "@edim/db";

/**
 * P3-a — 현재 요청의 **플랫폼** 세션. 테넌트 세션(getServerSession)과 완전히
 * 별개다: 쿠키도 다르고, 테넌트·역할도 없다.
 *
 * 서명 검증만으로 끝내지 않고 매 요청마다 platform.admin_user 를 다시 확인한다
 * — 등록이 취소된 뒤 남은 쿠키로 들어오는 것을 막는다(테넌트 쪽 membershipRole
 * 재확인과 같은 이유).
 */
export async function getPlatformSession(): Promise<PlatformSessionData | null> {
  const store = await cookies();   // 먼저 — dynamic 표지(getServerSession 과 같은 이유)
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const raw = store.get(PLATFORM_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = decodePlatformSession(raw, secret);
  if (!session) return null;

  const admin = await findPlatformAdmin(session.userId);
  if (!admin) return null;

  return session;
}
