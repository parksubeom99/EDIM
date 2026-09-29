/**
 * consulting-test.ts — 0037 · ccmd K · KB-2 익명 · 집계 벤치마킹 DB 검증 (pnpm --filter @edim/db consulting:test).
 *   1. 함수 결과에 회사 id · 회사 이름 칸이 없다(집계 숫자만) · 인자는 지표 하나뿐(다른 회사를 지정할 수 없다)
 *   2. 표본 ≥ 3 이면 분포 · 우리 값 · 백분위 / 표본 2곳이면 suppressed = true · 분포 NULL(k-익명 하한)
 *   3. edim_app 이 함수 밖에서 다른 회사 스냅샷을 읽으면 0건(RLS 그대로) · 표본 표도 못 읽는다
 *   4. edim_platform 은 함수 EXECUTE 없음 · 회사 업무 표 읽기 거부(기존 단언 유지)
 *   5. 테넌트 컨텍스트 없이 부르면 거부 · 모르는 지표 거부
 */
import { withTenant } from "../src/tenant";
import { adminPrisma, appPrisma, platformDb } from "../src/client";
import { saveBomCodeRun } from "../src/code-catalog";
import { seedBench } from "./seed-bench";
import { IDS } from "./seed";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}
async function err(fn: () => Promise<unknown>): Promise<string | null> {
  try { await fn(); return null; } catch (e) { return e instanceof Error ? e.message : String(e); }
}
type Row = Record<string, unknown>;
const call = (tenant: string, metric: string) =>
  withTenant(tenant, (tx) => tx.$queryRawUnsafe<Row[]>(`SELECT * FROM public.benchmark_metrics($1)`, metric)).then((r) => r[0]!);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function main(): Promise<void> {
  await seedBench(3);
  // 회사 A 의 최신 스냅샷 = Special 선정이 박힌 스냅샷(η 0.736 · 12,000 CMH · 원가 17,000,000)
  const run = await withTenant(IDS.tenantA, (tx) => saveBomCodeRun(tx, {
    stableId: null, code: "SPF-55-TEST", slots: { A: "SPF", B: "55" }, macroValue: null, parentCode: "SPF", catalogFp: "consulting-test",
    lines: [], cost: { total: 17000000, material: 13000000, labor: 2340000, currency: "KRW" },
    dims: { W: 2472, H: 2472, L: 900, item: "55", special: { input: { q_cmh: 12000, p_pa: 600 }, result: { model: "X", rpm: 1, eta: 0.736 } } },
    createdBy: IDS.ownerA,
  }));

  const r = await call(IDS.tenantA, "fan_eta");
  check("함수 결과 칸 = 지표 · n · p25 · p50 · p75 · 우리 값 · 백분위 · 숨김 — 회사 id · 이름 칸 없음",
    JSON.stringify(Object.keys(r).sort()) === JSON.stringify(["metric_key", "my_percentile", "my_value", "n_tenants", "p25", "p50", "p75", "suppressed"]), Object.keys(r).join(","));
  const args = await adminPrisma.$queryRawUnsafe<{ n: number }[]>(`SELECT pronargs::int AS n FROM pg_proc WHERE proname = 'benchmark_metrics'`);
  check("인자는 지표 하나뿐 — 다른 회사를 인자로 지정할 수 없다", args.length === 1 && args[0]!.n === 1);
  check("표본 ≥ 3(A + 샘플 3) → 분포 · 우리 값 0.736 · 백분위", r.suppressed === false && Number(r.n_tenants) >= 4 && num(r.p50) !== null && num(r.my_value) === 0.736 && num(r.my_percentile) !== null, JSON.stringify(r));
  const c = await call(IDS.tenantA, "cost_per_cmh");
  check("풍량당 원가 = 원가 ÷ 풍량(우리 값 1416.6667)", num(c.my_value) === 1416.6667, JSON.stringify(c));
  const m = await call(IDS.tenantA, "material_ratio");
  check("재료비 비율 = 재료비 ÷ (재료비 + 인건비)(우리 값 0.8475)", num(m.my_value) === 0.8475, JSON.stringify(m));
  const b = await call(IDS.tenantB, "fan_eta");
  check("다른 회사(B)가 부르면 B 의 값으로만 — A 의 값 0.736 이 나오지 않는다 · 분포는 같다", num(b.my_value) !== 0.736 && num(b.p50) === num(r.p50), JSON.stringify(b));

  await seedBench(1);
  const s = await call(IDS.tenantA, "fan_eta");
  check("표본 2곳(A + 샘플 1)이면 suppressed = true · p25 · p50 · p75 · 백분위 NULL", s.suppressed === true && Number(s.n_tenants) === 2 && s.p25 === null && s.p50 === null && s.p75 === null && s.my_percentile === null, JSON.stringify(s));
  await seedBench(3);

  const cross = await withTenant(IDS.tenantA, (tx) => tx.bomCodeRun.count({ where: { tenantId: IDS.tenantB } }));
  check("edim_app 이 함수 밖에서 다른 회사 스냅샷을 읽으면 0건(RLS 그대로)", cross === 0);
  const smp = await err(() => withTenant(IDS.tenantA, (tx) => tx.$queryRawUnsafe(`SELECT count(*) FROM "benchmark_sample"`)));
  check("edim_app 은 표본 표를 직접 읽지 못한다(함수만)", smp !== null && /permission denied/i.test(smp), String(smp).slice(-120));
  const noCtx = await err(() => appPrisma.$queryRawUnsafe(`SELECT * FROM public.benchmark_metrics('fan_eta')`));
  check("테넌트 컨텍스트 없이 부르면 거부", noCtx !== null && /tenant context/i.test(noCtx), String(noCtx).slice(-120));
  const bad = await err(() => call(IDS.tenantA, "tenant_name"));
  check("모르는 지표는 거부", bad !== null && /unknown benchmark metric/i.test(bad), String(bad).slice(-120));
  const pf = await err(() => platformDb.$queryRawUnsafe(`SELECT * FROM public.benchmark_metrics('fan_eta')`));
  check("edim_platform 은 함수 EXECUTE 없음", pf !== null && /permission denied/i.test(pf), String(pf).slice(-120));
  const pfRead = await err(() => platformDb.$queryRawUnsafe(`SELECT count(*) FROM public.bom_code_run`));
  check("edim_platform 은 회사 업무 표(bom_code_run)를 읽지 못한다(기존 단언 유지)", pfRead !== null && /permission denied/i.test(pfRead), String(pfRead).slice(-120));
  const pfSmp = await err(() => platformDb.$queryRawUnsafe(`SELECT count(*) FROM public.benchmark_sample`));
  check("edim_platform 은 표본 표도 읽지 못한다", pfSmp !== null && /permission denied/i.test(pfSmp), String(pfSmp).slice(-120));

  await adminPrisma.bomCodeRun.deleteMany({ where: { id: run.id } });
  console.log(fail === 0 ? `\nALL PASS (${pass})` : `\n${fail} FAILED / ${pass} passed`);
  await appPrisma.$disconnect(); await adminPrisma.$disconnect(); await platformDb.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
