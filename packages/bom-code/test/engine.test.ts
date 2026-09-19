import { describe, it, expect } from "vitest";
import demo from "../catalog/ahu-demo.json";
import { runBomCode, sectionsFor, catalogFingerprint, type Catalog } from "../src/index";

const catalog = demo as unknown as Catalog;
const S55 = { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" } as const;

describe("bom-code engine (p34 Part List Run)", () => {
  it("unregistered product code is refused, not guessed", () => {
    const r = runBomCode(catalog, { A: "ZZ", B: "10" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNKNOWN_PRODUCT");
  });
  it("every line traces back to a registered child code + relationship seq", () => {
    const r = runBomCode(catalog, S55, 455.4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lines).toHaveLength(11);
    const codes = new Set(catalog.productCodes.map((p) => p.code));
    for (const l of r.lines) expect(codes.has(l.childCode)).toBe(true);
    expect(r.lines.map((l) => l.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it("conditions select children: option D, approved-macro value", () => {
    const base = runBomCode(catalog, { A: "ER", B: "10", C: "0480" });
    const rotor = runBomCode(catalog, { A: "ER", B: "10", C: "0480", D: "630" });
    const macro = runBomCode(catalog, { A: "ER", B: "10", C: "0480" }, 100);
    if (!base.ok || !rotor.ok || !macro.ok) throw new Error("run failed");
    expect(base.lines.some((l) => l.childCode === "KHR 1")).toBe(false);
    expect(rotor.lines.some((l) => l.childCode === "KHR 1")).toBe(true);
    expect(base.lines.some((l) => l.childCode === "PVI 1")).toBe(false);
    expect(macro.lines.find((l) => l.childCode === "PVI 1")?.spec).toBe("for 100 kg (macro)");
  });
  it("numbers come from registered tables: editing a table row changes the BOM, no code change", () => {
    const edited = JSON.parse(JSON.stringify(catalog)) as Catalog;
    for (const p of edited.productCodes) if (p.tables.cap) p.tables.cap.rows["55"]!.fanKw = 30;
    const r = runBomCode(edited, S55);
    if (!r.ok) throw new Error("run failed");
    expect(r.lines.find((l) => l.childCode === "KFP 1")?.spec).toMatch(/^30kW/);
  });
  it("a relationship that points at a missing table column is an error, never a silent 0", () => {
    const broken = JSON.parse(JSON.stringify(catalog)) as Catalog;
    broken.relationships[0]!.qty = { ref: "cap.nope" };
    const r = runBomCode(broken, S55);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNKNOWN_REF");
  });
  it("a chosen slot value with no table row is an error — never another size's numbers", () => {
    const r = runBomCode(catalog, { A: "EU", B: "80", C: "2123" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("B='80'");
    expect(runBomCode(catalog, { A: "EU", C: "2123" }).ok).toBe(true); // empty slot → default row
  });
  it("sections follow the product code's registered section list", () => {
    const eu = catalog.productCodes.find((p) => p.code === "EU")!;
    expect(sectionsFor(eu, S55)).toEqual(["Mixing", "Filter", "Rotor", "Coil", "Fan"]);
    expect(sectionsFor(eu, { A: "EU", D: "A1" })).toContain("Humid.");
  });
  it("deterministic + fingerprint is order-independent", () => {
    expect(runBomCode(catalog, S55, 455.4)).toEqual(runBomCode(catalog, { ...S55 }, 455.4));
    const shuffled: Catalog = { ...catalog, relationships: [...catalog.relationships].reverse() };
    expect(catalogFingerprint(shuffled)).toBe(catalogFingerprint(catalog));
  });
});
