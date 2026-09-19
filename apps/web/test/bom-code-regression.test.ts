import { describe, it, expect } from "vitest";
import demo from "@edim/bom-code/catalog/ahu-demo.json";
import { runBomCode, toBomLine, sectionsFor, type Catalog } from "@edim/bom-code";
import { buildBom, sectionsOf } from "../app/lib/output/bom";

/**
 * P1 regression — the code-based BOM (registered codes + relationships + tables)
 * must reproduce the M3 slot→function BOM exactly, over the WHOLE catalog domain,
 * not just the demo code. buildBom stays only as this oracle.
 */
const catalog = demo as unknown as Catalog;
const A = ["EU", "ER", "EC"];
const B = [undefined, "10", "12", "25", "55"];
const D = [undefined, "", "630", "A1", "H2"];
const E = [undefined, "", "SS", "AL"];
const MACRO = [null, 455.4, 0, 99.5];

describe("P1 — code-based BOM ≡ legacy buildBom", () => {
  it("identical lines for every catalog combination", () => {
    let n = 0;
    for (const a of A) for (const b of B) for (const d of D) for (const e of E) for (const m of MACRO) {
      const slots = { A: a, B: b, C: "2123", D: d, E: e, F: "1-21-13-15" };
      const r = runBomCode(catalog, slots, m);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.lines.map(toBomLine)).toEqual(buildBom(slots, m));
      const p = catalog.productCodes.find((x) => x.code === a)!;
      expect(sectionsFor(p, slots, m)).toEqual(sectionsOf(slots));
      n++;
    }
    expect(n).toBe(3 * 5 * 5 * 4 * 4);
  });
  it("the demo code still yields 11 lines", () => {
    const r = runBomCode(catalog, { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" }, 455.4);
    expect(r.ok && r.lines.length).toBe(11);
  });
});
