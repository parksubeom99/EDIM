import { describe, it, expect } from "vitest";
import { assembleCode, parseCode, RCCS_SLOTS } from "../app/lib/rccs";

describe("assembleCode (deterministic)", () => {
  it("assembles A-B-C with required slots only", () => {
    const r = assembleCode({ A: "EU", B: "55", C: "2123" });
    expect(r.code).toBe("EU-55-2123");
    expect(r.ok).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });
  it("appends option + material + sequence", () => {
    const r = assembleCode({ A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" });
    expect(r.code).toBe("EU-55-2123-630SS-1-21-13-15");
    expect(r.ok).toBe(true);
  });
  it("flags missing required slot as error", () => {
    const r = assembleCode({ A: "EU", C: "2123" });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some((d) => d.slot === "B" && d.severity === "error")).toBe(true);
  });
  it("rejects values outside the catalog", () => {
    const r = assembleCode({ A: "XX", B: "55", C: "2123" });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.slot).toBe("A");
  });
  it("validates F sequence format", () => {
    const r = assembleCode({ A: "EU", B: "55", C: "2123", F: "1-2-x" });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some((d) => d.slot === "F")).toBe(true);
  });
  it("warns (not errors) on EC + rotor combination", () => {
    const r = assembleCode({ A: "EC", B: "10", C: "0480", D: "630" });
    expect(r.ok).toBe(true);
    expect(r.diagnostics.some((d) => d.severity === "warn")).toBe(true);
  });
  it("is referentially transparent", () => {
    const s = { A: "ER", B: "12", C: "0480", F: "2-11-08-04" };
    expect(assembleCode(s)).toEqual(assembleCode({ ...s }));
  });
  it("catalog: every slot has options, required slots have no empty option", () => {
    for (const s of RCCS_SLOTS) {
      expect(s.options.length).toBeGreaterThan(0);
      if (s.required) expect(s.options.every((o) => o.value !== "")).toBe(true);
    }
  });
});

describe("parseCode", () => {
  it("round-trips required slots", () => {
    expect(parseCode("ER-12-0480")).toEqual({ A: "ER", B: "12", C: "0480" });
  });
  it("recovers option + material + sequence", () => {
    expect(parseCode("EU-55-2123-A1SS-1-21-13-15")).toEqual({ A: "EU", B: "55", C: "2123", D: "A1", E: "SS", F: "1-21-13-15" });
  });
});
