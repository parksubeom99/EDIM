import { withTenant, getBomRun, listSpecialGrants, fanCandidates } from "@edim/db";
import type { Role } from "@edim/core-ontology";
import { loadCatalog } from "@/app/lib/catalog";
import { businessToday, dateOnly } from "@/app/lib/today";
import { supplierProposals, fanProposals, marginProposals, SAMPLE_HOURS_PER_YEAR, type Proposal, type SnapLineLite, type SpecialSnapLite } from "@/app/lib/consulting";
import type { FanSegment } from "@/app/lib/special/fan";

/**
 * ccmd K · KB — 컨설팅 서버 쪽(트랙 1 분석 · 트랙 2 벤치마킹). 회사 owner · engineer(회사 관리자 · 기술)만 — viewer · cad · sales 403.
 * 트랙 1 은 **자기 회사** 스냅샷만(RLS) · 트랙 2 는 DB 함수 benchmark_metrics 가 주는 집계 숫자만.
 */
export const CONSULTING_ROLES: readonly Role[] = ["owner", "engineer"];
export const canUseConsulting = (r: Role) => CONSULTING_ROLES.includes(r);

export interface InternalReport {
  runId: string; code: string; parentCode: string; createdAt: string; analyzedOn: string; hoursPerYear: number;
  proposals: Proposal[]; fanNote: string; totals: { krw: number; kwh: number };
  sample: string;
}

export async function internalReport(tenantId: string, runId: string | null): Promise<InternalReport | null> {
  const today = businessToday();
  const got = await withTenant(tenantId, async (tx) => {
    const id = runId ?? (await tx.bomCodeRun.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } }))?.id ?? null;
    if (!id) return null;
    const run = await getBomRun(tx, id);
    if (!run) return null;
    const lines = (Array.isArray(run.lines) ? run.lines : []) as SnapLineLite[];
    const codes = [...new Set(lines.map((l) => (typeof l.childCode === "string" ? l.childCode : "")).filter(Boolean))];
    const prices = codes.length ? await tx.priceHistory.findMany({ where: { code: { in: codes } } }) : [];
    const dims = (run.dims ?? null) as Record<string, unknown> | null;
    const sp = (dims?.special ?? null) as SpecialSnapLite | null;
    let segs: FanSegment[] | null = null;
    if (sp?.input && (await listSpecialGrants(tx)).some((g) => g.programKey === "fan-select"))
      segs = await fanCandidates(tx, Number(sp.input.q_cmh), Number(sp.input.p_pa));
    return { run, lines, prices, dims, sp, segs };
  });
  if (!got) return null;
  const { run, lines, prices, dims, sp, segs } = got;
  const { catalog } = await loadCatalog(tenantId);
  const product = catalog.productCodes.find((p) => p.code === run.parentCode && p.kind === "product") ?? null;
  const sup = supplierProposals(run.id, lines, prices.map((p) => ({ id: p.id, code: p.code, item: p.item, price: Number(p.price), currency: p.currency, supplier: p.supplier, effectiveFrom: dateOnly(p.effectiveFrom), createdAt: p.createdAt.toISOString() })), today);
  const fan = fanProposals(run.id, sp, segs);
  const mar = marginProposals(run.id, product, dims);
  const proposals = [...sup, ...fan.proposals, ...mar];
  return {
    runId: run.id, code: run.code, parentCode: run.parentCode, createdAt: run.createdAt.toISOString(), analyzedOn: today, hoursPerYear: SAMPLE_HOURS_PER_YEAR,
    proposals, fanNote: fan.note,
    totals: { krw: proposals.filter((p) => p.saving?.unit === "KRW").reduce((a, p) => a + (p.saving?.amount ?? 0), 0), kwh: proposals.filter((p) => p.saving?.unit === "kWh/yr").reduce((a, p) => a + (p.saving?.amount ?? 0), 0) },
    sample: "샘플 단가 · 샘플 운전시간 — 제안은 읽기 전용이며 적용은 사람이 기존 화면에서 합니다",
  };
}

export const BENCH_METRICS = [
  { key: "cost_per_cmh", label: "풍량당 원가", unit: "₩/CMH" },
  { key: "material_ratio", label: "재료비 비율(재료비 ÷ 직접원가)", unit: "비율" },
  { key: "fan_eta", label: "팬 효율 η", unit: "η" },
] as const;
export interface BenchRow { metric: string; label: string; unit: string; n: number; p25: number | null; p50: number | null; p75: number | null; mine: number | null; percentile: number | null; suppressed: boolean }

/** 트랙 2 — 지표마다 DB 함수 하나. 회사 id · 이름 · 행 값은 오지 않는다(함수가 돌려주지 않는다). */
export async function benchmark(tenantId: string): Promise<BenchRow[]> {
  return withTenant(tenantId, async (tx) => {
    const out: BenchRow[] = [];
    for (const m of BENCH_METRICS) {
      const rows = await tx.$queryRaw<{ metric_key: string; n_tenants: number; p25: unknown; p50: unknown; p75: unknown; my_value: unknown; my_percentile: unknown; suppressed: boolean }[]>`SELECT * FROM public.benchmark_metrics(${m.key})`;
      const r = rows[0]!;
      const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
      out.push({ metric: m.key, label: m.label, unit: m.unit, n: Number(r.n_tenants), p25: n(r.p25), p50: n(r.p50), p75: n(r.p75), mine: n(r.my_value), percentile: n(r.my_percentile), suppressed: r.suppressed });
    }
    return out;
  });
}
