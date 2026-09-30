import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  detailDimsOf, detailFacts, designRulesOf, checkDesign, parseCadRules, componentMm, datumMm, kadValues,
  type ProductCode, type TechTable,
} from "../src/index";

const size: TechTable = {
  no: 5, by: "B", default: "55",
  cols: [{ key: "A", name: "A" }, { key: "B", name: "B" }],
  rows: [{ item: "10", cells: { A: 679, B: 760 } }, { item: "55", cells: { A: 1250, B: 1400 } }],
};
const det = (rows: TechTable["rows"]): TechTable => ({
  no: 4, role: "detail", by: "B", default: "55",
  cols: [{ key: "A", name: "target" }, { key: "B", name: "label" }, { key: "C", name: "value" }, { key: "D", name: "from" }],
  rows,
});
const prod = (tables: Record<string, TechTable>): ProductCode => ({
  code: "SPF", name: "샘플", kind: "product", category: "", unit: "set", specTemplate: "", materialTemplate: "", tables,
});

describe("KC-1 Detail Dimension — role detail 표", () => {
  const p = prod({
    fsz: size,
    det: det([
      { item: "1", cells: { A: "Fan", B: "A", C: "", D: "fsz.A" } },
      { item: "2", cells: { A: "SMT 1", B: "c", C: 350, D: "" } },
    ]),
  });

  it("from = 슬롯으로 고른 사이즈 행 · value = 등록 값 · label 은 대문자", () => {
    const r = detailDimsOf(p, { B: "10" });
    expect(r && r.ok && r.dims).toEqual([
      { target: "Fan", label: "A", value: 679, source: "fsz.A(Table5 · B=10)" },
      { target: "SMT 1", label: "C", value: 350, source: "등록 값" },
    ]);
    const d = detailDimsOf(p, {});   // 빈 슬롯 → default 행(55)
    expect(d && d.ok && d.dims[0]!.value).toBe(1250);
  });

  it("표가 없으면 null — 기존 제품은 세부 치수를 쓰지 않는다", () => {
    expect(detailDimsOf(prod({ fsz: size }), { B: "10" })).toBeNull();
  });

  it("틀린 등록은 이유와 함께 거부한다(0 으로 메우지 않는다)", () => {
    const bad = (rows: TechTable["rows"]) => detailDimsOf(prod({ fsz: size, det: det(rows) }), { B: "10" });
    expect(bad([{ item: "1", cells: { A: "Fan", B: "Z", C: 10, D: "" } }])).toMatchObject({ ok: false, message: expect.stringContaining("A~K") });
    expect(bad([{ item: "1", cells: { A: "Fan", B: "A", C: "", D: "nope.A" } }])).toMatchObject({ ok: false, message: expect.stringContaining("표가 이 제품 코드에 없습니다") });
    expect(bad([{ item: "1", cells: { A: "Fan", B: "A", C: 0, D: "" } }])).toMatchObject({ ok: false, message: expect.stringContaining("양수") });
    expect(bad([{ item: "1", cells: { A: "Fan", B: "A", C: 5, D: "" } }, { item: "2", cells: { A: "Fan", B: "A", C: 6, D: "" } }]))
      .toMatchObject({ ok: false, message: expect.stringContaining("두 번") });
    expect(detailDimsOf(prod({ fsz: size, det: det([{ item: "1", cells: { A: "Fan", B: "A", C: "", D: "fsz.A" } }]) }), { B: "99" }))
      .toMatchObject({ ok: false, message: expect.stringContaining("B=99 행이 없습니다") });
  });

  it("설계 검증 규칙이 detail.<대상>.<label> 에도 걸린다 · 없는 세부 치수는 위반('없음')", () => {
    const rule: TechTable = {
      no: 6, role: "rule", by: "B", default: "",
      cols: [{ key: "A", name: "target" }, { key: "B", name: "op" }, { key: "C", name: "value" }, { key: "D", name: "name" }],
      rows: [
        { item: "R1", cells: { A: "detail.Fan.A", B: "max", C: 1300, D: "팬 세부 A 한계" } },
        { item: "R2", cells: { A: "DETAIL.SMT 1.K", B: "min", C: 1, D: "없는 치수" } },
      ],
    };
    const rules = designRulesOf(prod({ rul: rule }));
    expect(rules.map((r) => r.target)).toEqual(["detail.Fan.A", "detail.SMT 1.K"]);
    const dims = { W: 2472, H: 2472, L: 900 };
    const ok = checkDesign(rules.slice(0, 1), dims, [], undefined, [{ target: "Fan", label: "A", value: 1250, source: "" }]);
    expect(ok).toEqual([]);
    const bad = checkDesign(rules, dims, [], undefined, [{ target: "Fan", label: "A", value: 1400, source: "" }]);
    expect(bad).toEqual([
      { name: "팬 세부 A 한계", target: "detail.Fan.A", op: "max", limit: 1300, actual: 1400 },
      { name: "없는 치수", target: "detail.SMT 1.K", op: "min", limit: 1, actual: "없음" },
    ]);
    expect(detailFacts([{ target: "Fan", label: "A", value: 1, source: "" }])).toEqual({ "detail.Fan.A": 1 });
  });
});

describe("KC-2 CAD 규칙서(샘플) 파일", () => {
  const sample = JSON.parse(readFileSync(resolve(__dirname, "../cad-rules/cad-rules.sample.json"), "utf-8"));

  it("저장소의 샘플 규칙서는 통과하고 '샘플' · 'RCCS 문법 미확정' 표지를 가진다", () => {
    const r = parseCadRules(sample);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rules.sample).toContain("샘플");
    expect(r.rules.kad.note).toContain("RCCS 문법 미확정");
    expect(r.rules.kad.slots.map((s) => s.key)).toEqual(["dim.W", "dim.H", "dim.L", "detail.Fan.A", "detail.Fan.B"]);
  });

  it("칸 → mm · 기준점 · 오프셋만 바꾼 사본은 좌표만 바뀐다", () => {
    const a = parseCadRules(sample), b = parseCadRules({ ...sample, grid: { ...sample.grid, offsetMm: { x: 100, y: -50 } } });
    if (!a.ok || !b.ok) throw new Error("parse");
    expect(componentMm(a.rules, 2700, 900, 2472, "center", "mid")).toEqual({ x: 3150, y: 1236 });
    expect(componentMm(b.rules, 2700, 900, 2472, "center", "mid")).toEqual({ x: 3250, y: 1186 });
    expect(datumMm(a.rules, 2700, 900, 2472)).toEqual([{ name: "Shaft", x: 3150, y: 1236 }, { name: "Foot", x: 2750, y: 0 }]);
  });

  it("KAD 슬롯 값 = 대응표의 치수 키 · 없는 키는 '?'", () => {
    const a = parseCadRules(sample);
    if (!a.ok) throw new Error("parse");
    expect(kadValues(a.rules, { "dim.W": 2472, "dim.H": 2472, "dim.L": 3600, "detail.Fan.A": 1250 }).map((v) => v.value)).toEqual(["2472", "2472", "3600", "1250", "?"]);
  });

  it("틀린 규칙서는 무엇이 틀렸는지 한 문장", () => {
    expect(parseCadRules({ ...sample, grid: { ...sample.grid, at: { front: 2, center: 0.5, rear: 0.8 } } })).toMatchObject({ ok: false, error: expect.stringContaining("grid.at.front") });
    expect(parseCadRules({ ...sample, detail: { ...sample.detail, anchor: "Nope" } })).toMatchObject({ ok: false, error: expect.stringContaining("datum 에 없습니다") });
    expect(parseCadRules({ ...sample, kad: { ...sample.kad, slots: [{ slot: 1, key: "rm -rf" }] } })).toMatchObject({ ok: false });
  });
});

/* ── ccmd M · p36 Installation Code(구동 방식) · 방향 L0~R270 ↔ 기준점 결합 ── */
import { motorMm, sectionDimsFor, INSTALLS } from "../src/index";

describe("ccmd M · p36 구동 방식 · 방향 결합", () => {
  const sample = JSON.parse(readFileSync(resolve(__dirname, "../cad-rules/cad-rules.sample.json"), "utf-8"));
  const p = parseCadRules(sample);
  if (!p.ok) throw new Error(p.error);
  const R = p.rules;
  it("샘플 규칙서의 installation 은 DD · BI · BA 세 가지(INSTALLS 와 같다) · direction.mirrorR", () => {
    expect(R.installation?.types.map((t) => t.code)).toEqual([...INSTALLS]);
    expect(R.direction?.mirrorR).toBe(true);
  });
  it("모터 자리 = 기준점 + (dx, dy) — 방향 없음 · L0 은 같다", () => {
    const shaft = datumMm(R, 1000, 2000, 2400).find((d) => d.name === "Shaft")!;
    expect(motorMm(R, 1000, 2000, 2400, null, "DD")).toMatchObject({ x: shaft.x + 450, y: shaft.y });
    expect(motorMm(R, 1000, 2000, 2400, "L0", "DD")).toMatchObject({ x: shaft.x + 450, y: shaft.y });
  });
  it("R 방향이면 기준점이 구획 안에서 뒤집히고 모터 dx 도 뒤집힌다 · 90° 면 벡터가 돈다", () => {
    const footL = datumMm(R, 1000, 2000, 2400, "L0").find((d) => d.name === "Foot")!;
    const footR = datumMm(R, 1000, 2000, 2400, "R0").find((d) => d.name === "Foot")!;
    expect(footL.x).toBe(1050);          // 1000 + 0 × 2000 + 50
    expect(footR.x).toBe(2950);          // 1000 + (1 − 0) × 2000 − 50
    expect(motorMm(R, 1000, 2000, 2400, "R0", "BI")).toMatchObject({ x: 2950 - 300, y: footR.y + 250 });
    expect(motorMm(R, 1000, 2000, 2400, "L90", "BI")).toMatchObject({ x: 1050 - 250, y: footL.y + 300 });
  });
  it("규칙서에 direction 이 없으면 방향과 무관(옛 규칙서 · 옛 도면 그대로) · 그 구동 방식이 없으면 null", () => {
    const old = structuredClone(sample); delete old.direction; delete old.installation;
    const q = parseCadRules(old); if (!q.ok) throw new Error(q.error);
    expect(datumMm(q.rules, 1000, 2000, 2400, "R90")).toEqual(datumMm(q.rules, 1000, 2000, 2400));
    expect(motorMm(q.rules, 1000, 2000, 2400, null, "DD")).toBeNull();
  });
  it("installation 검사 — 없는 기준점 · 모르는 코드 · 중복은 거부", () => {
    const bad = (f: (x: typeof sample) => void) => { const c = structuredClone(sample); f(c); return parseCadRules(c).ok; };
    expect(bad((c) => { c.installation.types[0].from = "Nope"; })).toBe(false);
    expect(bad((c) => { c.installation.types[0].code = "XX"; })).toBe(false);
    expect(bad((c) => { c.installation.types[1].code = "DD"; })).toBe(false);
    expect(bad((c) => { c.direction.mirrorR = "yes"; })).toBe(false);
  });
  it("sectionDimsFor 가 구동 방식을 스냅샷 구획에 옮긴다(없으면 키 없음)", () => {
    const pr = { ...prod({}), sections: [{ name: "Fan", len: 1800, dir: "R90" as const, install: "BI" as const }, { name: "Coil" }] };
    expect(sectionDimsFor(pr, {}, 1000)).toEqual([{ name: "Fan", len: 1800, dir: "R90", install: "BI" }, { name: "Coil", len: 1000 }]);
  });
});
