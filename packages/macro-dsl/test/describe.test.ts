import { describe as suite, it, expect } from "vitest";
import { parse, describe } from "../src/index";

const DEMO = "=IF(CAP,CAP>25, SUM(Table1(A,4:4))*Var(NS,15)*Var(NS,20), SUM(Table1(A,1:1))*Var(NS,20))";
const G = { tables: { "1!A": "팬 모터 kW" }, vars: { "NS|15": "안전율", "NS|20": "kW당 kg" }, codes: { CAP: "용량" } };

function d(src: string, g = {}) {
  const p = parse(src);
  if (!p.ok) throw new Error(p.error.message);
  return describe(p.value, g);
}

suite("STEP 5 — 역번역 (deterministic back-translation)", () => {
  it("the demo macro reads as a Korean sentence an approver can check", () => {
    const r = d(DEMO, G);
    expect(r.text).toBe(
      "결과 = 만약 용량(CAP)이(가) 25보다 크면 ((표1의 A열(팬 모터 kW) 4행의 합 × 변수 NS·15(안전율)) × 변수 NS·20(kW당 kg)), 아니면 (표1의 A열(팬 모터 kW) 1행의 합 × 변수 NS·20(kW당 kg))",
    );
  });
  it("lists every external symbol the macro reads", () => {
    expect(d(DEMO).reads).toEqual({ tables: ["1!A"], vars: ["NS|15", "NS|20"], codes: ["CAP"] });
  });
  it("IF becomes a decision with yes/no branches; nested IF nests", () => {
    const f = d("=IF(CAP>25, IF(E=1, 3, 2), 1)", G).flow;
    expect(f.kind).toBe("decision");
    if (f.kind !== "decision") return;
    expect(f.label).toBe("용량(CAP)이(가) 25보다 큰가?");
    expect(f.yes.kind).toBe("decision");
    expect(f.no).toEqual({ kind: "process", label: "1" });
  });
  it("shows the executor's real evaluation order (no precedence, left to right)", () => {
    expect(d("=1+2*3").text).toBe("결과 = (1 + 2) × 3");
  });
  it("without a glossary it falls back to the raw symbols", () => {
    expect(d("=ROUND(Var(NS,15)*2, 1)").text).toBe("결과 = (변수 NS·15 × 2)을(를) 소수 1자리로 반올림");
  });
  it("deterministic", () => {
    expect(d(DEMO, G)).toEqual(d(DEMO, G));
  });
});
