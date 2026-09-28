import { hashPassword, verifyPassword } from "@edim/db";
import { LoginLimiter, LOCK_MAX, LOCK_WINDOW_MS } from "../src/limiter";

/** p11 · 0032 단위: 해시 · 비교 · 잠금. DB 없이 돈다. */
const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  PASS  ${name}`);
  else { console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); failures.push(name); }
}

const h = hashPassword("edim-demo-2026");
check("hash format scrypt$N$r$p$salt$hash", /^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/.test(h), h.slice(0, 30));
check("same password verifies", verifyPassword("edim-demo-2026", h));
check("wrong password does not verify", !verifyPassword("edim-demo-2027", h));
check("empty password does not verify", !verifyPassword("", h));
check("salted: two hashes of the same password differ", hashPassword("edim-demo-2026") !== h);
check("malformed stored hash is false, not a throw", !verifyPassword("x", "plain-text") && !verifyPassword("x", "scrypt$1$1$1$AA$AA"));
check("truncated hash is false", !verifyPassword("edim-demo-2026", h.slice(0, -8)));

let t = 1_000_000;
const lim = new LoginLimiter(() => t);
for (let i = 0; i < LOCK_MAX - 1; i++) lim.fail("A@acme.test");
check("4 failures: not locked yet", lim.locked("a@acme.test") === 0);
lim.fail("a@acme.test");
check("5th failure within 10 min: locked (case-insensitive email)", lim.locked("A@ACME.test") > 0);
check("another email is not locked", lim.locked("b@acme.test") === 0);
t += LOCK_WINDOW_MS + 1;
check("after the lock window: unlocked", lim.locked("a@acme.test") === 0);
lim.fail("c@acme.test"); lim.fail("c@acme.test"); lim.succeed("c@acme.test");
for (let i = 0; i < LOCK_MAX - 1; i++) lim.fail("c@acme.test");
check("success clears the counter", lim.locked("c@acme.test") === 0);
lim.fail("d@acme.test"); t += LOCK_WINDOW_MS + 1;
for (let i = 0; i < LOCK_MAX - 1; i++) lim.fail("d@acme.test");
check("failures older than 10 min do not count", lim.locked("d@acme.test") === 0);

if (failures.length) { console.error(`PASSWORD: FAIL (${failures.length})`); process.exit(1); }
console.log("PASSWORD: PASS");
