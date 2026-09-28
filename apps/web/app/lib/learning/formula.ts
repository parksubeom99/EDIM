import { parse, InMemoryProvider, describe as describeMacro } from "@edim/macro-dsl";
import { dryRun, verify } from "@edim/macro-verify";
import type { Candidate, MineRecord } from "./mine";

/**
 * B · ④ verify + 이중 프로젝션의 π_user.
 *
 * 공식은 두 가지 글자로 적는다:
 *   - 학습 쪽(DB①): `Var(LRN, <정렬 이름>)` — 도면에서 뽑은 어휘 그대로. 예) =Var(LRN,casing_height)+2*Var(LRN,base_frame)
 *   - 회사 쪽(DB②, π_user): 회사 런타임이 아는 어휘 `Var(DIM, <기호>)` 로 옮긴 식. 옮길 수 없는 이름이 하나라도 있으면 null.
 * 회사 어휘(DIM) = 매크로 실행 때 등록 치수 표·구획에서 나오는 값(bom-code designFacts):
 *   L 전장(구획 합) · W 전폭 · H 전고 · SECSUM 구획 길이 합 · SECTIONS 구획 수 · LMAX 가장 긴 구획.
 * 투영에서 빠지는 10%: 원천 id · 원천 파일 · 특징 원값 · 원래 이름(raw label) · 출처 — 식 · 목표 · 적합도 요약만 간다.
 */
export const COMPANY_VOCAB: Record<string, string> = {
  overall_length: "L",
  overall_width: "W",
  overall_height: "H",
  section_sum: "SECSUM",
};
export const COMPANY_SYMBOLS = ["L", "W", "H", "SECSUM", "SECTIONS", "COMPONENTS", "LMAX", "LMAXPCT"] as const;

/** 사람이 읽는 이름(한국어) — 역번역 · 로컬 AI 설명 · 화면이 같은 이름을 쓴다 */
const KO: Record<string, string> = {
  overall_length: "전장", overall_width: "전폭", overall_height: "전고", casing_height: "케이싱 높이", base_frame: "프레임 높이",
  section_sum: "구획 길이 합", "code.cap": "용량 코드", "coil.rows": "코일 열수", "coil.fin_pitch": "핀 피치", "coil.depth": "코일 깊이",
};
export function koName(name: string): string {
  const m = /^section\.(.+)\.length$/.exec(name);
  return KO[name] ?? (m ? `${m[1]} 구획 길이` : name);
}

/** DSL 식별자는 [A-Za-z0-9_] — 정렬 이름의 점(.)은 밑줄로 */
export const lrnId = (name: string) => name.replace(/\./g, "_");

const num = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000));

function render(c: Candidate, ref: (name: string) => string | null): string | null {
  const parts: string[] = [];
  for (const t of c.terms) {
    const r = ref(t.name);
    if (!r) return null;
    const abs = Math.abs(t.coef);
    // DSL 의 사칙연산은 우선순위 없이 왼쪽부터다(parser: single precedence) — 곱하는 항은 괄호로 묶는다.
    const term = abs === 1 ? r : parts.length === 0 ? `${num(abs)}*${r}` : `(${num(abs)}*${r})`;
    parts.push(parts.length === 0 ? (t.coef < 0 ? `0-${term}` : term) : `${t.coef < 0 ? "-" : "+"}${term}`);
  }
  if (c.intercept !== 0) parts.push(`${c.intercept < 0 ? "-" : "+"}${num(Math.abs(c.intercept))}`);
  return "=" + parts.join("");
}

export function learnedExpression(c: Candidate): string {
  return render(c, (n) => `Var(LRN,${lrnId(n)})`)!;
}

/** π_user — 회사 어휘로 옮긴 식. 목표도 회사 기호로(없으면 null). */
export function userProjection(c: Candidate): { target: string | null; expression: string | null; missing: string[] } {
  const missing = [c.target, ...c.terms.map((t) => t.name)].filter((n) => !COMPANY_VOCAB[n]);
  return {
    target: COMPANY_VOCAB[c.target] ?? null,
    expression: missing.length ? null : render(c, (n) => `Var(DIM,${COMPANY_VOCAB[n]})`),
    missing,
  };
}

export interface VerifyOutcome { ok: boolean; reason: string; checked: { id: string; want: number; got: number }[] }

/**
 * ④ verify — Macro DSL 파스 · 정적 검사(주소·타입·순환) + 근거 기록 3장으로 시험 실행.
 * 시험 실행은 기록의 특징을 LRN 변수로 넣고 식 값이 그 기록의 목표와 1 mm 안인지 본다.
 */
export function verifyCandidate(c: Candidate, records: MineRecord[], tolerance = 1): VerifyOutcome {
  const expr = learnedExpression(c);
  const parsed = parse(expr);
  if (!parsed.ok) return { ok: false, reason: `파스 실패: ${parsed.error.message}`, checked: [] };
  const diags = verify(expr, { tree: [] }).filter((d) => d.severity === "error");
  if (diags.length) return { ok: false, reason: `검증기: ${diags.map((d) => d.message).join(" · ")}`, checked: [] };
  const good = records.filter((r) => c.support.includes(r.id) && !c.outliers.some((o) => o.id === r.id)).slice(0, 3);
  const checked: VerifyOutcome["checked"] = [];
  for (const r of good) {
    const vars: Record<string, number> = {};
    for (const [k, v] of Object.entries(r.features)) vars[`LRN|${lrnId(k)}`] = v;
    const out = dryRun(parsed.value, new InMemoryProvider({ vars }));
    const got = out.ok && typeof out.value === "number" ? out.value : NaN;
    checked.push({ id: r.id, want: r.features[c.target]!, got });
    if (!(Math.abs(got - r.features[c.target]!) <= tolerance)) return { ok: false, reason: `시험 실행 불일치: ${r.id}`, checked };
  }
  if (checked.length < 3) return { ok: false, reason: "시험 실행할 근거 기록이 3장 미만", checked };
  return { ok: true, reason: "파스 · 정적 검사 · 시험 실행 3장 통과", checked };
}

/** 결정론 역번역(STEP 5 재사용) — 사람이 읽는 설명. 로컬 AI 설명은 따로(있으면 덧붙임). */
export function describeExpression(expr: string, glossary: Record<string, string>): string {
  const p = parse(expr);
  if (!p.ok) return "";
  // 역번역은 "결과 = …" 로 시작한다 — 목표 이름을 앞에 붙여 쓰므로 머리말은 뺀다
  return describeMacro(p.value, { vars: glossary }).text.replace(/^결과\s*=\s*/, "");
}
