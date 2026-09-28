import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { extractDxf, extractCsv } from "../app/lib/learning/extract";
import { alignFeatures, alignByDictionary } from "../app/lib/learning/align";
import { mineFormulas, type MineRecord } from "../app/lib/learning/mine";
import { learnedExpression, userProjection, verifyCandidate } from "../app/lib/learning/formula";
import { similarity } from "../app/lib/learning/similarity";

/** B · 학습 AI 1수준 — 샘플 도면 68장 + 기술문서 CSV 로 결정론 파이프라인을 끝까지(DB 없이). */
const DIR = path.resolve(__dirname, "../../../packages/db/prisma/learning-samples");
const files = readdirSync(DIR).filter((f) => f.startsWith("SAMPLE_")).sort();
const ANSWERS = JSON.parse(readFileSync(path.join(DIR, "ANSWERS.json"), "utf8")) as { noise: string[] };

async function records(namer?: (l: string[]) => Promise<Map<string, string | null>>) {
  const out: MineRecord[] = [];
  const unaligned = new Set<string>();
  for (const f of files) {
    const text = readFileSync(path.join(DIR, f), "utf8");
    const raw = f.endsWith(".csv") ? extractCsv(text) : extractDxf(text);
    const a = await alignFeatures(raw, namer);
    a.unaligned.forEach((u) => unaligned.add(u));
    for (const r of [...new Set(a.features.map((x) => x.record))]) {
      const feats: Record<string, number> = {};
      for (const x of a.features) if (x.record === r && x.alignedName) feats[x.alignedName] = x.alignedValue;
      out.push({ id: f.endsWith(".csv") ? `${f}#${r + 1}` : f, features: feats });
    }
  }
  return { recs: out, unaligned: [...unaligned] };
}

describe("B · extract · align", () => {
  it("DXF 글자 치수 · 구획 길이(기하) · 코드 슬롯을 뽑는다", () => {
    const raw = extractDxf(readFileSync(path.join(DIR, "SAMPLE_ahu_001.dxf"), "utf8"));
    const labels = raw.map((r) => r.rawLabel);
    expect(labels).toEqual(expect.arrayContaining(["L", "H", "CASING H", "FRAME", "code.B"]));
    expect(raw.filter((r) => r.via === "geometry").length).toBeGreaterThanOrEqual(4);
  });
  it("정렬 사전 — 동의어 · 구획 · 모르는 이름", () => {
    expect(alignByDictionary("Overall L")?.name).toBe("overall_length");
    expect(alignByDictionary(" overall  l ")?.name).toBe("overall_length");
    expect(alignByDictionary("전장")?.name).toBe("overall_length");
    expect(alignByDictionary("SECTION FAN")).toEqual({ name: "section.fan.length", by: "section" });
    expect(alignByDictionary("BF HT")).toBeNull();
  });
  it("단위 환산 — inch → mm", async () => {
    const a = await alignFeatures([{ record: 0, rawLabel: "LENGTH", value: 177.17, unit: "in", layer: "DIM", via: "text" }]);
    expect(a.features[0]!.alignedValue).toBeCloseTo(4500.118, 2);
  });
  it("로컬 AI 가 없으면 사전 밖 이름(BF HT)은 미정렬로 드러난다 · 있으면 허용 목록 안에서만 받는다", async () => {
    const off = await records();
    expect(off.unaligned).toEqual(["BF HT"]);
    const on = await records(async (ls) => new Map(ls.map((l) => [l, l === "BF HT" ? "base_frame" : "not_allowed"])));
    expect(on.unaligned).toEqual([]);
    const bad = await alignFeatures([{ record: 0, rawLabel: "XYZ", value: 1, unit: "", layer: "", via: "text" }], async () => new Map([["XYZ", "drop table"]]));
    expect(bad.unaligned).toEqual(["XYZ"]);
  });
});

describe("B · mine · verify — 숨겨 둔 공식을 다시 찾는다", () => {
  it("정답 3개(전장 · 전고 · 코일 깊이)를 합격으로 · 잡음 3장을 어긋남으로", async () => {
    const { recs } = await records();
    const m = mineFormulas(recs);
    const byT = Object.fromEntries(m.accepted.map((c) => [c.target, c]));
    expect(learnedExpression(byT.overall_length!)).toBe("=Var(LRN,section_sum)");
    expect(learnedExpression(byT.overall_height!)).toBe("=Var(LRN,casing_height)+(2*Var(LRN,base_frame))");
    expect(learnedExpression(byT["coil.depth"]!)).toBe("=25*Var(LRN,coil_rows)+50");
    expect(byT.overall_length!.outliers.map((o) => o.id).sort()).toEqual([...ANSWERS.noise].sort());
    expect(byT.overall_length!.fit.n).toBe(68);
    expect(byT.overall_height!.fit.n).toBe(66);           // BF HT 2장은 로컬 AI 없이 프레임이 없다
    expect(byT.overall_height!.fit.maxAbsErr).toBe(0);
    // 같은 사실을 다른 목표로 다시 내지 않는다(C = H − 2F 등)
    expect(m.accepted.filter((c) => ["casing_height", "base_frame", "coil.rows"].includes(c.target))).toEqual([]);
    for (const c of [byT.overall_length!, byT.overall_height!, byT["coil.depth"]!]) expect(verifyCandidate(c, recs).ok).toBe(true);
  });
  it("후보 수 상한을 넘으면 멈추고 알린다", async () => {
    const { recs } = await records();
    const m = mineFormulas(recs, { maxCandidates: 10 });
    expect(m.capped).toBe(true);
    expect(m.tried).toBe(10);
  });
  it("허용(1 mm) 밖이 5 % 를 넘으면 후보가 되지 못한다", () => {
    const recs: MineRecord[] = Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, features: { overall_length: i * 100 + (i < 2 ? 5 : 0), section_sum: i * 100 } }));
    expect(mineFormulas(recs).accepted).toEqual([]);   // 2/20 = 10 %
  });
});

describe("B · π_user · 유사도", () => {
  it("회사 어휘로 옮길 수 있는 식만 회사 형식이 된다", async () => {
    const { recs } = await records();
    const byT = Object.fromEntries(mineFormulas(recs).accepted.map((c) => [c.target, c]));
    expect(userProjection(byT.overall_length!)).toEqual({ target: "L", expression: "=Var(DIM,SECSUM)", missing: [] });
    expect(userProjection(byT.overall_height!).expression).toBeNull();
    expect(userProjection(byT.overall_height!).missing).toEqual(["casing_height", "base_frame"]);
  });
  it("유사도 = 회사 형식에 맞는 투영본 / 투영본", () => {
    const s = similarity([
      { id: "a", target: "L", expression: "=Var(DIM,SECSUM)" },
      { id: "b", target: "H", expression: null },
      { id: "c", target: "W", expression: "=Var(DIM,NOPE)" },
      { id: "d", target: "H", expression: "=Var(DIM,W)+(2*Var(DIM,LMAX))" },
    ]);
    expect([s.matched, s.total, s.ratio]).toEqual([2, 4, 0.5]);
    expect(s.misses.map((m) => m.id)).toEqual(["b", "c"]);
    expect(similarity([]).ratio).toBe(0);
  });
});

describe("B · 도구 수명주기 — validate → authorize → run", () => {
  it("읽기 전용 4단계 · 쓰기 2개는 관리자 승인 없이는 거절 · 입력 검사", async () => {
    const { TOOLS, DEFAULT_PLAN } = await import("../app/lib/learning/tools");
    const { newUsage } = await import("../app/lib/learning/local-ai");
    expect([...DEFAULT_PLAN]).toEqual(["extract", "align", "mine", "verify"]);
    expect(DEFAULT_PLAN.every((t) => TOOLS[t]!.readOnly)).toBe(true);
    const ctx = { jobId: "j", actorId: "u", usage: newUsage() };
    for (const t of ["approve", "project"]) {
      expect(TOOLS[t]!.readOnly).toBe(false);
      expect(TOOLS[t]!.authorize(ctx)).toMatch(/관리자 승인/);
      expect(TOOLS[t]!.authorize({ ...ctx, adminApproved: true })).toBeNull();
    }
    expect(TOOLS.approve!.validate({ formulaId: "x", decision: "approved" })).not.toBeNull();
    expect(TOOLS.project!.validate({ formulaId: "00000000-0000-4000-8000-000000000001" })).not.toBeNull();
    expect(TOOLS.extract!.validate({ sourceIds: ["nope"] })).not.toBeNull();
    expect(TOOLS.extract!.validate({})).toBeNull();
  });
});
