import { describe, it, expect } from "vitest";
import { derivePipeline, tierOf, TIER_PREFIX } from "../app/lib/approval-state";

const row = (id: string, state: string, note: string | null, t: number) => ({
  id, state, note, requestedAt: new Date(2026, 8, 15, 0, 0, t).toISOString(),
});

describe("derivePipeline — Design→Check→Approve→Accepted", () => {
  it("no rows → Design, next=org", () => {
    const p = derivePipeline([]);
    expect(p.stage).toBe("Design");
    expect(p.next).toBe("org");
    expect(p.pending).toBeNull();
  });
  it("org requested → Check with pending org", () => {
    const p = derivePipeline([row("a", "requested", `${TIER_PREFIX.org} · x`, 1)]);
    expect(p.stage).toBe("Check");
    expect(p.pending).toEqual({ tier: "org", id: "a" });
    expect(p.next).toBeNull();
  });
  it("org approved → Approve, next=platform", () => {
    const p = derivePipeline([row("a", "approved", `${TIER_PREFIX.org} · ok`, 1)]);
    expect(p.stage).toBe("Approve");
    expect(p.next).toBe("platform");
  });
  it("platform requested → Approve with pending platform", () => {
    const p = derivePipeline([
      row("a", "approved", `${TIER_PREFIX.org} · ok`, 1),
      row("b", "requested", `${TIER_PREFIX.platform} · x`, 2),
    ]);
    expect(p.stage).toBe("Approve");
    expect(p.pending).toEqual({ tier: "platform", id: "b" });
  });
  it("platform approved → Accepted (locked)", () => {
    const p = derivePipeline([
      row("a", "approved", `${TIER_PREFIX.org} · ok`, 1),
      row("b", "approved", `${TIER_PREFIX.platform} · ok`, 2),
    ]);
    expect(p.stage).toBe("Accepted");
    expect(p.next).toBeNull();
    expect(p.pending).toBeNull();
  });
  it("org rejected → back to Design (re-circulation)", () => {
    const p = derivePipeline([row("a", "rejected", `${TIER_PREFIX.org} · no`, 1)]);
    expect(p.stage).toBe("Design");
    expect(p.next).toBe("org");
  });
  it("uses the latest row per tier", () => {
    const p = derivePipeline([
      row("a", "rejected", `${TIER_PREFIX.org} · no`, 1),
      row("b", "requested", `${TIER_PREFIX.org} · again`, 2),
    ]);
    expect(p.stage).toBe("Check");
    expect(p.pending?.id).toBe("b");
  });
  it("ignores rows without a tier prefix (legacy)", () => {
    expect(tierOf(row("z", "approved", "legacy note", 1))).toBeNull();
    expect(derivePipeline([row("z", "approved", "legacy note", 1)]).stage).toBe("Design");
  });
});
