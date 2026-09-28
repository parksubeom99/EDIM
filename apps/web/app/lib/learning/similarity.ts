import { parse, InMemoryProvider } from "@edim/macro-dsl";
import { dryRun, verify } from "@edim/macro-verify";
import { COMPANY_SYMBOLS } from "./formula";

/**
 * B5 · 구조 유사도 계기판 — 투영본(π_user) 중 **DB② 형식에 맞는 비율**. 목표 ≥ 0.90.
 * 한 투영본이 "맞다" = (a) 목표 · 식의 모든 변수가 회사 어휘(DIM 기호)에 있다
 *                    (b) 회사 매크로 검증기(파스 · 정적 검사)와 시험 실행(기준 값)을 통과한다.
 * 계산은 이 파일 한 곳 — 화면 · API · 단위 테스트가 같은 함수를 쓴다.
 */
export interface ProjectionLike { id: string; target: string | null; expression: string | null }
export interface SimilarityResult { matched: number; total: number; ratio: number; goal: number; misses: { id: string; why: string }[] }

export const SIMILARITY_GOAL = 0.9;
/** 시험 실행 기준 값(회사 기호) — 값의 크기가 아니라 "돌아가는가"만 본다 */
const PROBE: Record<string, number> = { L: 4500, W: 2472, H: 2472, SECSUM: 4500, SECTIONS: 5, COMPONENTS: 0, LMAX: 900, LMAXPCT: 20 };

export function matchesCompanyFormat(p: ProjectionLike): string | null {
  if (!p.target || !(COMPANY_SYMBOLS as readonly string[]).includes(p.target)) return "목표가 회사 어휘에 없음";
  if (!p.expression) return "식에 회사 어휘로 옮길 수 없는 이름이 있음";
  const parsed = parse(p.expression);
  if (!parsed.ok) return `파스 실패: ${parsed.error.message}`;
  const errs = verify(p.expression, { tree: [] }).filter((d) => d.severity === "error");
  if (errs.length) return `검증기: ${errs[0]!.message}`;
  const vars: Record<string, number> = {};
  for (const [k, v] of Object.entries(PROBE)) vars[`DIM|${k}`] = v;
  const r = dryRun(parsed.value, new InMemoryProvider({ vars }));
  if (!r.ok) return `시험 실행 실패: ${r.diagnostic?.message ?? ""}`;
  return null;
}

export function similarity(ps: ProjectionLike[]): SimilarityResult {
  const misses = ps.map((p) => ({ id: p.id, why: matchesCompanyFormat(p) })).filter((m): m is { id: string; why: string } => m.why !== null);
  const total = ps.length, matched = total - misses.length;
  return { matched, total, ratio: total ? Math.round((matched / total) * 1000) / 1000 : 0, goal: SIMILARITY_GOAL, misses };
}
