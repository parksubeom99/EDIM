import type { TenantClient, workOrderDetail } from "@edim/db";
import { loadProcessRates, processCostOf } from "./process-rates";
import type { ProcessCostView } from "./mes-run";

/** ccmd P · p44-6 — 작업지시 한 건의 공정비용(참고 · 원가 미반영). 요율 파일은 조회마다 새로 읽는다(파일 교체만으로 반영). */
export async function processCostFor(tx: TenantClient, d: NonNullable<Awaited<ReturnType<typeof workOrderDetail>>>): Promise<ProcessCostView> {
  const r = loadProcessRates();
  if (!r.ok) return { error: r.error };
  const code = new Map((await tx.workCenter.findMany({ select: { id: true, code: true } })).map((c) => [c.id, c.code]));
  const pc = processCostOf(d.steps.map((s) => ({ seq: s.seq, name: s.name, center: code.get(s.workCenterId) ?? "?", hours: s.hours, persons: s.persons })), d.qty, r.snap.rates);
  return { total: pc.total, rows: pc.rows.map((x) => ({ seq: x.seq, center: x.center, amount: x.amount })), missing: pc.missing, file: r.snap.file, fingerprint: r.snap.fingerprint, sample: r.snap.rates.sample };
}
