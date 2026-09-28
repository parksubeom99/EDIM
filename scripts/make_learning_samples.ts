/**
 * B-3 · 샘플 학습 자료 만들기 — **샘플**(실제 회사 도면 아님). 시드 고정이라 몇 번을 돌려도 같은 바이트.
 *   pnpm --filter @edim/db exec tsx ../../scripts/make_learning_samples.ts
 * → packages/db/prisma/learning-samples/ (SAMPLE_*.dxf · SAMPLE_coil_techdoc.csv · ANSWERS.json)
 *
 * 우리 DXF 생성기(apps/web/app/lib/output/dxf.ts · 정면도)로 AHU 도면을 그린다. 숨겨 둔 공식(정답 — ANSWERS.json):
 *   ① overall_length = Σ section.*.length        (전장 = 구획 길이 합)
 *   ② overall_height = casing_height + 2 × base_frame  (전고 = 케이싱 + 위·아래 프레임)
 *   ③ coil.depth = 25 × coil.rows + 50           (기술문서 CSV — 코일 깊이 = 열수 × 25 + 50)
 * 섞어 둔 것:
 *   · 잡음 3장 — 전장 글자가 공식보다 5 mm 큼(현장 수정본 흉내) → mine 이 "어긋남"으로 드러내야 한다
 *   · 이름이 다른 5장 — `Overall L` · `LENGTH` · `전장` · `OAL` · `LENGTH=…in`(인치) → 정렬 사전이 맞춰야 한다
 *   · 사전에 없는 약어 2장 — 프레임을 `BF HT` 로 적음 → 로컬 AI 가 맞추거나(켜져 있을 때) 미정렬로 드러난다
 * 판정 기준(1 mm · 어긋남 ≤ 5 %)에 맞게 깨끗한 도면은 60장이다(잡음 3 / 전체 68 = 4.4 %).
 */
import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { buildFrontDxf } from "../apps/web/app/lib/output/dxf";

const OUT = path.resolve(__dirname, "../packages/db/prisma/learning-samples");
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20260929);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(R() * xs.length)]!;

const SECTIONS = ["Mixing", "Filter", "Coil", "Fan", "Humid", "Damper", "Silencer"] as const;
const LENS = [600, 750, 900, 1050, 1200, 1500, 1800];
const CAPS = [10, 12, 25, 55];

interface Plan { no: number; kind: "clean" | "noise" | "alias" | "local-ai"; alias?: string }
const plans: Plan[] = [];
for (let i = 1; i <= 60; i++) plans.push({ no: i, kind: i === 17 || i === 43 ? "local-ai" : "clean" });
for (let i = 61; i <= 63; i++) plans.push({ no: i, kind: "noise" });
const ALIASES = ["Overall L", "LENGTH", "전장", "OAL", "LENGTH_IN"];
ALIASES.forEach((a, k) => plans.push({ no: 64 + k, kind: "alias", alias: a }));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const answers: Record<string, unknown> = {
  note: "샘플 학습 자료의 정답표 — 보고서에 미리 적어 두고, 학습 작업이 찾아낸 식과 대조한다.",
  formulas: [
    { target: "overall_length", expression: "=Var(LRN,section_sum)", meaning: "전장 = 구획 길이 합" },
    { target: "overall_height", expression: "=Var(LRN,casing_height)+(2*Var(LRN,base_frame))", meaning: "전고 = 케이싱 높이 + 2 × 프레임" },
    { target: "coil.depth", expression: "=25*Var(LRN,coil_rows)+50", meaning: "코일 깊이 = 25 × 열수 + 50 (기술문서 CSV)" },
  ],
  noise: [] as string[], alias: [] as string[], localAi: [] as string[],
};

for (const p of plans) {
  const n = 4 + Math.floor(R() * 3);   // 구획 4~6
  const chosen = SECTIONS.filter(() => R() < 0.7).slice(0, n);
  while (chosen.length < 4) { const s = pick(SECTIONS); if (!chosen.includes(s)) chosen.push(s); }
  const secs = SECTIONS.filter((s) => chosen.includes(s)).map((name) => ({ name, len: pick(LENS) }));
  const casing = 1800 + 50 * Math.floor(R() * 17);
  const frame = pick([80, 100, 120, 150]);
  const H = casing + 2 * frame;
  const W = 1600 + 50 * Math.floor(R() * 29);
  const cap = pick(CAPS);
  const code = `EU-${cap}-2123-630SS`;
  let dxf = buildFrontDxf({ code, dims: { W, H, L: 900 }, dimItem: String(cap), sections: secs.map((s) => s.name), secDims: secs, frame: { casing, frame } }).dxf;
  const length = secs.reduce((a, s) => a + s.len, 0);
  const file = `SAMPLE_ahu_${String(p.no).padStart(3, "0")}.dxf`;
  if (p.kind === "noise") { dxf = dxf.replace(`\nL=${length}\n`, `\nL=${length + 5}\n`); (answers.noise as string[]).push(file); }
  if (p.kind === "alias") {
    const lab = p.alias === "LENGTH_IN" ? `LENGTH=${(length / 25.4).toFixed(2)}in` : `${p.alias}=${length}`;
    dxf = dxf.replace(`\nL=${length}\n`, `\n${lab}\n`); (answers.alias as string[]).push(`${file} (${lab.split("=")[0]})`);
  }
  if (p.kind === "local-ai") { dxf = dxf.replace(`\nFRAME=${frame}\n`, `\nBF HT=${frame}\n`); (answers.localAi as string[]).push(`${file} (BF HT)`); }
  writeFileSync(path.join(OUT, file), dxf, "utf8");
}

// 기술문서 CSV — 표 형태만(1수준). 핀 피치는 관계없는 열(잡음 특징).
const rows = ["Rows,Fin Pitch (mm),Coil Depth (mm)"];
for (let i = 0; i < 12; i++) { const r = 2 + (i % 9); rows.push(`${r},${(1.8 + R() * 1.4).toFixed(2)},${25 * r + 50}`); }
writeFileSync(path.join(OUT, "SAMPLE_coil_techdoc.csv"), rows.join("\n") + "\n", "utf8");
writeFileSync(path.join(OUT, "ANSWERS.json"), JSON.stringify(answers, null, 2) + "\n", "utf8");
console.log(`${readdirSync(OUT).length} files -> ${OUT}`);
