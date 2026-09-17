import { describe, it, expect } from "vitest";
import { buildBom, buildEbom, buildCost, sectionsOf } from "../app/lib/output/bom";
import { buildDxf } from "../app/lib/output/dxf";

const S55 = { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" };
const S10 = { A: "ER", B: "10", C: "0480" };

describe("M3 output — BOM/EBOM/Cost (deterministic)", () => {
  it("sections follow the slot options", () => {
    expect(sectionsOf(S55)).toEqual(["Mixing", "Filter", "Rotor", "Coil", "Fan"]);
    expect(sectionsOf({ D: "A1" })).toContain("Humid.");
  });
  it("same slots → identical BOM", () => {
    expect(buildBom(S55)).toEqual(buildBom({ ...S55 }));
  });
  it("rotor option adds a rotor line; base has none", () => {
    expect(buildBom(S55).some((l) => l.section === "Rotor")).toBe(true);
    expect(buildBom(S10).some((l) => l.section === "Rotor")).toBe(false);
  });
  it("spec strings carry EDIM.pdf p14 AHU spec table (not invented materials)", () => {
    const b = buildBom(S55);
    expect(b.find((l) => l.part === "Panel (double skin)")?.spec).toContain("칼라강판 0.8T");
    expect(b.find((l) => l.part === "Panel (double skin)")?.spec).toContain("G/Wool 48K 50T");
    expect(b.find((l) => l.part === "Plug fan")?.spec).toContain("EURUS");
    expect(b.find((l) => l.part === "Cooling coil")?.spec).toContain("8FPI");
    expect(b.find((l) => l.part === "Mixing damper")?.spec).toContain("OA/EA/BYPASS");
  });
  it("fan spec follows Table1 (55 → 22kW, 10 → 3.7kW)", () => {
    expect(buildBom(S55).find((l) => l.part === "Plug fan")?.spec).toMatch(/^22kW/);
    expect(buildBom(S10).find((l) => l.part === "Plug fan")?.spec).toMatch(/^3.7kW/);
  });
  it("macro value adds vibration isolators sized from it", () => {
    const l = buildBom(S55, 455.4).find((x) => x.part === "Vibration isolator");
    expect(l?.spec).toBe("for 455 kg (macro)");
    expect(buildBom(S55, null).some((x) => x.part === "Vibration isolator")).toBe(false);
  });
  it("EBOM groups keep section order and subtotals add up to material cost", () => {
    const lines = buildBom(S55);
    const groups = buildEbom(lines, S55);
    expect(groups.map((g) => g.section)).toEqual(["Casing", "Mixing", "Filter", "Rotor", "Coil", "Fan"]);
    expect(groups.reduce((a, g) => a + g.subtotal, 0)).toBe(buildCost(lines).material);
  });
  it("cost roll-up: labor 18%, overhead 12%, total = sum", () => {
    const c = buildCost(buildBom(S10));
    expect(c.labor).toBe(Math.round(c.material * 0.18));
    expect(c.overhead).toBe(Math.round((c.material + c.labor) * 0.12));
    expect(c.total).toBe(c.material + c.labor + c.overhead);
    expect(buildCost(buildBom(S55)).total).toBeGreaterThan(c.total);
  });
});

describe("M3 output — DXF", () => {
  it("emits a valid R12 skeleton with layers and entities", () => {
    const { dxf, meta } = buildDxf(S55, "EU-55-2123-630SS-1-21-13-15");
    expect(dxf.startsWith("0\nSECTION\n2\nHEADER")).toBe(true);
    expect(dxf).toContain("AC1009");
    expect(dxf.trim().endsWith("0\nEOF")).toBe(true);
    expect(dxf).toContain("\nENTITIES\n");
    expect(meta.sections.length).toBe(5);
    expect(meta.lengthMm).toBe(5 * 900);
    expect((dxf.match(/0\nLINE\n/g) ?? []).length).toBeGreaterThanOrEqual(4 + 4 + 2);
    expect((dxf.match(/0\nTEXT\n/g) ?? []).length).toBe(5 + 2 + 1);
  });
  it("deterministic", () => {
    expect(buildDxf(S10, "ER-10-0480").dxf).toBe(buildDxf({ ...S10 }, "ER-10-0480").dxf);
  });
});
