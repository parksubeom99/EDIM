/**
 * special-test.ts — 0034 C Special '팬 선정' DB 검증 (pnpm --filter @edim/db special:test).
 *   1. 회사 계정은 DB① 팬 성능표(platform.fan_curve) · 프로그램 표를 직접 읽지 못한다
 *   2. grant 없는 회사는 후보 함수도 거절 · grant 있으면 함수로 **후보 구간만**(모델·회전수당 한 줄 · 점 2개)
 *   3. 승인 안 된 의뢰로는 grant 가 생기지 않는다 · 회사는 grant 를 직접 넣지 못한다
 *   4. 사용 기록(special_run)은 고치지도 지우지도 못한다(과금 근거) · 다른 회사 기록 0건
 *   5. 플랫폼은 사용 기록의 금액 칸만 — 입력·결과 칸은 못 읽는다 · 회사 자체 팬 표는 권한 0
 *   6. (0035 · ccmd K · KA) BOM Run 에서 나온 사용 기록 = 스냅샷 하나에 한 건(bom_run_id 부분 유일) · 다른 회사 0건 · 플랫폼은 bom_run_id 도 못 읽는다
 */
import { withTenant } from "../src/tenant";
import { adminPrisma, appPrisma, platformDb } from "../src/client";
import { createPlatformRequest, decidePlatformRequest } from "../src/platform";
import { platformGrantSpecial, fanCandidates, insertSpecialRun, listSpecialRuns, listSpecialGrants, specialRunsForBomRun } from "../src/special";
import { saveBomCodeRun } from "../src/code-catalog";
import { IDS } from "./seed";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}
async function denied(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch (e) { return /permission denied|권한|42501|no fan-select grant/i.test(e instanceof Error ? e.message : String(e)); }
}
async function rejects(fn: () => Promise<unknown>, re: RegExp): Promise<boolean> {
  try { await fn(); return false; } catch (e) { return re.test(e instanceof Error ? e.message : String(e)); }
}

async function main(): Promise<void> {
  // 깨끗한 출발 — 이 테스트가 만든 흔적만(두 회사의 fan-select 부여 · 사용 기록)
  await adminPrisma.$executeRawUnsafe(`DELETE FROM public.special_run WHERE program_key = 'fan-select'`);
  await adminPrisma.$executeRawUnsafe(`DELETE FROM public.special_grant WHERE program_key = 'fan-select'`);

  check("회사 계정은 platform.fan_curve 를 읽지 못한다", await denied(() => appPrisma.$queryRawUnsafe(`SELECT count(*) FROM platform.fan_curve`)));
  check("회사 계정은 platform.special_program 을 읽지 못한다", await denied(() => appPrisma.$queryRawUnsafe(`SELECT count(*) FROM platform.special_program`)));
  check("grant 없는 회사는 후보 함수도 거절된다", await denied(() => withTenant(IDS.tenantA, (tx) => fanCandidates(tx, 12000, 600))));

  // 의뢰 → (미승인) 부여 거절 → 승인 → 부여
  const req = await withTenant(IDS.tenantA, (tx) => createPlatformRequest(tx, { kind: "special", subject: "special:test 팬 선정", payload: { program: "fan-select" }, requestedBy: IDS.ownerA }));
  check("승인 안 된 의뢰로는 grant 가 생기지 않는다", await rejects(() => platformGrantSpecial(req.id, "fan-select", IDS.platformAdmin), /not an approved special/));
  check("회사는 grant 를 직접 넣지 못한다",
    await denied(() => withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(
      `INSERT INTO special_grant (tenant_id, program_key, version, title, price_per_run, currency, binding, request_id) VALUES ('${IDS.tenantA}', 'fan-select', 1, 'x', 0, 'KRW', '{}', '${req.id}')`))));
  await decidePlatformRequest({ id: req.id, state: "approved", decidedBy: IDS.platformAdmin });
  const gid = await platformGrantSpecial(req.id, "fan-select", IDS.platformAdmin).catch((e) => String(e));
  check("승인된 의뢰 → grant_special 로 회사 A 에 부여", /^[0-9a-f-]{36}$/.test(gid), gid);
  const ga = await withTenant(IDS.tenantA, (tx) => listSpecialGrants(tx));
  const gb = await withTenant(IDS.tenantB, (tx) => listSpecialGrants(tx));
  check("A 는 부여 1건 · B 는 0건(RLS)", ga.filter((g) => g.programKey === "fan-select").length === 1 && gb.length === 0, `${ga.length}/${gb.length}`);

  // 후보 — 곡선 원자료가 아니라 모델·회전수당 한 줄(구간 끝점 2개)
  const segs = await withTenant(IDS.tenantA, (tx) => fanCandidates(tx, 12000, 600));
  const total = await adminPrisma.$queryRaw<{ n: bigint; c: bigint }[]>`SELECT count(*) AS n, count(DISTINCT (model, rpm)) AS c FROM platform.fan_curve`;
  check("함수는 모델·회전수당 한 줄만 준다(원자료 점 수보다 훨씬 적다)", segs.length === Number(total[0]!.c) && segs.length < Number(total[0]!.n), `${segs.length} / 점 ${total[0]!.n}`);
  check("교점이 있는 곡선은 구간(q1<q2)을 · 없는 곡선은 빈 값", segs.some((s) => s.q1 !== null && s.q2 !== null && s.q1 < s.q2) && segs.every((s) => (s.q1 === null) === (s.q2 === null)));
  const far = await withTenant(IDS.tenantA, (tx) => fanCandidates(tx, 100000, 600));
  check("범위 밖 요구(100,000 CMH)면 모든 곡선이 빈 값", far.every((s) => s.q1 === null), JSON.stringify(far.slice(0, 1)));

  // 사용 기록 — 쓰기만 · 불변
  const rid = await withTenant(IDS.tenantA, (tx) => insertSpecialRun(tx, { tenantId: IDS.tenantA, programKey: "fan-select", version: 1, input: { q: 1 }, result: { ok: true }, bindingSource: "platform", price: 5000, currency: "KRW", createdBy: IDS.ownerA }));
  check("회사는 사용 기록을 고치지 못한다", await denied(() => withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(`UPDATE special_run SET price = 0 WHERE id = '${rid}'`))));
  check("회사는 사용 기록을 지우지 못한다", await denied(() => withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(`DELETE FROM special_run WHERE id = '${rid}'`))));
  const rb = await withTenant(IDS.tenantB, (tx) => listSpecialRuns(tx, "fan-select"));
  check("다른 회사의 사용 기록은 0건", rb.length === 0, String(rb.length));

  // 플랫폼 — 금액 칸만
  const bill = await platformDb.$queryRawUnsafe<{ price: unknown }[]>(`SELECT price FROM public.special_run WHERE id = '${rid}'`);
  check("플랫폼은 사용 기록의 금액을 읽는다(과금)", bill.length === 1 && Number(bill[0]!.price) === 5000);
  check("플랫폼은 사용 기록의 입력·결과를 읽지 못한다", await denied(() => platformDb.$queryRawUnsafe(`SELECT input, result FROM public.special_run`)));
  check("플랫폼은 회사 자체 팬 표를 읽지 못한다", await denied(() => platformDb.$queryRawUnsafe(`SELECT count(*) FROM public.tenant_fan_curve`)));
  check("플랫폼은 부여를 직접 넣지 못한다(함수로만)", await denied(() => platformDb.$executeRawUnsafe(
    `INSERT INTO public.special_grant (tenant_id, program_key, version, title, price_per_run, currency, binding, request_id) VALUES ('${IDS.tenantB}', 'fan-select', 1, 'x', 0, 'KRW', '{}', '${req.id}')`)));

  // 6) 0035 — BOM Run 1회 = 사용 기록 1건(스냅샷에 묶임)
  const bom = await withTenant(IDS.tenantA, (tx) => saveBomCodeRun(tx, {
    stableId: null, code: "SPF-55 (special:test)", slots: { A: "SPF", B: "55" }, macroValue: null, parentCode: "SPF", catalogFp: "special-test",
    lines: [], cost: { total: 0 }, createdBy: IDS.ownerA,
  }));
  const run1 = () => withTenant(IDS.tenantA, (tx) => insertSpecialRun(tx, { tenantId: IDS.tenantA, programKey: "fan-select", version: 1, input: { q_cmh: 12000, p_pa: 600, source: "bom-run" }, result: { ok: true }, bindingSource: "platform", price: 5000, currency: "KRW", createdBy: IDS.ownerA, bomRunId: bom.id }));
  const b1 = await run1();
  check("BOM 스냅샷에 묶인 사용 기록 1건이 들어간다(bom_run_id)", /^[0-9a-f-]{36}$/.test(b1), b1);
  check("같은 BOM 스냅샷으로 두 번 과금되지 않는다(부분 유일 인덱스)", await rejects(run1, /unique|duplicate|23505|special_run_bom_run_key/i));
  const byBomA = await withTenant(IDS.tenantA, (tx) => specialRunsForBomRun(tx, bom.id));
  check("그 스냅샷의 사용 기록 = 정확히 1건 · 금액 5,000", byBomA.length === 1 && byBomA[0]!.price === 5000, JSON.stringify(byBomA));
  const byBomB = await withTenant(IDS.tenantB, (tx) => specialRunsForBomRun(tx, bom.id));
  check("다른 회사는 그 스냅샷의 사용 기록을 0건 본다(RLS)", byBomB.length === 0, String(byBomB.length));
  check("플랫폼은 bom_run_id 칸도 읽지 못한다(금액 칸만)", await denied(() => platformDb.$queryRawUnsafe(`SELECT bom_run_id FROM public.special_run`)));
  check("회사도 BOM 에서 나온 사용 기록을 고치지 못한다", await denied(() => withTenant(IDS.tenantA, (tx) => tx.$executeRawUnsafe(`UPDATE special_run SET bom_run_id = NULL WHERE id = '${b1}'`))));

  // 정리
  await adminPrisma.$executeRawUnsafe(`DELETE FROM public.special_run WHERE program_key = 'fan-select'`);
  await adminPrisma.$executeRawUnsafe(`DELETE FROM public.bom_code_run WHERE id = '${bom.id}'`);
  await adminPrisma.$executeRawUnsafe(`DELETE FROM public.special_grant WHERE program_key = 'fan-select'`);
  await adminPrisma.$executeRawUnsafe(`DELETE FROM public.platform_request WHERE id = '${req.id}'`);

  console.log(`\nSPECIAL: ${fail === 0 ? "ALL PASS" : "FAIL"} (${pass}/${pass + fail})`);
  if (fail > 0) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
