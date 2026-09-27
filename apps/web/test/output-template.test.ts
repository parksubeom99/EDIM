import { describe, it, expect } from "vitest";
import { resolveOutputs, parsePoints, pointsFromText, snapshotGraphs, graphSvg, OUTPUT_REFS } from "../app/lib/output-template";

/** H6 · p16 · p47 — Output Data 템플릿 · 그래프 전용 data (순수 함수) */
const run = { macroValue: 455.4, cost: { material: 100, labor: 18, overhead: 14, total: 132 }, dims: { W: 2472, H: 2472, L: 4500 }, lines: [1, 2, 3] };

describe("H6 Output Data — 출처는 승인 매크로 결과 · 스냅샷 값뿐", () => {
  it("macro · snapshot 경로를 읽는다(새 계산 없음)", () => {
    const out = resolveOutputs([
      { key: "macro_out", label: "Macro", unit: "", source: "macro", ref: null },
      { key: "w", label: "W", unit: "mm", source: "snapshot", ref: "dims.W" },
      { key: "tot", label: "원가", unit: "원", source: "snapshot", ref: "cost.total" },
      { key: "n", label: "줄", unit: "", source: "snapshot", ref: "lines.count" },
    ], run);
    expect(out.map((o) => o.value)).toEqual([455.4, 2472, 132, 3]);
  });
  it("값이 없으면 지어내지 않는다 — null + 이유", () => {
    const out = resolveOutputs([
      { key: "density", label: "Density", unit: "kg/m³", source: "macro", ref: null },
      { key: "w", label: "W", unit: "mm", source: "snapshot", ref: "dims.W" },
      { key: "bad", label: "?", unit: "", source: "snapshot", ref: "cost.profit" },
    ], { macroValue: null, cost: {}, lines: [] });
    expect(out.map((o) => [o.value, o.note])).toEqual([[null, "아직 없음 — 승인 매크로 필요"], [null, "이 스냅샷에 없는 값"], [null, "이 스냅샷에 없는 값"]]);
    expect(Object.keys(OUTPUT_REFS)).not.toContain("cost.profit");
  });
});

describe("H6 그래프 전용 data · 그래프", () => {
  it("x,y 줄 → 점 · 형식이 틀리면 몇 번째 점인지", () => {
    expect(parsePoints(pointsFromText("600,2900\n 1200 , 2800 \n\n1800,2500"))).toEqual({ ok: true, points: [{ x: "600", y: 2900 }, { x: "1200", y: 2800 }, { x: "1800", y: 2500 }] });
    expect(parsePoints(pointsFromText("600,2900\nabc"))).toEqual({ ok: false, error: "2번째 점의 y 는 수" });
    expect(parsePoints([])).toEqual({ ok: false, error: "점은 1~50개" });
  });
  it("문서를 만드는 순간 표시선 값을 박는다 — 값이 없으면 표시선 없이", () => {
    const outs = resolveOutputs([{ key: "macro_out", label: "Macro", unit: "", source: "macro", ref: null }], run);
    const [g1, g2] = snapshotGraphs([
      { name: "Fan curve", chart: "line", xLabel: "Q", yLabel: "Pa", points: [{ x: "600", y: 2900 }, { x: "1200", y: 2800 }], markerKey: "macro_out" },
      { name: "Bars", chart: "bar", xLabel: "", yLabel: "", points: [{ x: "a", y: 1 }], markerKey: "nope" },
    ], outs);
    expect(g1!.marker).toEqual({ key: "macro_out", label: "Macro", value: 455.4 });
    expect(g2!.marker).toBeNull();
  });
  it("SVG — 점 수 · 표시선 · 글자 이스케이프", () => {
    const svg = graphSvg({ name: "g", chart: "line", xLabel: "<Q>", yLabel: "Pa", points: [{ x: "<b>", y: 1 }, { x: "2", y: 3 }], marker: { key: "m", label: "M", value: 2 } });
    expect(svg).toContain('data-points="2"');
    expect(svg).toContain('data-marker="2"');
    expect(svg).toContain("&lt;b&gt;");
    expect(svg).not.toContain("<b>");
  });
});
