/**
 * 틀린 비밀번호 잠금 — 같은 이메일로 10분 안에 5번 틀리면 10분 동안 429.
 * 메모리 카운터(서버 한 대 기준). 서버를 여러 대로 늘리면 공유 저장소로 옮겨야 한다(docs/DEPLOY.md).
 */
export const LOCK_MAX = 5;
export const LOCK_WINDOW_MS = 10 * 60 * 1000;
export class LoginLimiter {
  private fails = new Map<string, { n: number; first: number; lockedUntil: number }>();
  constructor(private readonly now: () => number = Date.now) {}
  private key(email: string) { return email.trim().toLowerCase(); }
  /** 잠겨 있으면 남은 ms, 아니면 0 */
  locked(email: string): number {
    const f = this.fails.get(this.key(email));
    if (!f) return 0;
    const t = this.now();
    if (f.lockedUntil > t) return f.lockedUntil - t;
    if (t - f.first > LOCK_WINDOW_MS) this.fails.delete(this.key(email));
    return 0;
  }
  fail(email: string): void {
    const k = this.key(email), t = this.now();
    const f = this.fails.get(k);
    const cur = !f || t - f.first > LOCK_WINDOW_MS ? { n: 0, first: t, lockedUntil: 0 } : f;
    cur.n += 1;
    if (cur.n >= LOCK_MAX) cur.lockedUntil = t + LOCK_WINDOW_MS;
    this.fails.set(k, cur);
    if (this.fails.size > 10000) this.fails.delete(this.fails.keys().next().value!);  // 메모리 상한
  }
  succeed(email: string): void { this.fails.delete(this.key(email)); }
}
