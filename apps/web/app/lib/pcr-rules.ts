import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parsePcrRules, type PcrRules } from "./pcr";

/**
 * ccmd M · p66 PCR 요율표(샘플) 읽기 — CAD 규칙서(cad-rules.ts)와 같은 자리 규칙. **견적을 만들 때마다 파일을 새로 읽는다**(캐시 없음).
 * 찾는 순서:
 *   1) 환경변수 EDIM_PCR_RULES (파일 경로)
 *   2) packages/bom-code/cost-rules/pcr-rules.local.json — 회사 요율표 자리(.gitignore · 저장소에 올리지 않는다)
 *   3) packages/bom-code/cost-rules/pcr-rules.sample.json — 샘플(저장소)
 * 결과(표 · 판 · 지문)는 견적 문서 body 에 박힌다 — 요율표를 바꿔도 이미 만든 견적은 그대로다.
 */
export interface PcrRulesSnap { fingerprint: string; file: string; rules: PcrRules }

function rulesDir(): string | null {
  let d = process.cwd();
  for (let i = 0; i < 6; i++) {
    const c = join(d, "packages", "bom-code", "cost-rules");
    if (existsSync(join(c, "pcr-rules.sample.json"))) return c;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}

/** 파일이 아예 없으면 missing(견적은 PCR 세부 없이 나간다) · 있는데 틀리면 error(견적 422 — 회사 파일 문제를 숨기지 않는다). */
export function loadPcrRules(): { ok: true; snap: PcrRulesSnap } | { ok: false; missing: true } | { ok: false; missing: false; error: string } {
  const env = process.env.EDIM_PCR_RULES;
  const dir = rulesDir();
  const path = env ? resolve(env) : dir ? (existsSync(join(dir, "pcr-rules.local.json")) ? join(dir, "pcr-rules.local.json") : join(dir, "pcr-rules.sample.json")) : null;
  if (!path || !existsSync(path)) {
    if (env) return { ok: false, missing: false, error: `PCR 요율표를 찾을 수 없습니다(EDIM_PCR_RULES=${env})` };
    return { ok: false, missing: true };
  }
  let text: string;
  try { text = readFileSync(path, "utf-8"); } catch { return { ok: false, missing: false, error: `PCR 요율표를 읽을 수 없습니다: ${basename(path)}` }; }
  let json: unknown;
  try { json = JSON.parse(text); } catch { return { ok: false, missing: false, error: `PCR 요율표가 JSON 이 아닙니다: ${basename(path)}` }; }
  const p = parsePcrRules(json);
  if (!p.ok) return { ok: false, missing: false, error: `PCR 요율표 ${basename(path)} — ${p.error}` };
  const fingerprint = createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex").slice(0, 12);
  return { ok: true, snap: { fingerprint, file: basename(path), rules: p.rules } };
}
