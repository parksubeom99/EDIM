import { describe, it, expect } from "vitest";
import demo from "../catalog/ahu-demo.json";
import { runBomCode, specialCallOf, resolveSpecialInputs, dimsFor, type Catalog, type SpecialCall } from "../src/index";

/**
 * ccmd K · KA — CPQ 가 BOM Run 안에서 Special(팬 선정)을 부른다: 엔진 쪽(순수) 단위 시험.
 *   ① 호출 선언(special 표) 읽기 ② 입력 수집(표 칸 · 치수 · 상수 — 사람 입력 없음) ③ 결과 → 사양 문자열 ④ 모터 kW → 단가 행.
 */
const catalog = demo as unknown as Catalog;
const SPF = catalog.productCodes.find((p) => p.code === "SPF")!;
const PICK = { model: "EDIM-PF-560 (샘플)", rpm: 2600, q: 11844, p: 585, eta: 0.736, etaPct: 73.6, shaftKw: 2.612, motorKw: "3.7" };

describe("special 표 — 호출 선언", () => {
  it("샘플 제품 SPF 는 fan-select 를 필수로 부른다 · 입력 두 개(q_cmh · p_pa)", () => {
    const c = specialCallOf(SPF) as SpecialCall;
    expect(c.program).toBe("fan-select");
    expect(c.required).toBe(true);
    expect(c.inputs.map((i) => [i.input, i.from])).toEqual([["q_cmh", "air.q_cmh"], ["p_pa", "air.p_pa"]]);
  });
  it("기존 시연 제품(EU · ER · EC)에는 special 표가 없다 → 부르지 않는다", () => {
    for (const code of ["EU", "ER", "EC"]) expect(specialCallOf(catalog.productCodes.find((p) => p.code === code)!)).toBeNull();
  });
  it("프로그램이 둘이면 오류(한 제품 = 한 Special)", () => {
    const bad = structuredClone(SPF);
    bad.tables.spc!.rows[1]!.cells.A = "other";
    expect(specialCallOf(bad)).toHaveProperty("error");
  });
});

describe("입력 수집 — 등록 값에서(사람이 다시 치지 않는다)", () => {
  const call = specialCallOf(SPF) as SpecialCall;
  it("표 칸: B=55 → 12,000 CMH · 600 Pa · B=25 → 10,000 · 500", () => {
    const d55 = dimsFor(SPF, { A: "SPF", B: "55" });
    const r = resolveSpecialInputs(SPF, call, { A: "SPF", B: "55" }, d55.ok ? d55.dims : null);
    expect(r).toMatchObject({ ok: true, values: { q_cmh: 12000, p_pa: 600 } });
    const r25 = resolveSpecialInputs(SPF, call, { A: "SPF", B: "25" }, null);
    expect(r25).toMatchObject({ ok: true, values: { q_cmh: 10000, p_pa: 500 } });
  });
  it("치수 · 상수 출처", () => {
    const c2: SpecialCall = { ...call, inputs: [{ input: "q_cmh", from: "dim.W", required: true }, { input: "p_pa", from: "450", required: true }] };
    const d = dimsFor(SPF, { A: "SPF", B: "55" });
    expect(resolveSpecialInputs(SPF, c2, { A: "SPF", B: "55" }, d.ok ? d.dims : null)).toMatchObject({ ok: true, values: { q_cmh: 2472, p_pa: 450 } });
  });
  it("등록 안 된 행이면 지어내지 않고 거부", () => {
    const r = resolveSpecialInputs(SPF, call, { A: "SPF", B: "99" }, null);
    expect(r.ok).toBe(false);
  });
});

describe("결과 → BOM 줄", () => {
  it("팬 · 모터 줄의 사양이 선정 결과를 읽고 · 단가는 모델 · 모터 kW 행에서 · fromSpecial 표시", () => {
    const r = runBomCode(catalog, { A: "SPF", B: "55" }, null, PICK);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const fan = r.lines.find((l) => l.childCode === "SFN 1")!;
    const motor = r.lines.find((l) => l.childCode === "SMT 1")!;
    expect(fan.spec).toBe("EDIM-PF-560 (샘플) · 2600 rpm · η 73.6%");
    expect(fan.unitCost).toBe(1500000);
    expect(motor.spec).toBe("3.7 kW · 4P · 380V (샘플)");
    expect(motor.unitCost).toBe(420000);
    expect(motor.supplier).toBe("샘플 모터사");
    expect(fan.fromSpecial && motor.fromSpecial).toBe(true);
    expect(r.lines.find((l) => l.childCode === "SCS 1")!.fromSpecial).toBeUndefined();
  });
  it("모터 kW 가 바뀌면 단가 행도 바뀐다(5.5 kW → 560,000)", () => {
    const r = runBomCode(catalog, { A: "SPF", B: "12" }, null, { ...PICK, model: "EDIM-PF-450 (샘플)", motorKw: "5.5" });
    expect(r.ok && r.lines.find((l) => l.childCode === "SMT 1")!.unitCost).toBe(560000);
    expect(r.ok && r.lines.find((l) => l.childCode === "SFN 1")!.unitCost).toBe(1200000);
  });
  it("Special 결과 없이 SPF 를 돌리면 UNKNOWN_REF(0 이나 빈칸으로 메우지 않는다)", () => {
    const r = runBomCode(catalog, { A: "SPF", B: "55" }, null, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNKNOWN_REF");
  });
  it("단가 표에 없는 모터 kW 면 거부", () => {
    const r = runBomCode(catalog, { A: "SPF", B: "55" }, null, { ...PICK, motorKw: "4.0" });
    expect(r.ok).toBe(false);
  });
  it("기존 시연 코드는 Special 값을 줘도 그대로(읽지 않는다) — 11행", () => {
    const slots = { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" };
    const a = runBomCode(catalog, slots, 455.4);
    const b = runBomCode(catalog, slots, 455.4, PICK);
    expect(a.ok && a.lines.length).toBe(11);
    expect(b).toEqual(a);
  });
});
