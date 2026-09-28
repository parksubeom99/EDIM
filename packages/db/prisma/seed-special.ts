import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adminPrisma } from "../src/client";
import { IDS } from "./seed";

/**
 * 0034 · C Special '팬 선정' 샘플 — 프로그램 정의(단가 샘플) · DB① 팬 성능표(3모델 × 3회전수 × 8점) · 회사 A 자체 팬 표 1개.
 * 전부 **샘플**(팬 법칙으로 만든 값 — 제조사 자료 아님). special-samples/fan_curves.json 이 원본.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));

export const FAN_PROGRAM = {
  key: "fan-select",
  version: 1,
  title: "팬 선정 (샘플 성능표)",
  pricePerRun: 5000,
  currency: "KRW",
  uiFormRef: { params: ["q_cmh", "p_pa", "rho"], note: "회사가 Toolbox(UI Form)에서 만든 폼을 그대로 쓴다 — number 위젯의 param 으로 입력을 잇는다" },
  binding: [
    { source: "platform", table: "platform.fan_curve", columns: ["q_cmh", "p_pa", "eta"], where: "모델·회전수마다 계통 곡선과의 교점을 품은 구간 1개", via: "special_fan_candidates()" },
    { source: "tenant", table: "tenant_fan_curve", columns: ["q_cmh", "p_pa", "eta"], where: "이 회사가 등록한 팬 표 전체" },
  ],
};

export async function seedSpecial(): Promise<void> {
  await adminPrisma.$executeRaw`
    INSERT INTO platform.special_program (key, version, title, ui_form_ref, binding, price_per_run, currency, is_sample)
    VALUES (${FAN_PROGRAM.key}, ${FAN_PROGRAM.version}, ${FAN_PROGRAM.title}, ${JSON.stringify(FAN_PROGRAM.uiFormRef)}::jsonb, ${JSON.stringify(FAN_PROGRAM.binding)}::jsonb,
            ${FAN_PROGRAM.pricePerRun}, ${FAN_PROGRAM.currency}, true)
    ON CONFLICT (key) DO UPDATE SET version = EXCLUDED.version, title = EXCLUDED.title, ui_form_ref = EXCLUDED.ui_form_ref, binding = EXCLUDED.binding,
      price_per_run = EXCLUDED.price_per_run, currency = EXCLUDED.currency, state = 'active'`;
  const J = JSON.parse(readFileSync(path.join(HERE, "special-samples", "fan_curves.json"), "utf8")) as { curves: { model: string; rpm: number; points: { q: number; p: number; eta: number }[] }[] };
  for (const c of J.curves)
    for (const p of c.points)
      await adminPrisma.$executeRaw`
        INSERT INTO platform.fan_curve (model, rpm, q_cmh, p_pa, eta, is_sample) VALUES (${c.model}, ${c.rpm}, ${p.q}, ${p.p}, ${p.eta}, true)
        ON CONFLICT (model, rpm, q_cmh) DO UPDATE SET p_pa = EXCLUDED.p_pa, eta = EXCLUDED.eta`;
  // 회사 A 의 자체 팬 표(바인딩 source=tenant 증명) — 한 모델 · 한 회전수 · 8점(샘플)
  const n = await adminPrisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM public.tenant_fan_curve WHERE tenant_id = ${IDS.tenantA}::uuid`;
  if (Number(n[0]?.n ?? 0) === 0) {
    const P0 = 900, Qmax = 22000, Qb = 13000, em = 0.68;
    for (let i = 1; i <= 8; i++) {
      const q = Math.round(Qmax * 0.1 * i), p = Math.round((P0 - (P0 / Qmax ** 2) * q * q) * 10) / 10;
      const eta = Math.round(Math.max(0.2, em * (1 - 0.9 * (q / Qb - 1) ** 2)) * 10000) / 10000;
      await adminPrisma.$executeRaw`INSERT INTO public.tenant_fan_curve (tenant_id, model, rpm, q_cmh, p_pa, eta) VALUES (${IDS.tenantA}::uuid, 'ACME 자체 팬 (샘플)', 1750, ${q}, ${p}, ${eta})`;
    }
  }
}

/** reset — 부여 · 사용 기록 · 회사 자체 표를 지운다(seedSpecial 이 자체 표를 다시 넣는다). 사용 기록은 앱 역할이 못 지우므로 여기서만. */
export async function resetSpecial(): Promise<void> {
  await adminPrisma.$executeRaw`DELETE FROM public.special_run`;
  await adminPrisma.$executeRaw`DELETE FROM public.special_grant`;
  await adminPrisma.$executeRaw`DELETE FROM public.tenant_fan_curve`;
}
