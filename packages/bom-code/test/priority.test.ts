import { describe, it, expect } from "vitest";
import demo from "../catalog/ahu-demo.json";
import { priorityRowsOf, compilePriorityRules, priorityVerdict, checkDesign, designRulesOf, type Catalog, type ProductCode } from "../src/index";

const catalog = demo as unknown as Catalog;
const spf = catalog.productCodes.find((p) => p.code === "SPF") as ProductCode;
const eu = catalog.productCodes.find((p) => p.code === "EU") as ProductCode;
const dims = { W: 2472, H: 2472, L: 900 };
const secs = ["Mixing", "Filter", "Coil", "Fan"].map((name) => ({ name, len: 900 }));
const details = [{ target: "Fan", label: "A", value: 1250 }, { target: "Fan", label: "B", value: 1400 }];

describe("ccmd L · LA6 · p42 설계 우선순위", () => {
  it("SPF 샘플에만 우선순위 표(4행) · EU 시연 제품에는 없다 · 샘플 치수에서는 전부 통과", () => {
    const rows = priorityRowsOf(spf);
    expect(rows.map((r) => [r.target, r.priority, r.upper])).toEqual([["W", 1, true], ["H", 2, false], ["detail.Fan.A", 3, false], ["L", 4, false]]);
    expect(priorityRowsOf(eu)).toEqual([]);
    const facts = { W: 2472, H: 2472, L: 3600 };
    const c = compilePriorityRules(rows, facts);
    expect(c.rules.map((r) => [r.target, r.op, "value" in r ? r.value : null])).toEqual([["W", "max", 3000], ["H", "max", 3000], ["detail.Fan.A", "max", 1300], ["L", "min", 300]]);
    expect(checkDesign([...designRulesOf(spf), ...c.rules], dims, secs, undefined, details as never)).toEqual([]);
  });
  it("위반 여럿 → 우선순위가 낮은(숫자가 큰) 치수부터 '바꿀 후보' · 상위설계 우선자료는 '바꾸지 말 것' · 우변 W 는 이 Run 의 치수 · 못 읽는 식은 unreadable", () => {
    const rows = [
      { target: "W", priority: 1, upper: true, datum: "Base", check: "<= 2000", remarks: "" },
      { target: "H", priority: 2, upper: false, datum: "Base", check: "< W", remarks: "" },
      { target: "L", priority: 4, upper: false, datum: "Base", check: "<= 3000", remarks: "" },
      { target: "detail.Fan.A", priority: 3, upper: false, datum: "Shaft", check: "<= 1300", remarks: "" },
      { target: "H", priority: 5, upper: false, datum: "", check: "≈ 12", remarks: "" },
    ];
    const c = compilePriorityRules(rows, { W: 2400, H: 2472, L: 3600 });
    const v = checkDesign(c.rules, { W: 2400, H: 2472, L: 900 }, secs, undefined, details as never);
    const p = priorityVerdict(rows, c, v);
    expect(p.candidates.map((x) => [x.target, x.priority])).toEqual([["L", 4], ["H", 2]]);
    expect(p.keep.map((x) => x.target)).toEqual(["W"]);
    expect(p.unreadable).toEqual([{ target: "H", check: "≈ 12" }]);
    expect(p.violated).toBe(3);
    expect(priorityVerdict(rows, c, v)).toEqual(p);   // 같은 입력 = 같은 답
  });
});
