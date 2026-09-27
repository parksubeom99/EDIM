import { describe, it, expect } from "vitest";
import { resolveSubDrawings, resolveNotes, type DwgLike } from "../app/lib/drawing-template";

/** H5 · p39 · p40 — 하부 도면 호출 · 설계 우선순위 · 주의사항 (순수 함수) */
const items = [
  { part: "Plug fan", qty: 1, unit: "ea", childCode: "KFP 1", remarks: "KFP 1-21" },
  { part: "Casing panel", qty: 8, unit: "ea", childCode: "KCP 1" },
  { part: "Casing panel", qty: 2, unit: "ea", childCode: "KCP 1", remarks: "door" },
  { part: "Rotor", qty: 1, unit: "ea", childCode: "KHR 1" },
];
const sub = (childCode: string, priority: number) => ({ kind: "sub", childCode, text: null, priority });

describe("H5 하부 도면 호출", () => {
  it("우선순위(작을수록 먼저) → 같으면 코드 순 · 스냅샷에 없는 코드는 부르지 않는다", () => {
    const r = resolveSubDrawings(items, [sub("KFP 1", 2), sub("PSH 1", 1), sub("KCP 1", 2), sub("KHR 1", 1)], new Map());
    expect(r.map((x) => [x.order, x.childCode])).toEqual([[1, "KHR 1"], [2, "KCP 1"], [3, "KFP 1"]]);
  });
  it("같은 코드 줄은 수량을 더하고 비고를 잇는다 — 값은 스냅샷 줄 그대로", () => {
    const r = resolveSubDrawings(items, [sub("KCP 1", 1)], new Map());
    expect(r[0]).toMatchObject({ childCode: "KCP 1", part: "Casing panel", qty: 10, unit: "ea", remarks: "door", dwg: null });
  });
  it("DWG 는 그 코드의 첨부 중 2D 우선 · 최신 — 자료(data) 첨부는 도면이 아니다", () => {
    const dwg = new Map<string, DwgLike[]>([["KFP 1", [
      { id: "d0", name: "old.dxf", kind: "dwg2d", uploadedAt: "2026-09-01T00:00:00Z" },
      { id: "d1", name: "fan.dxf", kind: "dwg2d", uploadedAt: "2026-09-20T00:00:00Z" },
      { id: "d2", name: "fan.step", kind: "dwg3d", uploadedAt: "2026-09-25T00:00:00Z" },
      { id: "d3", name: "spec.pdf", kind: "data", uploadedAt: "2026-09-26T00:00:00Z" },
    ]]]);
    expect(resolveSubDrawings(items, [sub("KFP 1", 1)], dwg)[0]!.dwg).toEqual({ id: "d1", name: "fan.dxf", kind: "dwg2d" });
    const only3d = new Map<string, DwgLike[]>([["KFP 1", [{ id: "d2", name: "fan.step", kind: "dwg3d", uploadedAt: "2026-09-25T00:00:00Z" }]]]);
    expect(resolveSubDrawings(items, [sub("KFP 1", 1)], only3d)[0]!.dwg?.kind).toBe("dwg3d");
  });
});

describe("H5 Detail Design 주의사항", () => {
  it("note 만 · 우선순위 순 · 같으면 등록 순", () => {
    expect(resolveNotes([
      { kind: "note", childCode: null, text: "둘", priority: 2, createdAt: "2026-09-27T01:00:00Z" },
      { kind: "sub", childCode: "KFP 1", text: null, priority: 1 },
      { kind: "note", childCode: null, text: "하나-b", priority: 1, createdAt: "2026-09-27T02:00:00Z" },
      { kind: "note", childCode: null, text: "하나-a", priority: 1, createdAt: "2026-09-27T00:00:00Z" },
    ])).toEqual(["하나-a", "하나-b", "둘"]);
  });
});
