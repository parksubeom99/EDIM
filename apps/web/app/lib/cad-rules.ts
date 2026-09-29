import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseCadRules, type CadRules } from "@edim/bom-code";

/**
 * ccmd K · KC-2 — CAD 규칙서(샘플) 읽기. **BOM Run 마다 파일을 새로 읽는다**(캐시 없음) — 파일만 바꾸면 다음 Run 부터 도면이 바뀐다(코드 수정 0).
 * 찾는 순서:
 *   1) 환경변수 EDIM_CAD_RULES (파일 경로)
 *   2) packages/bom-code/cad-rules/cad-rules.local.json — 회사가 자기 규칙서를 둘 자리(.gitignore · 저장소에 올리지 않는다)
 *   3) packages/bom-code/cad-rules/cad-rules.sample.json — 샘플(저장소)
 * 결과(내용 · 판 · 지문)는 스냅샷 dims.cadRules 에 박힌다 — 도면은 스냅샷만 읽으므로 규칙서를 바꿔도 앞 스냅샷 도면은 그대로다.
 */
export interface CadRulesSnap { version: string; fingerprint: string; file: string; sample: string; rules: CadRules }

function rulesDir(): string | null {
  let d = process.cwd();
  for (let i = 0; i < 6; i++) {
    const c = join(d, "packages", "bom-code", "cad-rules");
    if (existsSync(join(c, "cad-rules.sample.json"))) return c;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}

export function loadCadRules(): { ok: true; snap: CadRulesSnap } | { ok: false; error: string } {
  const env = process.env.EDIM_CAD_RULES;
  const dir = rulesDir();
  const path = env ? resolve(env) : dir ? (existsSync(join(dir, "cad-rules.local.json")) ? join(dir, "cad-rules.local.json") : join(dir, "cad-rules.sample.json")) : null;
  if (!path || !existsSync(path)) return { ok: false, error: `CAD 규칙서를 찾을 수 없습니다${env ? `(EDIM_CAD_RULES=${env})` : ""} — packages/bom-code/cad-rules 확인` };
  let text: string;
  try { text = readFileSync(path, "utf-8"); } catch { return { ok: false, error: `CAD 규칙서를 읽을 수 없습니다: ${basename(path)}` }; }
  let json: unknown;
  try { json = JSON.parse(text); } catch { return { ok: false, error: `CAD 규칙서가 JSON 이 아닙니다: ${basename(path)}` }; }
  const p = parseCadRules(json);
  if (!p.ok) return { ok: false, error: `CAD 규칙서 ${basename(path)} — ${p.error}` };
  // 지문 = 파일 바이트(줄끝을 LF 로 맞춘 뒤)의 sha256 앞 12자
  const fingerprint = createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex").slice(0, 12);
  return { ok: true, snap: { version: p.rules.version, fingerprint, file: basename(path), sample: p.rules.sample, rules: p.rules } };
}
