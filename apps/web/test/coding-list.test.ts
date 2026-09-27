import { describe, it, expect } from "vitest";
import { buildCodingList } from "../app/lib/coding-list";

/** H7 · p47 Coding List — 노드마다 승인 매크로 1개 (순수 함수) */
const nodes = [
  { stableId: "root", parentStable: null, kind: "set-up", label: "EDIM Set-up", position: 0 },
  { stableId: "ahu", parentStable: "root", kind: "module", label: "AHU-01", position: 0 },
  { stableId: "prj", parentStable: null, kind: "project", label: "PS-61313-5", position: 1 },
];
const m = (id: string, stableId: string, status: string, revision: number) => ({ id, stableId, status, revision, dsl: `=r${revision}`, approvedAt: status === "approved" ? "2026-09-27T00:00:00Z" : null, verifiedAtApproval: true });

describe("H7 Coding List", () => {
  it("트리 순서 · 깊이 · 경로", () => {
    const rows = buildCodingList(nodes, [], []);
    expect(rows.map((r) => [r.label, r.depth, r.path])).toEqual([["EDIM Set-up", 0, "EDIM Set-up"], ["AHU-01", 1, "EDIM Set-up › AHU-01"], ["PS-61313-5", 0, "PS-61313-5"]]);
  });
  it("승인 매크로 · 초안/반려/밀려난 수 · 마지막 BOM 이 쓴 개정", () => {
    const rows = buildCodingList(nodes, [m("a", "prj", "superseded", 1), m("b", "prj", "approved", 2), m("c", "prj", "draft", 3), m("d", "ahu", "rejected", 1)],
      [{ stableId: "prj", macroRevision: 1, createdAt: "2026-09-26T00:00:00Z" }, { stableId: "prj", macroRevision: 2, createdAt: "2026-09-27T00:00:00Z" }]);
    const prj = rows.find((r) => r.stableId === "prj")!, ahu = rows.find((r) => r.stableId === "ahu")!;
    expect(prj).toMatchObject({ approved: { id: "b", revision: 2 }, approvedCount: 1, drafts: 1, rejected: 0, superseded: 1, lastRun: { macroRevision: 2, matchesApproved: true } });
    expect(ahu).toMatchObject({ approved: null, approvedCount: 0, rejected: 1, lastRun: null });
  });
  it("승인이 둘이면 숨기지 않고 센다 · 마지막 BOM 이 옛 개정이면 다르다고", () => {
    const rows = buildCodingList(nodes, [m("x", "prj", "approved", 3), m("y", "prj", "approved", 4)], [{ stableId: "prj", macroRevision: 3, createdAt: "2026-09-27T00:00:00Z" }]);
    const prj = rows.find((r) => r.stableId === "prj")!;
    expect(prj.approvedCount).toBe(2);
    expect(prj.approved?.revision).toBe(4);
    expect(prj.lastRun?.matchesApproved).toBe(false);
  });
});
