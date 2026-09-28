/**
 * learning-test.ts — 0033 B 학습 AI · 이중 프로젝션 DB 검증 (pnpm --filter @edim/db learning:test).
 *
 * 역류 0 을 **앱 코드가 아니라 DB 권한**으로 증명한다(ccmd J B-1):
 *   1. edim_app → platform.learning_* 읽기·쓰기 모두 거부
 *   2. edim_platform → public 업무 표(product_code · bom_code_run) · 착지 표 learned_suggestion 읽기 거부
 *   3. edim_platform 이 착지 표에 직접 INSERT → 거부 · project_formula 함수로는 성공
 *   4. 승인 안 된(proposed) 공식 투영 → 함수가 거절
 *   5. 회사 A 는 회사 B 의 제안 0건(RLS)
 *   6. edim_app 은 제안의 식(expression)을 못 고친다 — 상태만
 */
import { withTenant } from "../src/tenant";
import { adminPrisma, appPrisma, platformDb } from "../src/client";
import { platformCreateJob, platformInsertFormula, platformDecideFormula, platformProjectFormula, listSuggestions, setSuggestionState } from "../src/learning";
import { IDS } from "./seed";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}
async function denied(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch (e) { return /permission denied|권한/i.test(e instanceof Error ? e.message : String(e)); }
}
async function rejectsWith(fn: () => Promise<unknown>, re: RegExp): Promise<boolean> {  // 메시지(영·한)나 SQLSTATE 로 판정
  try { await fn(); return false; } catch (e) { return re.test(e instanceof Error ? e.message : String(e)); }
}

async function main(): Promise<void> {
  // 1) 회사 역할 → DB① 전부 거부
  for (const t of ["learning_source", "learning_job", "learning_step", "learning_feature", "learning_formula", "projection_log"]) {
    check(`edim_app 은 platform.${t} 를 읽지 못한다`, await denied(() => appPrisma.$queryRawUnsafe(`SELECT count(*) FROM platform.${t}`)));
  }
  check("edim_app 은 platform.learning_job 에 쓰지 못한다",
    await denied(() => appPrisma.$executeRawUnsafe(`INSERT INTO platform.learning_job (title, plan, created_by) VALUES ('x', '[]', '${IDS.ownerA}')`)));
  check("edim_app 은 project_formula 를 부르지 못한다",
    await denied(() => appPrisma.$queryRawUnsafe(`SELECT platform.project_formula('00000000-0000-4000-8000-000000000000'::uuid, '${IDS.tenantA}'::uuid)`)));

  // 2) 플랫폼 역할 → 회사 업무 표 · 착지 표 읽기 거부
  for (const t of ["product_code", "bom_code_run", "learned_suggestion"]) {
    check(`edim_platform 은 public.${t} 를 읽지 못한다`, await denied(() => platformDb.$queryRawUnsafe(`SELECT count(*) FROM public.${t}`)));
  }

  // 준비: 작업 1 · 공식 1(proposed)
  const job = await platformCreateJob("learning:test", [{ tool: "mine" }], IDS.platformAdmin);
  const fid = await platformInsertFormula({
    jobId: job, target: "overall_length", expression: "=Var(LRN,section_sum)", userTarget: "L", userExpression: "=Var(DIM,SECSUM)",
    fit: { n: 12, maxAbsErr: 0, rmse: 0, coverage: 1 }, supportSources: 12, outliers: [], verify: { ok: true }, description: "test", localAiNote: null, state: "proposed",
  });

  // 3) 직접 INSERT 거부
  check("edim_platform 은 착지 표에 직접 INSERT 하지 못한다",
    await denied(() => platformDb.$executeRawUnsafe(
      `INSERT INTO public.learned_suggestion (tenant_id, formula_ref, learned_target, learned_expression, fit) VALUES ('${IDS.tenantA}', '${fid}', 'x', '=1', '{}')`)));
  // 4) 미승인 투영 거절
  check("승인 안 된 공식은 함수가 거절한다", await rejectsWith(() => platformProjectFormula(fid, IDS.tenantA, IDS.platformAdmin), /not approved/));
  // 승인 → 함수로 성공
  await platformDecideFormula(fid, "approved", IDS.platformAdmin);
  const sid = await platformProjectFormula(fid, IDS.tenantA, IDS.platformAdmin).catch((e) => String(e));
  check("승인된 공식은 project_formula 로 회사 A 에 1행 투영된다", /^[0-9a-f-]{36}$/.test(sid), sid);
  check("같은 공식을 같은 회사로 두 번 투영하지 않는다", await rejectsWith(() => platformProjectFormula(fid, IDS.tenantA, IDS.platformAdmin), /duplicate|unique|23505|중복/i));
  const log = await platformDb.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM platform.projection_log WHERE formula_id = ${fid}::uuid`;
  check("투영 기록이 1행 남는다", Number(log[0]?.n) === 1);
  check("투영 기록은 플랫폼도 지우지 못한다(쌓기만)", await denied(() => platformDb.$executeRawUnsafe(`DELETE FROM platform.projection_log WHERE formula_id = '${fid}'`)));

  // 5) RLS — A 는 1건, B 는 0건 · 투영본에는 원천 흔적이 없다
  const a = await withTenant(IDS.tenantA, (tx) => listSuggestions(tx));
  const b = await withTenant(IDS.tenantB, (tx) => listSuggestions(tx));
  const mine = a.filter((s) => s.formulaRef === fid);
  check("회사 A 는 제안 1건을 본다", mine.length === 1, String(mine.length));
  check("회사 B 는 A 의 제안을 보지 못한다(0건)", !b.some((s) => s.formulaRef === fid), String(b.length));
  check("투영본에는 식 · 목표 · 적합도 요약만(원천 id · 원래 이름 없음)", !!mine[0] && !JSON.stringify(mine[0]).includes("source") && mine[0].expression === "=Var(DIM,SECSUM)");

  // 6) 회사는 상태만 바꾼다
  check("edim_app 은 제안의 식(expression)을 고치지 못한다",
    await denied(() => withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(`UPDATE learned_suggestion SET expression = '=0' WHERE id = '${sid}'`))));
  check("edim_app 은 제안을 새로 넣지 못한다",
    await denied(() => withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(
      `INSERT INTO learned_suggestion (tenant_id, formula_ref, learned_target, learned_expression, fit) VALUES ('${IDS.tenantA}', '${fid}', 'x', '=1', '{}')`))));
  const upd = await withTenant(IDS.tenantA, (tx) => setSuggestionState(tx, sid, "dismissed", null)).catch(() => -1);
  check("edim_app 은 제안의 상태는 바꾼다(숨기기)", upd === 1, String(upd));
  const updB = await withTenant(IDS.tenantB, (tx) => setSuggestionState(tx, sid, "adopted", null)).catch(() => -1);
  check("회사 B 는 A 의 제안 상태를 못 바꾼다(0행)", updB === 0, String(updB));

  // 정리(소유자 연결) — 착지 표 행은 앱 역할이 지울 수 없으므로 여기서만
  await adminPrisma.$executeRawUnsafe(`DELETE FROM public.learned_suggestion WHERE formula_ref = '${fid}'`);
  await adminPrisma.$executeRawUnsafe(`DELETE FROM platform.learning_job WHERE id = '${job}'`);

  console.log(`\nLEARNING: ${fail === 0 ? "ALL PASS" : "FAIL"} (${pass}/${pass + fail})`);
  if (fail > 0) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
