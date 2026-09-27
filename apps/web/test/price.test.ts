import { describe, it, expect } from "vitest";
import demo from "@edim/bom-code/catalog/ahu-demo.json";
import { runBomCode, catalogFingerprint, buyItemOf, type Catalog } from "@edim/bom-code";
import { currentByItem, currentPriceFor, applyPriceHistory, type PriceRowLike } from "../app/lib/price";
import { businessToday } from "../app/lib/today";
import { buildCost } from "../app/lib/output/bom";

// ccmd E — p67 단가 이력 → BOM 원가. "현재 단가" 판정은 가격 화면과 BOM Run 이 같은 함수를 쓴다.
const row = (id: string, effectiveFrom: string, price: number, extra: Partial<PriceRowLike> = {}): PriceRowLike =>
  ({ id, item: "", price, currency: "KRW", supplier: "", effectiveFrom, createdAt: new Date(`${effectiveFrom}T01:00:00Z`), ...extra });

describe("current price (p67) — one rule for the price screen and the BOM run", () => {
  const rows = [row("past", "2026-01-01", 1_200_000), row("now", "2026-09-26", 1_280_000), row("future", "2099-01-01", 1_500_000)];
  it("future (예정) and past rows are not current — only the latest effective <= today", () => {
    expect(currentByItem(rows, "2026-09-27")[""]!.id).toBe("now");
  });
  it("same effective date → the later registration wins", () => {
    const again = row("again", "2026-09-26", 1_300_000, { createdAt: new Date("2026-09-26T05:00:00Z") });
    expect(currentByItem([...rows, again], "2026-09-27")[""]!.id).toBe("again");
  });
  it("a row for the line's own item wins over the item-less row", () => {
    const withItem = [...rows, row("item55", "2026-02-01", 990_000, { item: "55" })];
    expect(currentPriceFor(withItem, "55", "2026-09-27")!.id).toBe("item55");
    expect(currentPriceFor(withItem, "10", "2026-09-27")!.id).toBe("now");
  });
  it("KST dawn boundary: at 2026-09-27 00:21 KST a row effective 09-27 is already current", () => {
    const today = businessToday(new Date("2026-09-26T15:21:00Z"));
    expect(today).toBe("2026-09-27");
    expect(currentPriceFor([row("d27", "2026-09-27", 777)], null, today)!.id).toBe("d27");
  });
});

describe("applying history to BOM lines", () => {
  const catalog = demo as unknown as Catalog;
  const S = { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" } as const;
  const r = runBomCode(catalog, S, 455.4);
  if (!r.ok) throw new Error("demo BOM must run");
  const target = r.lines.find((l) => l.kind === "purchase")!;
  const productOf = new Map(catalog.productCodes.map((p) => [p.code, p]));
  const itemOf = (l: { childCode: string }) => { const p = productOf.get(l.childCode); return p ? buyItemOf(p, S) : null; };

  it("history price replaces the relationship value on that line only, with its source", () => {
    const priced = applyPriceHistory(r.lines, new Map([[target.childCode, [row("p1", "2026-09-01", 25_000.4)]]]), itemOf, "2026-09-27");
    const t = priced.find((l) => l.no === target.no)!;
    expect(t.unitCost).toBe(25_000);   // 원 단위 반올림
    expect(t.priceSource).toEqual({ kind: "history", priceId: "p1", effectiveFrom: "2026-09-01", supplier: "" });
    const others = priced.filter((l) => l.no !== target.no);
    expect(others.every((l) => l.priceSource.kind === "relationship")).toBe(true);
    expect(others.map((l) => l.unitCost)).toEqual(r.lines.filter((l) => l.no !== target.no).map((l) => l.unitCost));
    // 원가는 바뀐 unitCost 로 자연히 바뀐다(배율 18%/12% 그대로)
    const c = buildCost(priced);
    expect(c.material).toBe(priced.reduce((a, l) => a + l.qty * l.unitCost, 0));
  });
  it("non-KRW is not applied — relationship value stays, source says currency-mismatch", () => {
    const priced = applyPriceHistory(r.lines, new Map([[target.childCode, [row("usd", "2026-09-01", 20, { currency: "USD" })]]]), itemOf, "2026-09-27");
    const t = priced.find((l) => l.no === target.no)!;
    expect(t.unitCost).toBe(target.unitCost);
    expect(t.priceSource).toEqual({ kind: "currency-mismatch", priceId: "usd" });
  });
  it("prices are not part of the catalog fingerprint (a price row never blocks an old snapshot)", () => {
    const before = catalogFingerprint(catalog);
    applyPriceHistory(r.lines, new Map([[target.childCode, [row("p1", "2026-09-01", 25_000)]]]), itemOf, "2026-09-27");
    expect(catalogFingerprint(catalog)).toBe(before);
  });
});
