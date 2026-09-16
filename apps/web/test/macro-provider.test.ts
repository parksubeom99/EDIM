import { describe, it, expect } from "vitest";
import { parse, evaluate } from "@edim/macro-dsl";
import { codesFromSlots, providerFromSlots } from "../app/lib/macro/provider";

const SAMPLE = "=IF(CAP,CAP>25, SUM(Table1(A,4:4))*Var(NS,15)*Var(NS,20), SUM(Table1(A,1:1))*Var(NS,20))";
const run = (slots: Record<string, string>) => {
  const p = parse(SAMPLE);
  if (!p.ok) throw new Error(p.error.message);
  const r = evaluate(p.value, providerFromSlots(slots));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("codesFromSlots", () => {
  it("maps RCCS slots to numeric code refs", () => {
    expect(codesFromSlots({ A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" })).toEqual({
      A: 1, B: 55, C: 2123, D: 630, E: 1, F: 1, CAP: 55, CMH: 55000, ROW: 4,
    });
  });
  it("defaults missing slots to 0 (never undefined → no UNKNOWN_SYMBOL on baseline refs)", () => {
    const c = codesFromSlots({});
    for (const k of ["A", "B", "C", "D", "E", "F", "CAP", "CMH", "ROW"]) expect(typeof c[k]).toBe("number");
  });
});

describe("EDIM Run — deterministic branch by slot", () => {
  it("CAP>25 branch: fan 22kW × 1.15 × 18 = 455.4", () => {
    expect(run({ A: "EU", B: "55", C: "2123" })).toBeCloseTo(455.4, 6);
  });
  it("else branch: fan 3.7kW × 18 = 66.6", () => {
    expect(run({ A: "EU", B: "10", C: "0480" })).toBeCloseTo(66.6, 6);
  });
  it("same slots → same value (referential transparency)", () => {
    expect(run({ B: "25" })).toBe(run({ B: "25" }));
  });
  it("provider resolves tables/vars/codes and fails closed on unknowns", () => {
    const p = providerFromSlots({ B: "12" });
    expect(p.resolveTable("1", "B", [2, 2])).toEqual([4]);
    expect(p.resolveVar("NS", "15")).toBe(1.15);
    expect(p.resolveCodeRef("CMH")).toBe(12000);
    expect(p.resolveCodeRef("ZZ")).toBeUndefined();
    expect(p.resolveTable("9", "A", [1, 1])).toBeUndefined();
  });
});
