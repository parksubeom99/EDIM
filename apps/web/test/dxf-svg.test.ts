import { describe, it, expect } from "vitest";
import { buildView, DRAWING_VIEWS, type DxfInput } from "../app/lib/output/dxf";
import { dxfToSvg } from "../app/lib/output/dxf-svg";

// F6 · p13 DWG View — SVG 는 그 DXF 를 옮길 뿐이다: 엔티티 수가 DXF 와 같아야 한다(다시 계산하지 않는다).
const input: DxfInput = {
  code: "EU-55-2123", dims: { W: 2472, H: 2472, L: 900 }, dimItem: "55", sections: ["Mixing", "Filter", "Coil", "Fan"],
  secDims: [{ name: "Mixing", len: 900 }, { name: "Filter", len: 900 }, { name: "Coil", len: 900, dir: "R90" }, { name: "Fan", len: 900, components: [{ code: "KFP 1", at: "center", level: "mid" }] }],
  items: [{ no: 1, part: "Plug fan", qty: 1, unit: "ea" }],
};
const count = (dxf: string, t: string) => dxf.split("\n").filter((l, i, a) => l.trim() === t && a[i - 1]?.trim() === "0").length;

describe("DXF → SVG (DWG View)", () => {
  for (const v of DRAWING_VIEWS) {
    it(`${v}: every LINE · CIRCLE · TEXT of the DXF is drawn, nothing invented`, () => {
      const { dxf } = buildView(v, input);
      const { svg, counts } = dxfToSvg(dxf);
      expect(counts.lines).toBe(count(dxf, "LINE"));
      expect(counts.circles).toBe(count(dxf, "CIRCLE"));
      expect(counts.texts).toBe(count(dxf, "TEXT"));
      expect(counts.skipped).toBe(0);
      expect((svg.match(/<line /g) ?? []).length).toBe(counts.lines);
      expect(svg.startsWith("<svg")).toBe(true);
    });
  }
});
