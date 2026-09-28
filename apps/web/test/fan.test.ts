import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { intersect, selectFan, motorFor, bracketOf, validateFanInput, type FanSegment } from "../app/lib/special/fan";

/** C · 팬 선정 — 손 계산과 대조. */
const seg = (model: string, rpm: number, q1: number, p1: number, e1: number, q2: number, p2: number, e2: number): FanSegment => ({ model, rpm, q1, p1, e1, q2, p2, e2 });

describe("C · 교점 보간(손 계산 3건)", () => {
  it("① 12,000 CMH · 600 Pa — 구간 (10000, 700)–(14000, 500) 과 P = kQ² 의 교점은 정확히 12,000 CMH", () => {
    // 1200 − 0.05Q = (600/12000²)Q² → Q = 12000 (근의 공식)
    const k = 600 / 12000 ** 2;
    expect(intersect({ q1: 10000, p1: 700, q2: 14000, p2: 500 }, k)).toBeCloseTo(12000, 3);
  });
  it("② 9,000 CMH · 300 Pa — 구간 (8000, 400)–(10000, 200) → 교점 Q = 9,000", () => {
    // 400 − 0.1(Q − 8000) = (300/9000²)Q² → 1200 − 0.1Q = 3.7037e-6 Q² → Q = 9000
    expect(intersect({ q1: 8000, p1: 400, q2: 10000, p2: 200 }, 300 / 9000 ** 2)).toBeCloseTo(9000, 3);
  });
  it("③ 구간 끝점이 교점 — (6000, 250) 이 계통 곡선 위", () => {
    expect(intersect({ q1: 6000, p1: 250, q2: 8000, p2: 100 }, 250 / 6000 ** 2)).toBe(6000);
  });
  it("범위 밖 — 구간 안에서 부호가 안 바뀌면 교점 없음", () => {
    expect(intersect({ q1: 1000, p1: 900, q2: 2000, p2: 880 }, 600 / 12000 ** 2)).toBeNull();
  });
});

describe("C · 선정 규칙", () => {
  const S = seg("A", 2000, 10000, 700, 0.6, 14000, 500, 0.7);
  it("효율 보간 · 축동력 · 모터 올림(× 1.15 이상 최소 표준)", () => {
    const r = selectFan({ qCmh: 12000, pPa: 600 }, [S]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // η = 0.6 + 0.1 × 0.5 = 0.65 · kW = (12000/3600) × 600 / (0.65 × 1000) = 3.0769 · × 1.15 = 3.538 → 3.7 kW
    expect(r.pick).toEqual({ model: "A", rpm: 2000, q: 12000, p: 600, eta: 0.65, shaftKw: 3.077, motorKw: 3.7 });
  });
  it("밀도 보정 ρ / 1.2 — ρ = 1.4 면 축동력 3.590 kW → 모터 5.5 kW", () => {
    const r = selectFan({ qCmh: 12000, pPa: 600, rho: 1.4 }, [S]);
    expect(r.ok && [r.pick.shaftKw, r.pick.motorKw]).toEqual([3.59, 5.5]);
  });
  it("±5 % 필터 — 동작점이 12,700 CMH 이면 12,000 요구에서 탈락", () => {
    const off = seg("B", 1500, 12000, 900, 0.6, 14000, 500, 0.6);   // 교점 ≈ 12.7k
    const r = selectFan({ qCmh: 12000, pPa: 600 }, [off]);
    expect(r.ok).toBe(false);
    expect(r.dropped[0]!.why).toMatch(/±5 %/);
  });
  it("동률(효율 같음)이면 모터가 작은 쪽", () => {
    const big = seg("BIG", 2000, 10000, 700, 0.65, 14000, 500, 0.65);
    const r = selectFan({ qCmh: 12000, pPa: 600, rho: 1.0 }, [big, { ...big, model: "SMALL" }]);
    expect(r.ok && r.pick.model).toBe("BIG");   // 같은 모터면 먼저 온 것(안정 정렬)
    const r2 = selectFan({ qCmh: 12000, pPa: 600 }, [seg("M55", 2000, 10000, 700, 0.65, 14000, 500, 0.65), seg("M37", 2000, 10000, 700, 0.65, 14000, 500, 0.65)]);
    expect(r2.ok && r2.candidates.map((c) => c.motorKw)).toEqual([3.7, 3.7]);
  });
  it("모터 올림 경계 · 입력 검사", () => {
    expect(motorFor(1.3)).toBe(1.5);     // 1.495 → 1.5
    expect(motorFor(1.31)).toBe(2.2);    // 1.5065 → 2.2
    expect(motorFor(20)).toBeNull();
    expect(validateFanInput({ qCmh: 0, pPa: 600 })).not.toBeNull();
    expect(validateFanInput({ qCmh: 12000, pPa: 600, rho: 3 })).not.toBeNull();
    expect(validateFanInput({ qCmh: 12000, pPa: 600 })).toBeNull();
  });
});

describe("C · 샘플 성능표(fan_curves.json) — e2e 기대값", () => {
  const J = JSON.parse(readFileSync(path.resolve(__dirname, "../../../packages/db/prisma/special-samples/fan_curves.json"), "utf8")) as { curves: { model: string; rpm: number; points: { q: number; p: number; eta: number }[] }[] };
  const segsFor = (q: number, p: number) => J.curves.map((c) => ({ model: c.model, rpm: c.rpm, ...bracketOf(c.points, p / q ** 2) }));
  it("12,000 CMH · 600 Pa → EDIM-PF-560 · 2600 rpm · 모터 3.7 kW", () => {
    const r = selectFan({ qCmh: 12000, pPa: 600 }, segsFor(12000, 600));
    expect(r.ok && [r.pick.model, r.pick.rpm, r.pick.motorKw]).toEqual(["EDIM-PF-560 (샘플)", 2600, 3.7]);
    expect(r.ok && r.candidates.length).toBeGreaterThanOrEqual(3);
  });
  it("100,000 CMH → 적합한 팬 없음(모든 곡선이 범위 밖)", () => {
    const r = selectFan({ qCmh: 100000, pPa: 600 }, segsFor(100000, 600));
    expect(r.ok).toBe(false);
    expect(r.dropped.every((d) => /범위 밖/.test(d.why))).toBe(true);
  });
});
