import { parse, InMemoryProvider } from "@edim/macro-dsl";
import { dryRun } from "@edim/macro-verify";
import { extractSource } from "./extract";
import { alignFeatures } from "./align";
import { lrnId } from "./formula";

/**
 * B · 운영 감시(1수준) — 새 원천이 올라올 때마다 **승인된** 공식에 대어 본다(회장님 문서 '운영 모니터링 · 분포 변화').
 * 공식이 읽는 특징이 다 있는 기록만 잰다 · 1 mm 를 넘으면 "어긋남". 자동 조치는 하지 않는다 — 계기판에 수만 올린다.
 */
export interface MonitorResult { checked: { formulaId: string; target: string; record: number; want: number; got: number; ok: boolean }[]; mismatched: number }

export async function monitorSource(kind: "drawing" | "techdoc", content: string, approved: { id: string; target: string; expression: string }[], tolerance = 1): Promise<MonitorResult> {
  const a = await alignFeatures(extractSource(kind, content));
  const recs = [...new Set(a.features.map((f) => f.record))];
  const out: MonitorResult = { checked: [], mismatched: 0 };
  for (const f of approved) {
    const p = parse(f.expression);
    if (!p.ok) continue;
    for (const r of recs) {
      const feats = a.features.filter((x) => x.record === r && x.alignedName);
      const want = feats.find((x) => x.alignedName === f.target)?.alignedValue;
      if (want === undefined) continue;
      const vars: Record<string, number> = {};
      for (const x of feats) vars[`LRN|${lrnId(x.alignedName!)}`] = x.alignedValue;
      const res = dryRun(p.value, new InMemoryProvider({ vars }));
      if (!res.ok || typeof res.value !== "number") continue;   // 이 원천에는 공식이 읽는 특징이 없다
      const ok = Math.abs(res.value - want) <= tolerance;
      out.checked.push({ formulaId: f.id, target: f.target, record: r, want, got: Math.round(res.value * 1000) / 1000, ok });
      if (!ok) out.mismatched++;
    }
  }
  return out;
}
