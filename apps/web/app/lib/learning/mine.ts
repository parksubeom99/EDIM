/**
 * B · ③ mine(공식 탐구) — 결정론. 기록(도면 1장 · CSV 1행)마다 정렬된 특징 {이름: 값} 이 있을 때,
 * 목표 y 를 다른 특징 1~2개로 설명하는 식을 찾는다(목표 포함 특징 3개 이하 — 조합 폭발 방지).
 *   형태: y = a·x + b  |  y = a₁·x₁ + a₂·x₂ + b   (최소제곱 → 허용 밖 기록을 빼고 한 번 더 → 계수를 "깔끔한 값"으로 반올림해 봐서 여전히 맞으면 그 값)
 * 합격 기준 — 정확도가 아니라 업무 영향(회장님 문서 '비용 기준 평가지표'):
 *   도면 오차 허용 = 1 mm(제작 공차) · 허용을 넘는 기록 ≤ 5 % · 근거 기록 ≥ 10 · 목표가 있는 기록의 절반 이상을 덮을 것.
 * 같은 특징 묶음(목표 포함)을 이미 설명했으면 다른 목표로 다시 내지 않는다(H = C + 2F 와 C = H − 2F 는 같은 사실).
 * 같은 목표에 합격이 여럿이면 특징이 적은 식 → rmse 작은 식.
 */
export interface MineRecord { id: string; features: Record<string, number> }
export interface FitStats { n: number; maxAbsErr: number; rmse: number; coverage: number; outlierRate: number }
export interface Candidate {
  target: string;
  terms: { name: string; coef: number }[];
  intercept: number;
  fit: FitStats;
  /** 허용(1 mm)을 넘은 기록 — 현장 수정본 같은 어긋남 */
  outliers: { id: string; err: number }[];
  support: string[];
}
export interface MineOptions { tolerance?: number; maxOutlierRate?: number; minSupport?: number; minCoverage?: number; maxCandidates?: number; targets?: string[] }
export interface MineResult { accepted: Candidate[]; tried: number; capped: boolean; rejected: { target: string; terms: string[]; why: string }[] }

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
/** 먼저 설명할 목표(결과 치수) — 나머지는 이름 순 */
export const TARGET_PRIORITY = ["overall_length", "overall_height", "overall_width", "coil.depth"];

/** 최소제곱(정규방정식) — 열 1~2개 + 절편. 특이하면 null. */
function lsq(X: number[][], y: number[]): number[] | null {
  const k = X[0]!.length + 1;
  const A: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  const b: number[] = Array(k).fill(0);
  X.forEach((row, i) => {
    const v = [...row, 1];
    for (let p = 0; p < k; p++) { b[p]! += v[p]! * y[i]!; for (let q = 0; q < k; q++) A[p]![q]! += v[p]! * v[q]!; }
  });
  // 가우스 소거(부분 피벗)
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[piv]![c]!)) piv = r;
    if (Math.abs(A[piv]![c]!) < 1e-9) return null;
    [A[c], A[piv]] = [A[piv]!, A[c]!]; [b[c], b[piv]] = [b[piv]!, b[c]!];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r]![c]! / A[c]![c]!;
      for (let q = c; q < k; q++) A[r]![q]! -= f * A[c]![q]!;
      b[r]! -= f * b[c]!;
    }
  }
  return b.map((v, i) => v / A[i]![i]!);
}

function stats(pred: number[], y: number[], ids: string[], tol: number, total: number) {
  const errs = pred.map((p, i) => p - y[i]!);
  const out = errs.map((e, i) => ({ id: ids[i]!, err: r6(e) })).filter((e) => Math.abs(e.err) > tol);
  const fit: FitStats = {
    n: y.length,
    maxAbsErr: r6(Math.max(...errs.map(Math.abs))),
    rmse: r6(Math.sqrt(errs.reduce((a, e) => a + e * e, 0) / y.length)),
    coverage: r6(y.length / Math.max(total, 1)),
    outlierRate: r6(out.length / y.length),
  };
  return { fit, outliers: out };
}

/** 계수를 깔끔하게: 0.5 단위 · 절편은 정수(0 에 가까우면 0). */
const nice = (c: number) => Math.round(c * 2) / 2;
const niceB = (b: number) => (Math.abs(b) < 0.5 ? 0 : Math.round(b));

export function mineFormulas(records: MineRecord[], opt: MineOptions = {}): MineResult {
  const tol = opt.tolerance ?? 1, maxOut = opt.maxOutlierRate ?? 0.05, minSup = opt.minSupport ?? 10;
  const minCov = opt.minCoverage ?? 0.5, cap = opt.maxCandidates ?? 5000;
  const names = [...new Set(records.flatMap((r) => Object.keys(r.features)))].sort();
  // 목표: 구획 하나하나의 길이는 입력이지 목표가 아니다 · 파생(section_sum)도 목표가 아니다
  // 순서가 뜻을 정한다: 전장·전고처럼 "결과" 치수를 먼저 설명해야 H = C + 2F 가 F = (H − C)/2 보다 먼저 나온다.
  const rank = (n: string) => { const i = TARGET_PRIORITY.indexOf(n); return i < 0 ? 99 : i; };
  const targets = opt.targets ?? names.filter((n) => !n.startsWith("section.") && n !== "section_sum").sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const accepted: Candidate[] = [];
  const rejected: MineResult["rejected"] = [];
  const explained = new Set<string>();
  let tried = 0, capped = false;

  for (const target of targets) {
    const withT = records.filter((r) => target in r.features);
    // 허용 오차보다 충분히 변하지 않는 값은 "설명"할 것이 없다(예: 핀 피치 1.8~3.2 mm 를 1 mm 허용으로 맞히는 것은 공식이 아니다)
    const ty = withT.map((r) => r.features[target]!);
    if (ty.length === 0 || Math.max(...ty) - Math.min(...ty) < 20 * tol) { rejected.push({ target, terms: [], why: `값의 폭이 허용 오차의 20배 미만 — 설명할 변화가 없다` }); continue; }
    const inputs = names.filter((n) => n !== target);
    const combos: string[][] = [...inputs.map((a) => [a])];
    for (let i = 0; i < inputs.length; i++) for (let j = i + 1; j < inputs.length; j++) combos.push([inputs[i]!, inputs[j]!]);
    const passed: Candidate[] = [];
    for (const xs of combos) {
      const key = [target, ...xs].sort().join("|");
      if (explained.has(key)) continue;
      if (tried >= cap) { capped = true; break; }
      tried++;
      const rows = withT.filter((r) => xs.every((x) => x in r.features));
      if (rows.length < minSup || rows.length / Math.max(withT.length, 1) < minCov) continue;
      const X = rows.map((r) => xs.map((x) => r.features[x]!));
      if (xs.some((_, c) => new Set(X.map((v) => v[c])).size < 3)) continue;   // 거의 상수인 입력은 설명이 아니다
      const y = rows.map((r) => r.features[target]!);
      const ids = rows.map((r) => r.id);
      let beta = lsq(X, y);
      if (!beta) continue;
      // 한 번 더 — 허용(1 mm)을 넘는 기록(현장 수정본 같은 어긋남)을 빼고 다시 맞춘다. 판정은 아래에서 **전체** 기록으로 한다.
      {
        const b0 = beta;
        const keep = X.map((row, i) => Math.abs(row.reduce((a, v, c) => a + b0[c]! * v, b0.at(-1)!) - y[i]!) <= tol);
        const inl = keep.filter(Boolean).length;
        if (inl >= minSup && inl < X.length) {
          const b1 = lsq(X.filter((_, i) => keep[i]), y.filter((_, i) => keep[i]));
          if (b1) beta = b1;
        }
      }
      const tryCoef = (coef: number[], b: number) => {
        if (coef.some((c) => Math.abs(c) < 1e-6)) return null;
        const pred = X.map((row) => row.reduce((a, v, c) => a + coef[c]! * v, b));
        return { coef, b, ...stats(pred, y, ids, tol, withT.length) };
      };
      const raw = tryCoef(beta.slice(0, -1), beta.at(-1)!);
      const tidy = tryCoef(beta.slice(0, -1).map(nice), niceB(beta.at(-1)!));
      // 설명력: 어긋남을 뺀 기록에서 R² ≥ 0.99 (상수로 찍는 것보다 확실히 나아야 한다)
      const r2 = (c: NonNullable<typeof raw>) => {
        const ins = y.map((v, i) => [v, i] as const).filter(([, i]) => !c.outliers.some((o) => o.id === ids[i]));
        const mean = ins.reduce((a, [v]) => a + v, 0) / Math.max(ins.length, 1);
        const sst = ins.reduce((a, [v]) => a + (v - mean) ** 2, 0);
        const sse = ins.reduce((a, [v, i]) => a + (X[i]!.reduce((s2, xv, k) => s2 + c.coef[k]! * xv, c.b) - v) ** 2, 0);
        return sst === 0 ? 0 : 1 - sse / sst;
      };
      const pick = [tidy, raw].find((c) => c && c.fit.outlierRate <= maxOut && r2(c) >= 0.99);
      if (!pick) { if (raw && raw.fit.outlierRate <= 0.5) rejected.push({ target, terms: xs, why: `허용 1 mm 밖 ${Math.round(raw.fit.outlierRate * 100)}% > 5%` }); continue; }
      passed.push({
        // 적는 순서: 계수 1 인 항 먼저(사람이 읽는 순서) → 이름 순
        target, terms: xs.map((name, c) => ({ name, coef: r6(pick.coef[c]!) })).sort((p, q) => Number(Math.abs(p.coef) !== 1) - Number(Math.abs(q.coef) !== 1) || p.name.localeCompare(q.name)),
        intercept: r6(pick.b),
        fit: pick.fit, outliers: pick.outliers, support: ids,
      });
    }
    if (capped) break;
    passed.sort((a, b) => a.terms.length - b.terms.length || a.fit.rmse - b.fit.rmse);
    const best = passed[0];
    if (best) {
      accepted.push(best);
      explained.add([best.target, ...best.terms.map((t) => t.name)].sort().join("|"));
    }
  }
  return { accepted, tried, capped, rejected: rejected.slice(0, 50) };
}
