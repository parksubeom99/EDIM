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

/** ccmd M · p25 · p26 — Canvas · 저장·삭제·등록 · 실행 설정(Call) · 노드 연결 · Signal/Slot · UI 개발 AI(결정론) */
import { applyRowWrite, designSpec, signalSlots, writePlan } from "../app/lib/ui-form";

const NODE = "a0000000-0000-4000-8000-000000000004";
const FORM = {
  nodes: [NODE],
  widgets: [
    { id: "combo1", type: "combo", x: 0, y: 0, w: 5, h: 2, label: "S-1", source: { kind: "subcode", itemKey: "B" } },
    { id: "table1", type: "table", x: 0, y: 2, w: 12, h: 6, label: "t", source: { kind: "table", code: "EU", table: "cap" } },
    { id: "canvas1", type: "canvas", x: 12, y: 2, w: 10, h: 6, label: "c", source: { kind: "table", code: "EU", table: "cap" }, cols: ["A"] },
    { id: "number1", type: "number", x: 0, y: 8, w: 6, h: 3, label: "A", col: "A" },
    { id: "button1", type: "button", x: 6, y: 8, w: 4, h: 2, label: "저장", action: "save", target: "table1", filterBy: "combo1" },
    { id: "button2", type: "button", x: 10, y: 8, w: 4, h: 2, label: "계산", action: "call", call: { kind: "macro" } },
    { id: "button3", type: "button", x: 14, y: 8, w: 4, h: 2, label: "링크", action: "call", call: { kind: "link", href: "/m/project" } },
  ],
};

describe("ccmd M · UI Form 확장", () => {
  it("Canvas · 쓰는 열 · 실행 설정 · 노드 연결이 한 폼에서 통과한다", () => {
    const r = parseSpec(FORM);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.spec.nodes).toEqual([NODE]); expect(r.spec.widgets.find((w) => w.id === "canvas1")?.cols).toEqual(["A"]); }
  });
  it("틀린 곳은 거부 — 바깥 링크 · call 없는 Call 버튼 · 숫자 위젯 아닌 col · 노드 id 형식", () => {
    const bad = (patch: (f: typeof FORM) => unknown) => { const f = structuredClone(FORM); patch(f); return parseSpec(f).ok; };
    expect(bad((f) => { (f.widgets[6] as { call: unknown }).call = { kind: "link", href: "https://evil.example" }; })).toBe(false);
    expect(bad((f) => { (f.widgets[6] as { call: unknown }).call = { kind: "link", href: "//evil.example" }; })).toBe(false);
    expect(bad((f) => { delete (f.widgets[5] as { call?: unknown }).call; })).toBe(false);
    expect(bad((f) => { (f.widgets[0] as { col?: string }).col = "A"; })).toBe(false);
    expect(bad((f) => { f.nodes = ["not-a-uuid"]; })).toBe(false);
  });
  it("writePlan — 저장 버튼은 대상 표 · Active Set-up · 쓰는 열이 있어야 한다", () => {
    const r = parseSpec(FORM); if (!r.ok) throw new Error(r.reason);
    const p = writePlan(r.spec, "button1");
    expect(p).toMatchObject({ ok: true, action: "save", source: { code: "EU", table: "cap" } });
    expect(writePlan(r.spec, "button2").ok).toBe(false);
    const noCombo = { ...r.spec, widgets: r.spec.widgets.map((w) => (w.id === "button1" ? { ...w, filterBy: undefined } : w)) };
    expect(writePlan(noCombo, "button1").ok).toBe(false);
  });
  it("applyRowWrite — 등록은 없는 Item 만(409) · 저장 · 삭제는 있는 Item 만(404) · 없는 열 400", () => {
    const t = { cols: [{ key: "A" }, { key: "B" }], rows: [{ item: "55", cells: { A: 1, B: 2 } }] };
    expect(applyRowWrite(t, "register", "55", { A: 9 })).toMatchObject({ ok: false, status: 409 });
    expect(applyRowWrite(t, "register", "80", { A: 9 })).toEqual({ ok: true, rows: [...t.rows, { item: "80", cells: { A: 9 } }] });
    expect(applyRowWrite(t, "save", "55", { A: 7 })).toEqual({ ok: true, rows: [{ item: "55", cells: { A: 7, B: 2 } }] });
    expect(applyRowWrite(t, "save", "99", { A: 7 })).toMatchObject({ ok: false, status: 404 });
    expect(applyRowWrite(t, "delete", "55", {})).toEqual({ ok: true, rows: [] });
    expect(applyRowWrite(t, "save", "55", { Z: 1 })).toMatchObject({ ok: false, status: 400 });
    expect(applyRowWrite(t, "save", "", { A: 1 })).toMatchObject({ ok: false, status: 400 });
  });
  it("signalSlots — Combo → 버튼(Active) · 버튼 → 표/매크로/링크 · Number → 열", () => {
    const r = parseSpec(FORM); if (!r.ok) throw new Error(r.reason);
    expect(signalSlots(r.spec)).toEqual([
      { sender: "combo1", signal: "currentIndexChanged()", receiver: "button1", slot: "setActiveValue()" },
      { sender: "button1", signal: "clicked()", receiver: "table1", slot: "save()" },
      { sender: "button2", signal: "clicked()", receiver: "Macro", slot: "run()" },
      { sender: "button3", signal: "clicked()", receiver: "/m/project", slot: "open()" },
      { sender: "number1", signal: "valueChanged()", receiver: "열 A", slot: "setCell()" },
    ]);
  });
  it("designSpec(UI 개발 AI · 결정론) — 같은 입력 → 같은 폼 · 설명 낱말 → 버튼 · 그래프 → Canvas · 결과는 parseSpec 통과", () => {
    const inp = { purpose: "CPQ · Selection", items: ["B", "D"], table: { code: "EU", table: "cap", cols: ["A", "B", "C"] }, text: "용량을 찾고 값을 저장하거나 등록하고 곡선 그래프로 본다" };
    const a = designSpec(inp), b = designSpec(inp);
    expect(a).toEqual(b);
    const types = a.spec.widgets.map((w) => w.type);
    expect(types.filter((t) => t === "combo")).toHaveLength(2);
    expect(types).toContain("canvas");
    expect(a.spec.widgets.filter((w) => w.type === "button").map((w) => w.action)).toEqual(["find", "save", "register"]);
    expect(a.spec.widgets.filter((w) => w.type === "number").map((w) => w.col)).toEqual(["A", "B", "C"]);
    expect(parseSpec(a.spec).ok).toBe(true);
    expect(parseSpec(designSpec({ purpose: "x", items: [], text: "매크로 계산" }).spec).ok).toBe(true);
  });
});
