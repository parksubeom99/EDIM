import { describe, it, expect } from "vitest";
import demo from "../catalog/ahu-demo.json";
import { recommendSlots, specDefError, slotCandidates, type Catalog, type SpecItemDef } from "../src/index";

const catalog = demo as unknown as Catalog;
const defs = (demo as unknown as { specItems: Record<string, SpecItemDef[]> }).specItems.EU!;

describe("⑥ spec input table → slot recommendation (p46)", () => {
  it("airflow picks the smallest registered capacity that meets it", () => {
    const r = recommendSlots(catalog, "EU", defs, { airflow: "20000" });
    expect(r.slots).toEqual({ B: "25" });
    expect(r.lines[0]!.basis).toContain("25,000");
  });
  it("two specs on the same slot must both hold (airflow + humidification)", () => {
    const r = recommendSlots(catalog, "EU", defs, { airflow: "11000", humid: "20" });
    expect(r.slots.B).toBe("55");  // 12(7kg/h)·25(15kg/h) fail humid ≥ 20 → 55(33kg/h)
  });
  it("choice spec takes a registered value as is", () => {
    expect(recommendSlots(catalog, "EU", defs, { material: "AL" }).slots).toEqual({ E: "AL" });
  });
  it("no registered value meets the spec → unmet, nothing invented", () => {
    const r = recommendSlots(catalog, "EU", defs, { airflow: "90000" });
    expect(r.slots).toEqual({});
    expect(r.unmet).toEqual(["B"]);
    expect(r.lines[0]!.picked).toBeNull();
  });
  it("empty inputs are skipped", () => {
    expect(recommendSlots(catalog, "EU", defs, { airflow: " ", material: "" })).toEqual({ slots: {}, lines: [], unmet: [] });
  });
  it("candidates come from the product's own sub-code group, in seq order", () => {
    expect(slotCandidates(catalog, "EU", "B").map((s) => s.value)).toEqual(["10", "12", "25", "55"]);
  });
  it("definitions are validated against the registered tables", () => {
    for (const d of defs) expect(specDefError(d, catalog, "EU")).toBeNull();
    expect(specDefError({ key: "x", label: "x", unit: "", slot: "E", source: { kind: "table", table: "cap", col: "M", op: "ge" } }, catalog, "EU")).toMatch(/슬롯/);
    expect(specDefError({ key: "x", label: "x", unit: "", slot: "B", source: { kind: "table", table: "nope", col: "M", op: "ge" } }, catalog, "EU")).toMatch(/없음/);
    expect(specDefError({ key: "Bad Key", label: "x", unit: "", slot: "B", source: { kind: "choice" } }, catalog, "EU")).toMatch(/key/);
  });
});
