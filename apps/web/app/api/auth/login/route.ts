import { NextResponse, type NextRequest } from "next/server";
import {
  authenticate,
  encodeSession,
  SESSION_COOKIE,
  encodePlatformSession,
  PLATFORM_SESSION_COOKIE,
} from "@edim/auth";
import { platformAdminByEmail } from "@edim/db";

/**
 * Dev login. POST { email, tenantSlug? }. The email is the credential in this
 * skeleton (no password yet — a real provider slots in behind authenticate()).
 * On success, sets the signed, httpOnly session cookie.
 *
 * P3-a: 플랫폼 관리자는 멤버십이 없어 authenticate() 가 null 을 준다. 그때만
 * platform.admin_user 를 확인해 **별도 쿠키**로 플랫폼 세션을 발급한다. 테넌트
 * 세션과 쿠키가 다르므로 한쪽 계정이 다른 쪽 화면을 여는 일이 없다.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET not set" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    tenantSlug?: unknown;
  };
  const email = typeof body.email === "string" ? body.email : "";
  const tenantSlug =
    typeof body.tenantSlug === "string" ? body.tenantSlug : undefined;

  const session = await authenticate(email, tenantSlug);
  if (!session) {
    const admin = await platformAdminByEmail(email);
    if (!admin) {
      return NextResponse.json(
        { error: "unknown user or not a member of that tenant" },
        { status: 401 },
      );
    }
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
