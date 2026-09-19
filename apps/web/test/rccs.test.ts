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

import { slotDefsFromSubCodes } from "../app/lib/rccs";
import demo from "@edim/bom-code/catalog/ahu-demo.json";

describe("P1 — Code Builder choices come from registered Sub Codes (p31)", () => {
  const defs = slotDefsFromSubCodes(demo.subCodes);
  it("the demo registration reproduces the sample catalog exactly (labels included)", () => {
    expect(defs).toEqual(RCCS_SLOTS);
  });
  it("a newly registered sub item becomes a valid choice; an unregistered one stays an error", () => {
    const more = slotDefsFromSubCodes([...demo.subCodes, { itemKey: "B", itemName: "용량", seq: 5, value: "80", description: "80,000 CMH" }]);
    expect(assembleCode({ A: "EU", B: "80", C: "2123" }, more).ok).toBe(true);
    expect(assembleCode({ A: "EU", B: "80", C: "2123" }, defs).ok).toBe(false);
    expect(more.find((d) => d.key === "B")?.options.at(-1)).toEqual({ value: "80", label: "80 · 80,000 CMH" });
  });
  it("optional items keep the 'none' choice; an empty tenant falls back to the samples", () => {
    expect(defs.find((d) => d.key === "D")?.options[0]?.value).toBe("");
    expect(slotDefsFromSubCodes([])).toEqual(RCCS_SLOTS);
  });
});
