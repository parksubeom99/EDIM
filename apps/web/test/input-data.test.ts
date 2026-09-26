import { describe, it, expect } from "vitest";
import { resolveInputData, type InputItemDef } from "../app/lib/output/document";

// 0022 · p16 Input Data 템플릿 — 값은 템플릿 항목에서만, 범위 안에서만, 안 보내면 기본값.
const defs: InputItemDef[] = [
  { key: "temperature", label: "Temperature", unit: "°C", defaultValue: 20, minValue: -40, maxValue: 60 },
  { key: "humidity", label: "Humidity", unit: "%", defaultValue: 50, minValue: 0, maxValue: 100 },
];

describe("⑨ Input Data template → Tech Data snapshot values", () => {
  it("fills defaults for items that were not sent", () => {
    const r = resolveInputData(defs, { temperature: "25" });
    expect(r.ok && r.values.map((v) => v.value)).toEqual([25, 50]);
  });
  it("refuses out-of-range values", () => {
    const r = resolveInputData(defs, { humidity: 120 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
  it("refuses keys that are not in the template", () => {
    const r = resolveInputData(defs, { pressure: 1 });
    expect(!r.ok && r.error).toMatch(/pressure/);
  });
  it("refuses a missing value when the item has no default", () => {
    const r = resolveInputData([{ ...defs[0]!, defaultValue: null }], {});
    expect(!r.ok && r.error).toMatch(/Temperature/);
  });
  it("no template → no input data (old behaviour)", () => {
    expect(resolveInputData([], undefined)).toEqual({ ok: true, values: [] });
  });
});
