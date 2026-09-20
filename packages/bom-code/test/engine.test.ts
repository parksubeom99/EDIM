import { describe, it, expect } from "vitest";
import demo from "../catalog/ahu-demo.json";
import { runBomCode, sectionsFor, catalogFingerprint, macroTablesOf, dimsFor, dimTableOf, type Catalog, type ProductCode } from "../src/index";

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
    for (const p of edited.productCodes) if (p.tables.cap) p.tables.cap.rows.find((r) => r.item === "55")!.cells.A = 30; // column A = fanKw
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
  it("unified table: a BOM ref works by column name or by letter, on the same registered table", () => {
    const byLetter = JSON.parse(JSON.stringify(catalog)) as Catalog;
    for (const p of byLetter.productCodes) if (p.code === "PVF 1") p.specTemplate = "{cap.A}kW VFD";
    const a = runBomCode(catalog, S55);
    const b = runBomCode(byLetter, S55);
    if (!a.ok || !b.ok) throw new Error("run failed");
    expect(b.lines.find((l) => l.childCode === "PVF 1")?.spec).toBe(a.lines.find((l) => l.childCode === "PVF 1")?.spec);
  });
  it("unified table: the Macro reads the same table as TableN(letter, rowNumbers)", () => {
    const eu = catalog.productCodes.find((p) => p.code === "EU")!;
    const { tables, labels } = macroTablesOf(eu);
    expect(tables["1!A"]).toEqual({ 1: 3.7, 2: 5.5, 3: 11, 4: 22 }); // what Table1(A,r:r) has always meant
    expect(tables["1!B"]).toEqual({ 1: 4, 2: 4, 3: 6, 4: 8 });
    expect(tables["1!C"]).toEqual({ 1: 25, 2: 25, 3: 50, 4: 50 });
    expect(labels["1!A"]).toBe("팬 모터 kW");
    expect(tables["3!A"]).toBeUndefined(); // text column (재질 표기) is not a Macro column
    expect(tables["3!B"]).toEqual({ 1: 1, 2: 1.6, 3: 1.35 });
  });
  it("p34 resolved child code = child code + seq of the parent's choices for the slots it reads", () => {
    const r = runBomCode(catalog, S55, 455.4);
    if (!r.ok) throw new Error("run failed");
    const code = (c: string) => r.lines.find((l) => l.childCode === c)?.resolvedCode;
    expect(r.mainCode).toBe("EU-4-2-1-1"); // B=55→4 · C=2123→2 · D=630→1 · E=SS→1
    expect(code("KFP 1")).toBe("KFP 1-4"); // reads capacity only
    expect(code("KCP 1")).toBe("KCP 1-4-1-1"); // capacity · option(panel qty) · material
    expect(code("KHR 1")).toBe("KHR 1-4-1"); // capacity + the option that selects it
    expect(code("PFP 1")).toBe("PFP 1-4"); // filter qty by capacity
    expect(code("KCD 1")).toBe("KCD 1-4");
    expect(code("PVI 1")).toBe("PVI 1"); // reads no slot
    const base = runBomCode(catalog, { A: "EU", B: "10", C: "0480" });
    if (!base.ok) throw new Error("run failed");
    expect(base.mainCode).toBe("EU-1-1-0-0");
    expect(base.lines.find((l) => l.childCode === "KCP 1")?.resolvedCode).toBe("KCP 1-1-0-0"); // empty slot → 0
  });
});

describe("P4-a Key Dimension (p38~40) — 치수는 등록 표에서만 나온다", () => {
  const eu = catalog.productCodes.find((p) => p.code === "EU")! as ProductCode;

  it("제품 코드에 치수 표(Dim)가 등록되어 있다", () => {
    const t = dimTableOf(eu);
    expect(t).not.toBeNull();
    expect(t!.role).toBe("dim");
    expect(t!.cols.map((c) => c.name)).toEqual(expect.arrayContaining(["W", "H", "L"]));
  });

  it("슬롯 값으로 그 행의 치수를 읽는다", () => {
    const r = dimsFor(eu, S55);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.item).toBe("55");
    expect(r.dims.W).toBe(2472);
    expect(r.dims.L).toBe(900);
  });

  it("슬롯이 비면 default 행을 쓴다", () => {
    const r = dimsFor(eu, { A: "EU" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.item).toBe("10");
  });

  it("치수 표가 없으면 추측하지 않고 거부한다", () => {
    const noDim: ProductCode = { ...eu, tables: { cap: eu.tables.cap! } };
    const r = dimsFor(noDim, S55);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NO_DIM_TABLE");
  });

  it("고른 값의 행이 없으면 거부한다", () => {
    const r = dimsFor(eu, { ...S55, B: "99" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NO_DIM_ROW");
  });

  it("치수 한 칸을 고치면 읽히는 값이 바뀐다 (변경 전파의 출발점)", () => {
    const t = dimTableOf(eu)!;
    const edited: ProductCode = {
      ...eu,
      tables: {
        ...eu.tables,
        dim: { ...t, rows: t.rows.map((r) => (r.item === "55" ? { ...r, cells: { ...r.cells, A: 2600 } } : r)) },
      },
    };
    const r = dimsFor(edited, S55);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dims.W).toBe(2600);
  });
});
