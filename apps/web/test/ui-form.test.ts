import { describe, it, expect } from "vitest";
import { parseSpec, newWidget } from "../app/lib/ui-form";

/** p25·p26 UI Form — C(ccmd J) 에서 더한 숫자 입력 위젯(number · param · unit). Special 입력 폼이 이 폼을 그대로 쓴다. */
describe("UI Form · number 위젯", () => {
  it("number 위젯은 param(소문자·숫자·밑줄) · unit 을 가진다", () => {
    const r = parseSpec({ widgets: [{ id: "number1", type: "number", x: 0, y: 0, w: 6, h: 3, label: "풍량", param: "q_cmh", unit: "CMH" }] });
    expect(r).toEqual({ ok: true, spec: { widgets: [{ id: "number1", type: "number", x: 0, y: 0, w: 6, h: 3, label: "풍량", param: "q_cmh", unit: "CMH" }] } });
  });
  it("param 은 number 위젯에만 · 형식이 틀리면 거부", () => {
    expect(parseSpec({ widgets: [{ id: "label1", type: "label", x: 0, y: 0, w: 2, h: 1, label: "x", param: "q" }] }).ok).toBe(false);
    expect(parseSpec({ widgets: [{ id: "number1", type: "number", x: 0, y: 0, w: 2, h: 1, label: "x", param: "Q CMH" }] }).ok).toBe(false);
  });
  it("새 number 위젯의 기본 크기와 이름", () => {
    expect(newWidget("number", 0, 0, new Set())).toMatchObject({ id: "number1", type: "number", w: 6, h: 3, label: "입력 1" });
  });
  it("옛 폼(number 없음)은 그대로 통과", () => {
    expect(parseSpec({ widgets: [{ id: "combo1", type: "combo", x: 0, y: 0, w: 5, h: 2, label: "S-1", source: { kind: "subcode", itemKey: "B" } }] }).ok).toBe(true);
  });
});
