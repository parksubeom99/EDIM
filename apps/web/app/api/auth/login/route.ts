import { NextResponse, type NextRequest } from "next/server";
import {
  authenticate,
  checkPassword,
  devLoginEnabled,
  loginLimiter,
  encodeSession,
  SESSION_COOKIE,
  encodePlatformSession,
  PLATFORM_SESSION_COOKIE,
} from "@edim/auth";
import { platformAdminByEmail } from "@edim/db";

/** 틀린 이유를 가르지 않는 한 문장 — 계정이 있는지 없는지 흘리지 않는다. */
const BAD = "이메일 또는 비밀번호가 맞지 않습니다";

/**
 * 로그인 (p11 · 0032). POST { email, password, tenantSlug? }.
 *  1) 같은 이메일로 10분 안에 5번 틀렸으면 429 (잠시 잠금).
 *  2) 비밀번호 해시가 있는 계정은 비밀번호 필수(scrypt · timingSafeEqual).
 *     해시가 없는 계정은 EDIM_DEV_LOGIN=1 일 때만 이메일로 통과 — 운영 모드 기본값은 0.
 *  3) 통과하면 예전과 같다 — 회사 세션, 멤버십이 없으면 플랫폼 관리자 세션(별도 쿠키).
 * 실패는 모두 401 과 같은 문장이다.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET not set" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
    tenantSlug?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const tenantSlug =
    typeof body.tenantSlug === "string" ? body.tenantSlug : undefined;

  const wait = loginLimiter.locked(email);
  if (wait > 0) {
    return NextResponse.json(
      { error: `로그인을 잠시 막았습니다 — ${Math.ceil(wait / 60000)}분 뒤에 다시 시도하십시오` },
      { status: 429, headers: { "retry-after": String(Math.ceil(wait / 1000)) } },
    );
  }
  if (!email || !(await checkPassword(email, password, devLoginEnabled()))) {
    loginLimiter.fail(email);
    return NextResponse.json({ error: BAD }, { status: 401 });
  }

  const session = await authenticate(email, tenantSlug);
  if (!session) {
    const admin = await platformAdminByEmail(email);
    if (!admin) {
      return NextResponse.json({ error: BAD }, { status: 401 });
    }
    loginLimiter.succeed(email);
    const res = NextResponse.json({ ok: true, platform: true, redirect: "/platform" });
    res.cookies.set(
      PLATFORM_SESSION_COOKIE,
      encodePlatformSession({ userId: admin.userId, email: admin.email }, secret),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    );
    return res;
  }

  loginLimiter.succeed(email);
  const res = NextResponse.json({
    ok: true,
    tenantId: session.tenantId,
    role: session.role,
  });
  res.cookies.set(SESSION_COOKIE, encodeSession(session, secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/** 로그인 화면 · e2e 가 읽는 설정 — 비밀값 없음(개발 로그인이 켜졌는지 · SSO 자리가 보이는지). */
export async function GET() {
  return NextResponse.json({ devLogin: devLoginEnabled(), sso: !!process.env.EDIM_OIDC_ISSUER });
}
