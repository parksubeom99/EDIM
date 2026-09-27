import { describe, it, expect } from "vitest";
import { validateAnnot, annotEntities, withAnnotations, dimLabel } from "../app/lib/annotation";
import { readDxfEntities } from "../app/lib/output/dxf-svg";

/** H10 · p58 그림 제작 Module 1단계 — 주석 검사 · DXF 덧붙이기(원 DXF 불변) */
const BASE = "0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nOUTLINE\n10\n0\n20\n0\n30\n0\n11\n1000\n21\n0\n31\n0\n0\nENDSEC\n0\nEOF\n";

describe("H10 주석 검사", () => {
  it("종류 · 좌표 · 글자", () => {
    expect(validateAnnot({ kind: "circle", x1: 0, y1: 0, x2: 1, y2: 1 }).ok).toBe(false);
    expect(validateAnnot({ kind: "line", x1: 0, y1: 0, x2: 0.2, y2: 0 })).toEqual({ ok: false, error: "선의 두 점이 같습니다" });
    expect(validateAnnot({ kind: "text", x1: 10, y1: 10 })).toEqual({ ok: false, error: "글자 주석은 글자가 필요합니다" });
    expect(validateAnnot({ kind: "rect", x1: "a", y1: 0, x2: 1, y2: 1 }).ok).toBe(false);
    const t = validateAnnot({ kind: "text", x1: 10.26, y1: 20, text: " 용접 주의 " });
    expect(t).toEqual({ ok: true, a: { kind: "text", x1: 10.3, y1: 20, x2: 10.3, y2: 20, text: "용접 주의" } });
  });
  it("치수선 글자 — 적은 글자, 없으면 길이(mm)", () => {
    expect(dimLabel({ kind: "dim", x1: 0, y1: 0, x2: 300, y2: 400 })).toBe("500");
    expect(dimLabel({ kind: "dim", x1: 0, y1: 0, x2: 300, y2: 400, text: "W" })).toBe("W");
  });
});

describe("H10 DXF 덧붙이기", () => {
  it("선 1 · 사각형 4 · 글자 1 · 치수선(선 3 + 글자 1) — 모두 ANNOT 레이어 · 원 엔티티는 그대로", () => {
    const list = [
      { kind: "line" as const, x1: 0, y1: 0, x2: 100, y2: 0 },
      { kind: "rect" as const, x1: 0, y1: 0, x2: 100, y2: 50 },
      { kind: "text" as const, x1: 5, y1: 5, x2: 5, y2: 5, text: "NOTE" },
      { kind: "dim" as const, x1: 0, y1: -100, x2: 1000, y2: -100 },
    ];
    const out = withAnnotations(BASE, list);
    const e = readDxfEntities(out);
    expect(e.lines.filter((l) => l.layer === "ANNOT").length).toBe(1 + 4 + 3);
    expect(e.texts.filter((t) => t.layer === "ANNOT").map((t) => t.value)).toEqual(["NOTE", "1000"]);
    expect(e.lines.filter((l) => l.layer === "OUTLINE").length).toBe(1);
    expect(out.endsWith("0\nENDSEC\n0\nEOF\n")).toBe(true);
    expect(withAnnotations(BASE, [])).toBe(BASE);
    expect(annotEntities([{ kind: "text", x1: 0, y1: 0, x2: 0, y2: 0, text: "a\nb" }])).toContain("\n1\na b\n");
  });
});
