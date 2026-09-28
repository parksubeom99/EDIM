import { describe, it, expect } from "vitest";
import { designRulesOf, checkDesign, designFacts, type ProductCode, type MacroRuleEval, type SectionDim } from "../src/index";

/** E6 · p39 "설계 검증 [Macro]" — 규칙 표의 op=macro 행. 매크로 실행은 주입(evalMacro)이라 여기서는 가짜로 대신한다. */
const product = {
  code: "EU", kind: "product", slots: [], lines: [],
  tables: {
    rule: {
      no: 9, role: "rule", by: "A", default: "",
      cols: [{ key: "A", name: "name" }, { key: "B", name: "target" }, { key: "C", name: "op" }, { key: "D", name: "value" }],
      rows: [
        { item: "r1", cells: { A: "전장 운반 한계", B: "L", C: "max", D: 9000 } },
        { item: "r2", cells: { A: "구획 비율", B: "", C: "macro", D: "V_SECTION_RATIO" } },
        { item: "r3", cells: { A: "빈 매크로", B: "", C: "macro", D: "" } },
      ],
    },
  },
} as unknown as ProductCode;

const dims = { W: 1200, H: 1500, L: 900 };
const even: SectionDim[] = [{ name: "Fan", len: 900 }, { name: "Coil", len: 900 }, { name: "Filter", len: 900 }];
const lopsided: SectionDim[] = [{ name: "Fan", len: 4500 }, { name: "Coil", len: 900 }, { name: "Filter", len: 900 }];

/** 가짜 실행기: V_SECTION_RATIO = 가장 긴 구획이 전장의 50% 이하면 1 */
const ev = (over: Partial<Record<string, ReturnType<MacroRuleEval>>> = {}): MacroRuleEval => (name, f) =>
  over[name] ?? (name === "V_SECTION_RATIO" ? { ok: true, value: (f.LMAXPCT ?? 0) <= 50 ? 1 : 0 } : { ok: false, reason: "missing" });

describe("design rules — op=macro (p39 설계 검증 Macro)", () => {
  it("reads a macro row as a rule; an empty macro name is not a rule", () => {
    const rules = designRulesOf(product);
    expect(rules).toHaveLength(2);
    expect(rules[1]).toEqual({ name: "구획 비율", target: "MACRO", op: "macro", macro: "V_SECTION_RATIO" });
  });
  it("pass: macro returns 1 → no violation", () => {
    expect(checkDesign(designRulesOf(product), dims, even, ev())).toEqual([]);
  });
  it("violation: macro returns 0 → violation named by the rule", () => {
    const v = checkDesign(designRulesOf(product), dims, lopsided, ev());
    expect(v).toEqual([{ name: "구획 비율", target: "MACRO", op: "macro", limit: "V_SECTION_RATIO", actual: 0 }]);
  });
  it("unapproved macro is not a pass", () => {
    const v = checkDesign(designRulesOf(product), dims, even, ev({ V_SECTION_RATIO: { ok: false, reason: "unapproved" } }));
    expect(v.map((x) => x.name)).toEqual(["검증 매크로 미승인: V_SECTION_RATIO"]);
  });
  it("missing macro (or no evaluator) is not a pass", () => {
    const v = checkDesign(designRulesOf(product), dims, even, ev({ V_SECTION_RATIO: { ok: false, reason: "missing" } }));
    expect(v.map((x) => x.name)).toEqual(["검증 매크로 없음: V_SECTION_RATIO"]);
    expect(checkDesign(designRulesOf(product), dims, even).map((x) => x.name)).toEqual(["검증 매크로 없음: V_SECTION_RATIO"]);
  });
  it("runtime error — and a result that is neither 1 nor 0 — is not a pass", () => {
    const e1 = checkDesign(designRulesOf(product), dims, even, ev({ V_SECTION_RATIO: { ok: false, reason: "error", message: "division by zero" } }));
    expect(e1).toEqual([{ name: "검증 매크로 오류: V_SECTION_RATIO", target: "MACRO", op: "macro", limit: "V_SECTION_RATIO", actual: "division by zero" }]);
    const e2 = checkDesign(designRulesOf(product), dims, even, ev({ V_SECTION_RATIO: { ok: true, value: 2 } }));
    expect(e2.map((x) => x.name)).toEqual(["검증 매크로 오류: V_SECTION_RATIO"]);
  });
  it("numeric rules still judge alongside (L max 9000)", () => {
    const long: SectionDim[] = [{ name: "Fan", len: 4000 }, { name: "Coil", len: 4000 }, { name: "Filter", len: 4000 }];
    expect(checkDesign(designRulesOf(product), dims, long, ev()).map((x) => x.target)).toEqual(["L"]);
  });
  it("facts are counts of the snapshot, not new calculation", () => {
    expect(designFacts(dims, lopsided)).toEqual({ L: 6300, W: 1200, H: 1500, SECTIONS: 3, COMPONENTS: 0, LMAX: 4500, LMAXPCT: 71 });
  });
});
