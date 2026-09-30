import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCadRules } from "@edim/bom-code";
import { buildAssemblyDxf, placeLabels, type DxfInput, type DxfCad } from "../app/lib/output/dxf";
import { readDxfEntities, dxfToSvg } from "../app/lib/output/dxf-svg";
import { validatePrims, validatePlace, expand, symbolEntities, withSymbols } from "../app/lib/symbol";
import { partInfoOf } from "../app/lib/part-info";

const rulesJson = JSON.parse(readFileSync(resolve(__dirname, "../../../packages/bom-code/cad-rules/cad-rules.sample.json"), "utf-8"));
const lib = JSON.parse(readFileSync(resolve(__dirname, "../../../packages/bom-code/cad-rules/symbols.sample.json"), "utf-8")) as { sample: string; symbols: { key: string; primitives: unknown }[] };

const base: DxfInput = {
  code: "SPF-55", dims: { W: 2472, H: 2472, L: 900 }, dimItem: "55", sections: ["Mixing", "Fan"],
  secDims: [{ name: "Mixing", len: 900 }, { name: "Fan", len: 900, components: [{ code: "SFN 1", at: "center", level: "mid" }] }],
  items: [{ no: 1, part: "Fan", qty: 1, unit: "ea", childCode: "SFN 1" }],
};
const cadOf = (json: unknown): DxfCad => {
  const p = parseCadRules(json);
  if (!p.ok) throw new Error(p.error);
  return { version: p.rules.version, fingerprint: "abc123abc123", sample: p.rules.sample, rules: p.rules,
    details: [{ target: "Fan", label: "A", value: 1250, source: "" }], facts: { "dim.W": 2472, "dim.H": 2472, "dim.L": 1800, "detail.Fan.A": 1250 } };
};

describe("KC-1 · KC-2 조립도 CAD 층", () => {
  it("규칙서가 없으면 바이트 그대로(기존 제품 · 기존 스냅샷)", () => {
    const a = buildAssemblyDxf(base).dxf;
    expect(a).not.toContain("CADRULE");
    expect(a).not.toContain("KAD");
  });

  it("세부 치수선(DIM) · 부품 mm 배치 · 기준점(CADRULE) · KAD 슬롯 줄 — 좌표는 규칙서에서", () => {
    const e = readDxfEntities(buildAssemblyDxf({ ...base, cad: cadOf(rulesJson) }).dxf);
    const t = (layer: string) => e.texts.filter((x) => x.layer === layer).map((x) => x.value);
    expect(t("DIM")).toEqual(["detail.Fan.A=1250"]);
    const dimLine = e.lines.find((l) => l.layer === "DIM" && l.x2 - l.x1 === 1250);
    expect(dimLine?.x1).toBe(950);   // Fan 구획 원점 900 + Foot 기준점 xMm 50
    expect(t("CADRULE")).toContain("SFN 1 @1350,1236");
    expect(t("CADRULE")).toContain("SHAFT 1350,1236");
    expect(t("KAD")).toContain("KAD-");
    expect(t("KAD").some((v) => v.startsWith("KAD-2472-2472-1800-1250-? · CAD RULES sample-1 #abc123abc123 (SAMPLE)"))).toBe(true);
  });

  it("규칙서 사본(오프셋만 다름) → 부품 좌표만 바뀐다 · 세부 치수 값은 그대로", () => {
    const moved = { ...rulesJson, grid: { ...rulesJson.grid, offsetMm: { x: 100, y: -50 } } };
    const e = readDxfEntities(buildAssemblyDxf({ ...base, cad: cadOf(moved) }).dxf);
    expect(e.texts.filter((x) => x.layer === "CADRULE").map((x) => x.value)).toContain("SFN 1 @1450,1186");
    expect(e.texts.filter((x) => x.layer === "DIM").map((x) => x.value)).toEqual(["detail.Fan.A=1250"]);
  });

  it("풍선번호 글자에 data-balloon — 화면 더블클릭 자리", () => {
    expect(dxfToSvg(buildAssemblyDxf(base).dxf).svg).toContain('data-balloon="1"');
  });
});

describe("KC-3 설계 심볼", () => {
  it("샘플 라이브러리 5종은 모두 검사를 통과하고 '샘플' 표지", () => {
    expect(lib.sample).toContain("샘플");
    expect(lib.symbols.map((s) => s.key)).toEqual(["fan", "motor", "filter", "coil", "damper"]);
    for (const s of lib.symbols) expect(validatePrims(s.primitives).ok).toBe(true);
  });

  it("배치 검사 — 회전은 0 · 90 · 180 · 270 · 옮기기는 dx dy", () => {
    expect(validatePlace({ x: 10, y: 20, rot: 45 })).toMatchObject({ ok: false });
    expect(validatePlace({ dx: 5, dy: -5 }, { x: 10, y: 20, rot: 90, scale: 1 })).toEqual({ ok: true, p: { x: 15, y: 15, rot: 90, scale: 1 } });
    expect(validatePrims([{ t: "blob" }])).toMatchObject({ ok: false });
  });

  it("회전 90° = 좌표를 돌린다 · DXF 는 SYMBOL 레이어 LINE/CIRCLE 로 전개 · 원 DXF 는 그대로", () => {
    const e = expand([{ t: "line", x1: 0, y1: 0, x2: 100, y2: 0 }], { x: 1000, y: 0, rot: 90, scale: 2 });
    expect(e.lines).toEqual([[1000, 0, 1000, 200]]);
    const fan = validatePrims(lib.symbols[0]!.primitives);
    if (!fan.ok) throw new Error("fan");
    const { count } = symbolEntities([{ prims: fan.prims, at: { x: 0, y: 0, rot: 0, scale: 1 } }]);
    expect(count).toBe(32);   // 원 2 + 호 3개 × 선분 10
    const orig = buildAssemblyDxf(base).dxf;
    const out = withSymbols(orig, [{ prims: fan.prims, at: { x: 0, y: 0, rot: 0, scale: 1 } }]);
    const ents = readDxfEntities(out);
    expect(ents.lines.filter((l) => l.layer === "SYMBOL").length + ents.circles.filter((c) => c.layer === "SYMBOL").length).toBe(32);
    expect(withSymbols(orig, [])).toBe(orig);
  });
});

describe("KC-4 부품 정보(스냅샷 기준)", () => {
  it("단가 출처는 스냅샷이 가리킨 그때 행 · 조립순서 = 구획 순서 · Remarks info 요지", () => {
    const items = partInfoOf({
      lines: [
        { no: 1, section: "Casing", part: "Casing", spec: "", qty: 1, unit: "set", unitCost: 2400000, childCode: "SCS 1", priceSource: { kind: "history", priceId: "p1", effectiveFrom: "2026-09-01" } },
        { no: 2, section: "Fan", part: "Motor", spec: "3.7 kW", qty: 1, unit: "ea", unitCost: 420000, childCode: "SMT 1", supplier: "샘플 모터", priceSource: { kind: "relationship" } },
      ],
      dims: { sections: [{ name: "Mixing" }, { name: "Fan" }], detail: [{ target: "SMT 1", label: "C", value: 350, source: "등록 값" }] },
      prices: [{ id: "p1", code: "SCS 1", item: "", price: 2400000, currency: "KRW", supplier: null, effectiveFrom: new Date("2026-09-01T00:00:00Z") }],
      attachments: [{ id: "a1", ownerKey: "SMT 1", name: "motor.dwg", kind: "dwg2d", uploadedAt: new Date() }],
      notes: ["모터 베이스 방진"],
    });
    expect(items[0]!.priceSource.row).toEqual({ id: "p1", price: 2400000, currency: "KRW", supplier: null, effectiveFrom: "2026-09-01", item: "" });
    expect(items[0]!.assembly).toEqual({ order: 0, of: 2, section: "Casing" });
    expect(items[1]!.assembly).toEqual({ order: 2, of: 2, section: "Fan" });
    expect(items[1]!.remarksInfo).toBe("주의사항 1 · DWG 1 · 세부 치수 C=350");
    expect(items[1]!.supplier).toBe("샘플 모터");
  });
});

describe("ccmd L · LB-2 CADRULE 글자 겹침", () => {
  const box = (l: { x: number; y: number; h: number; v: string }) => ({ x0: l.x, x1: l.x + l.v.length * l.h * 0.6, y0: l.y, y1: l.y + l.h });
  it("겹치는 글자는 한 줄씩 아래로 · 안 겹치는 글자는 그대로 · 같은 입력 = 같은 답 · 결과 상자 교차 0", () => {
    const L = [
      { x: 100, y: 500, h: 40, v: "SHAFT 100,500" },
      { x: 120, y: 510, h: 45, v: "SFN 1 @120,510" },
      { x: 5000, y: 500, h: 40, v: "FAR 5000,500" },
    ];
    const a = placeLabels(L), b = placeLabels(L);
    expect(a).toEqual(b);
    expect(a[0]).toEqual(L[0]);
    expect(a[2]).toEqual(L[2]);
    expect(a[1]!.y).toBeLessThan(L[1]!.y);
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
      const p = box(a[i]!), q = box(a[j]!);
      expect(p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1).toBe(false);
    }
  });
});
