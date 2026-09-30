import { describe, it, expect } from "vitest";
import { computeMrp, computeCapacity, addDays, type MrpInput } from "../app/lib/mrp";

const base: MrpInput = {
  snapshot: { id: "run-1", product: "SPF", lines: [
    { childCode: "SCS 1", part: "Casing", qty: 1, unit: "set", kind: "part" },
    { childCode: "SMT 1", part: "Motor", qty: 1, unit: "ea", kind: "purchase" },
  ] },
  project: { qty: 2, due: "2026-10-31" },
  onHand: { "SMT 1": 1 }, incoming: { "SCS 1": 0.5 },
  items: { "SMT 1": { makeBuy: "buy", leadDays: 7 } },
  routeHours: { SPF: 10, "SCS 1": 4 },
  today: "2026-10-01",
};

describe("ccmd L · LA-2 MRP(결정론)", () => {
  it("총소요 = 줄 수량 × 프로젝트 수량 · 순소요 = 총소요 − 재고 − 입고 예정 · 시기 = 납기 − 리드타임 / 공정 시간 ÷ 8h", () => {
    const r = computeMrp(base);
    const by = Object.fromEntries(r.rows.map((x) => [x.item, x]));
    expect(by.SPF).toMatchObject({ kind: "make", gross: 2, net: 2, days: 3, startBy: "2026-10-28", source: "snapshot" });   // ⌈10 × 2 ÷ 8⌉ = 3
    expect(by["SCS 1"]).toMatchObject({ kind: "make", gross: 2, incoming: 0.5, net: 1.5, days: 1, startBy: "2026-10-30" });  // ⌈4 × 1.5 ÷ 8⌉ = 1
    expect(by["SMT 1"]).toMatchObject({ kind: "buy", gross: 2, onHand: 1, net: 1, leadDays: 7, startBy: "2026-10-24", source: "item_material" });
    expect(r.head).toMatchObject({ snapshotId: "run-1", projectQty: 2, stockSum: 1, today: "2026-10-01" });
  });
  it("같은 입력 = 같은 답 · 순소요 0 이면 시기 없음 · 납기 없으면 시기 없음 · 늦으면 late", () => {
    expect(computeMrp(base)).toEqual(computeMrp(structuredClone(base)));
    const full = computeMrp({ ...base, onHand: { "SMT 1": 5 } }).rows.find((x) => x.item === "SMT 1")!;
    expect(full).toMatchObject({ net: 0, startBy: null });
    expect(computeMrp({ ...base, project: { qty: 2, due: null } }).rows.every((x) => x.startBy === null)).toBe(true);
    expect(computeMrp({ ...base, today: "2026-10-29" }).rows.find((x) => x.item === "SPF")!.late).toBe(true);
  });
  it("addDays — 월 경계", () => { expect(addDays("2026-10-31", 1)).toBe("2026-11-01"); expect(addDays("2026-03-01", -1)).toBe("2026-02-28"); });
});

describe("ccmd L · LA-2 Capacity", () => {
  it("단계를 착수일부터 순서대로 날에 앉힌다 · 부하 = 시간 × 수량 × 인원 · 가용 초과면 over · 완료 단계는 뺀다 · 합이 맞는다", () => {
    const cells = computeCapacity([
      { workOrder: "WO-1", start: "2026-10-02", qty: 2, steps: [
        { seq: 1, workCenterId: "A", hours: 3, persons: 2, done: false },
        { seq: 2, workCenterId: "B", hours: 1, persons: 1, done: false },
      ] },
      { workOrder: "WO-2", start: "2026-10-02", qty: 1, steps: [{ seq: 1, workCenterId: "A", hours: 2, persons: 1, done: true }] },
    ], { A: 8, B: 8 });
    expect(cells).toEqual([
      { workCenterId: "A", date: "2026-10-02", load: 12, available: 8, over: true, from: ["WO-1#1"] },
      { workCenterId: "B", date: "2026-10-02", load: 2, available: 8, over: false, from: ["WO-1#2"] },
    ]);
  });
});
