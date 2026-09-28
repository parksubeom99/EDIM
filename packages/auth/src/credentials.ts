import { adminPrisma, verifyPassword, burnVerify } from "@edim/db";
import { LoginLimiter } from "./limiter";

/**
 * 비밀번호 판정 (p11 · 0032). 해시가 있는 계정은 비밀번호 필수.
 * 해시가 없는 계정(비밀번호 도입 전)은 devLogin 일 때만 이메일로 통과한다.
 * 없는 이메일도 같은 scrypt 한 번을 태워, 응답 시간으로 계정 존재를 흘리지 않는다.
 */
export async function checkPassword(email: string, password: string, devLogin: boolean): Promise<boolean> {
  const u = await adminPrisma.appUser.findUnique({ where: { email }, select: { passwordHash: true } });
  if (!u) { burnVerify(password); return false; }
  if (!u.passwordHash) { burnVerify(password); return devLogin; }
  return verifyPassword(password, u.passwordHash);
}

/**
 * EDIM_DEV_LOGIN — "1" 이면 비밀번호 없는 계정이 이메일로 들어온다(개발 편의).
 * 설정이 없으면 개발 서버(next dev)는 1, 운영(NODE_ENV=production)은 0.
 */
export function devLoginEnabled(): boolean {
  const v = process.env.EDIM_DEV_LOGIN;
  if (v === "1") return true;
  if (v === "0") return false;
  return process.env.NODE_ENV !== "production";
}

/** 서버 프로세스 하나의 잠금 카운터(개발 서버가 모듈을 다시 읽어도 하나로 남게 globalThis 에 둔다). */
const G = globalThis as unknown as { __edimLoginLimiter?: LoginLimiter };
export const loginLimiter: LoginLimiter = (G.__edimLoginLimiter ??= new LoginLimiter());
