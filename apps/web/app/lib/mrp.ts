/**
 * ccmd L · LA-2 — MRP(p44-1) · Capacity(p44-3). **순수 함수**(DB · 시계 모름) — 같은 입력 = 같은 답.
 *
 * MRP: 프로젝트(수량 · 납기) + 그 프로젝트의 BOM 스냅샷 → 품목마다
 *   총소요 = 스냅샷 줄 수량 × 프로젝트 수량(맨 윗줄 = 제품 자체 · 프로젝트 수량)
 *   순소요 = max(0, 총소요 − 현재고 − 입고 예정)
 *   시기   = 구매: 납기 − 리드타임(일) · 제조: 납기 − ⌈공정 시간 합 × 순소요 ÷ 8h⌉ 일(8h/일 환산 · 샘플 가정)
 *   구분   = 품목 자재 정보(제조/구매)가 있으면 그것 · 없으면 스냅샷 줄 종류(purchase → 구매 · 그 밖 → 제조)
 * Capacity: 지시된 단계(완료 전)를 작업지시 착수일부터 순서대로 날에 앉힌다 — 부하(시간 × 인원 × 수량) vs 작업장 가용 시간/일.
 */
export const HOURS_PER_DAY = 8;

export interface MrpLineIn { childCode: string; part: string; qty: number; unit: string; kind: string }
export interface MrpInput {
  snapshot: { id: string; product: string; lines: MrpLineIn[] };
  project: { qty: number; due: string | null };
  onHand: Record<string, number>;
  incoming: Record<string, number>;
  items: Record<string, { makeBuy: "make" | "buy"; leadDays: number }>;
  routeHours: Record<string, number>;
  today: string;
}
export interface MrpRow {
  item: string; part: string; unit: string; kind: "make" | "buy"; gross: number; onHand: number; incoming: number; net: number;
  leadDays: number | null; days: number; startBy: string | null; late: boolean; source: "item_material" | "snapshot";
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function computeMrp(i: MrpInput): { head: { snapshotId: string; product: string; projectQty: number; due: string | null; today: string; stockSum: number }; rows: MrpRow[] } {
  const want = new Map<string, { part: string; unit: string; qty: number; kind: string }>();
  want.set(i.snapshot.product, { part: `${i.snapshot.product} (제품)`, unit: "set", qty: i.project.qty, kind: "part" });
  for (const l of i.snapshot.lines) {
    const cur = want.get(l.childCode);
    const q = r3(l.qty * i.project.qty);
    want.set(l.childCode, cur ? { ...cur, qty: r3(cur.qty + q) } : { part: l.part, unit: l.unit, qty: q, kind: l.kind });
  }
  const rows: MrpRow[] = [...want.entries()].map(([item, w]) => {
    const reg = i.items[item];
    const kind: "make" | "buy" = reg ? reg.makeBuy : w.kind === "purchase" ? "buy" : "make";
    const onHand = r3(i.onHand[item] ?? 0), incoming = r3(i.incoming[item] ?? 0);
    const net = r3(Math.max(0, w.qty - onHand - incoming));
    const days = kind === "buy" ? (reg?.leadDays ?? 0) : Math.ceil(((i.routeHours[item] ?? 0) * net) / HOURS_PER_DAY);
    const startBy = i.project.due && net > 0 ? addDays(i.project.due, -days) : null;
    return { item, part: w.part, unit: w.unit, kind, gross: w.qty, onHand, incoming, net, leadDays: kind === "buy" ? (reg?.leadDays ?? 0) : null, days,
      startBy, late: !!startBy && startBy < i.today, source: reg ? "item_material" : "snapshot" };
  });
  const stockSum = r3(Object.values(i.onHand).reduce((a, v) => a + v, 0));
  return { head: { snapshotId: i.snapshot.id, product: i.snapshot.product, projectQty: i.project.qty, due: i.project.due, today: i.today, stockSum }, rows };
}

export interface CapStepIn { workOrder: string; start: string; qty: number; steps: { seq: number; workCenterId: string; hours: number; persons: number; done: boolean }[] }
export interface CapCell { workCenterId: string; date: string; load: number; available: number; over: boolean; from: string[] }
/** 단계 i 는 앞 단계들의 시간 합(× 수량) ÷ 8h 만큼 뒤 날에 앉는다. 이미 완료된 단계는 부하에서 뺀다. */
export function computeCapacity(orders: CapStepIn[], centers: Record<string, number>): CapCell[] {
  const cells = new Map<string, CapCell>();
  for (const o of [...orders].sort((a, b) => a.workOrder.localeCompare(b.workOrder))) {
    let offset = 0;
    for (const s of [...o.steps].sort((a, b) => a.seq - b.seq)) {
      const hours = s.hours * o.qty;
      if (!s.done) {
        const date = addDays(o.start, Math.floor(offset / HOURS_PER_DAY));
        const k = `${s.workCenterId}|${date}`;
        const c = cells.get(k) ?? { workCenterId: s.workCenterId, date, load: 0, available: centers[s.workCenterId] ?? HOURS_PER_DAY, over: false, from: [] };
        c.load = r3(c.load + hours * s.persons); c.from.push(`${o.workOrder}#${s.seq}`); c.over = c.load > c.available;
        cells.set(k, c);
      }
      offset += hours;
    }
  }
  return [...cells.values()].sort((a, b) => a.date.localeCompare(b.date) || a.workCenterId.localeCompare(b.workCenterId));
}
