import { describe, it, expect } from "vitest";
import { parse } from "@edim/macro-dsl";
import { FUNCS, buildCall, asMacro } from "../app/lib/macro-wizard";

/** H8 · p57 함수 마법사 — 만든 글자는 기존 파서(grammar v1.0)가 그대로 받아야 한다 */
describe("H8 함수 마법사", () => {
  it("v1 함수셋 13개 — 청사진 · ccmd 목록 그대로", () => {
    expect(FUNCS.map((f) => f.fn).sort()).toEqual(["AND", "AVG", "IF", "LOOKUP", "MAX", "MIN", "OR", "PreC", "ROUND", "Run", "SUM", "Table", "Var"].sort());
  });
  it("모든 함수의 예시 인자로 만든 식을 파서가 받는다", () => {
    for (const f of FUNCS) {
      const b = buildCall(f.fn, Object.fromEntries(f.args.map((a) => [a.key, a.ph])));
      expect(b.ok, f.fn).toBe(true);
      if (!b.ok) continue;
      // AND/OR 는 조건식이라 단독 식이 되려면 IF 안에서 쓴다 — 그래도 파서는 식 자리에서 받는다
      const r = parse(asMacro(b.text));
      expect(r.ok, `${f.fn}: ${asMacro(b.text)} ${r.ok ? "" : r.error.message}`).toBe(true);
    }
  });
  it("모양이 틀린 인자는 글자를 만들지 않고 이유를 말한다", () => {
    expect(buildCall("Table", { no: "1", col: "A", r0: "5", r1: "1" })).toEqual({ ok: false, error: "시작 행이 끝 행보다 큽니다" });
    expect(buildCall("IF", { cond: "CAP 25", then: "1", else: "0" }).ok).toBe(false);
    expect(buildCall("SUM", { table: "A1:A4" }).ok).toBe(false);
    expect(buildCall("ROUND", { value: "", digits: "1" }).ok).toBe(false);
    expect(buildCall("NOPE", {}).ok).toBe(false);
  });
  it("조합 — IF 안에 SUM, 끝에 Run", () => {
    const inner = buildCall("SUM", { table: "Table1(A,4:4)" });
    if (!inner.ok) throw new Error(inner.error);
    const b = buildCall("IF", { cond: "CAP>25", then: inner.text, else: "0" });
    if (!b.ok) throw new Error(b.error);
    const run = buildCall("Run", { body: b.text, target: "3" });
    if (!run.ok) throw new Error(run.error);
    expect(asMacro(run.text)).toBe("=IF(CAP>25, SUM(Table1(A,4:4)), 0) Run 3");
    expect(parse(asMacro(run.text)).ok).toBe(true);
  });
});
