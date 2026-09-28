import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * 비밀번호 해시 (p11 · 0032) — Node 내장 scrypt, 외부 의존 0.
 * 저장 형식: `scrypt$N$r$p$<salt base64>$<hash base64>` — 비용 인자를 함께 적어, 나중에 올려도 옛 해시를 읽는다.
 * 비교는 timingSafeEqual(길이가 다르면 곧바로 거짓 — 형식이 틀린 해시).
 */
const N = 16384, R = 8, P = 1, KEYLEN = 32;

export function hashPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const h = scryptSync(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${h.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number) as [number, number, number];
  if (![n, r, p].every((x) => Number.isInteger(x) && x > 0) || n > 1 << 20) return false;
  const salt = Buffer.from(parts[4]!, "base64");
  const want = Buffer.from(parts[5]!, "base64");
  // 길이를 고정한다 — scrypt 출력은 앞부분이 같아서, 잘린 해시를 짧게 다시 재면 맞아 버린다.
  if (salt.length < 8 || want.length !== KEYLEN) return false;
  const got = scryptSync(password.normalize("NFKC"), salt, want.length, { N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** 없는 이메일에도 같은 시간을 쓰게 하는 더미 해시(계정 존재 여부를 응답 시간으로 흘리지 않게). */
const DUMMY = hashPassword("edim-dummy-password", Buffer.alloc(16, 7));
export function burnVerify(password: string): void { verifyPassword(password, DUMMY); }

