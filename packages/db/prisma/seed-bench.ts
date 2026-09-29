/**
 * seed-bench.ts — ccmd K · KB-2 벤치마킹 표본(샘플 회사 값 · 0037 benchmark_sample).
 *   seedBench(3) : 샘플 회사 3곳(이름에 '샘플') — 각 회사의 "최신 스냅샷 1개"에 해당하는 값 한 줄씩
 *   seedBench(n) : n 곳만 남긴다(테스트용 — 표본을 줄여 k-익명 하한(3) 아래를 보인다)
 * CLI: pnpm --filter @edim/db bench:seed -- <n>   (기본 3 · 멱등)
 * 앱 역할 · 플랫폼 역할은 이 표를 읽지 못한다(권한 없음 · RLS 정책 없음) — 스키마 소유자(adminPrisma)로 넣는다.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { adminPrisma } from "../src/client";

export const BENCH_SAMPLES = [
  { label: "벤치마킹 샘플 회사 1 (샘플)", cost_total: 16000000, material: 12000000, labor: 2160000, q_cmh: 12000, fan_eta: 0.7 },
  { label: "벤치마킹 샘플 회사 2 (샘플)", cost_total: 14500000, material: 10500000, labor: 2300000, q_cmh: 10000, fan_eta: 0.66 },
  { label: "벤치마킹 샘플 회사 3 (샘플)", cost_total: 19800000, material: 15000000, labor: 2700000, q_cmh: 15000, fan_eta: 0.74 },
] as const;

export async function seedBench(count = 3): Promise<void> {
  const keep = BENCH_SAMPLES.slice(0, Math.max(0, Math.min(count, BENCH_SAMPLES.length)));
  await adminPrisma.$executeRawUnsafe(`DELETE FROM "benchmark_sample"`);
  for (const s of keep)
    await adminPrisma.$executeRaw`INSERT INTO "benchmark_sample" (label, cost_total, material, labor, q_cmh, fan_eta) VALUES (${s.label}, ${s.cost_total}, ${s.material}, ${s.labor}, ${s.q_cmh}, ${s.fan_eta})`;
  console.log(`Bench seed: ${keep.length} sample companies (0037 · 샘플).`);
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const arg = process.argv.slice(2).find((a) => /^\d+$/.test(a));
  seedBench(arg === undefined ? 3 : Number(arg)).then(() => adminPrisma.$disconnect()).catch(async (e) => { console.error(e); await adminPrisma.$disconnect(); process.exit(1); });
}
