import DICT from "./align-dictionary.json";
import type { RawFeature } from "./extract";

/**
 * B · ② align(정렬화) — 원천의 이름·단위를 EDIM 형식으로. 사전(align-dictionary.json)은 이 도구가 부를 때만 읽는다.
 *   1) 사전의 동의어 → EDIM 이름 (대소문자 · 공백 무시)
 *   2) `SECTION <이름>` → section.<이름>.length (사전의 구획 목록에 있을 때만)
 *   3) 단위 환산(inch → mm)
 *   4) 그래도 못 맞춘 이름은 **로컬 AI**(선택)에게 허용 목록 안에서만 고르게 한다 — 사전 밖의 약어 등.
 *      로컬 AI 가 없거나 허용 목록 밖을 말하면 미정렬로 둔다(숨기지 않는다 — 라벨 품질).
 * 파생 특징: section_sum = 그 기록의 구획 길이 합(구획이 2개 이상일 때).
 */
export interface AlignedFeature extends RawFeature {
  alignedName: string | null;
  /** 어떻게 맞췄나 — 사전 · 구획 · 로컬 AI · 파생 · 못 맞춤 */
  alignedBy: "dictionary" | "section" | "local-ai" | "derived" | null;
  /** 환산 뒤 값(mm) */
  alignedValue: number;
}

const norm = (s: string) => s.trim().toUpperCase().replace(/[\s_]+/g, " ");
const SYN = new Map<string, string>();
for (const [name, syns] of Object.entries(DICT.names)) for (const s of syns) SYN.set(norm(s), name);
const SECTIONS = new Map(DICT.sections.map((s) => [norm(s), s.toLowerCase()]));
const UNITS = DICT.units as Record<string, number>;
export const ALLOWED_NAMES: readonly string[] = DICT.allowed;

export function alignByDictionary(label: string): { name: string; by: "dictionary" | "section" } | null {
  const n = norm(label);
  const d = SYN.get(n);
  if (d) return { name: d, by: "dictionary" };
  const m = /^SECTION (.+)$/.exec(n);
  if (m && SECTIONS.has(m[1]!)) return { name: `section.${SECTIONS.get(m[1]!)}.length`, by: "section" };
  return null;
}

/** 로컬 AI 가 준 이름 판정 — 허용 목록 · 사전에서 이미 쓴 이름과 겹치지 않을 때만 받는다. */
export type LocalAiNamer = (labels: string[]) => Promise<Map<string, string | null>>;

export async function alignFeatures(raw: RawFeature[], namer?: LocalAiNamer): Promise<{ features: AlignedFeature[]; unaligned: string[]; localAi: Map<string, string | null> }> {
  const first = raw.map<AlignedFeature>((f) => {
    const a = alignByDictionary(f.rawLabel);
    const k = UNITS[f.unit] ?? 1;
    return { ...f, alignedName: a?.name ?? null, alignedBy: a?.by ?? null, alignedValue: Math.round(f.value * k * 1000) / 1000 };
  });
  const missing = [...new Set(first.filter((f) => !f.alignedName).map((f) => f.rawLabel))];
  let localAi = new Map<string, string | null>();
  if (missing.length && namer) {
    try { localAi = await namer(missing); } catch { localAi = new Map(); }
  }
  for (const f of first) {
    if (f.alignedName) continue;
    const g = localAi.get(f.rawLabel);
    if (!g || !ALLOWED_NAMES.includes(g)) continue;
    // 같은 기록에 사전이 이미 맞춘 같은 이름이 있으면 로컬 AI 답은 버린다(사전이 우선)
    if (first.some((o) => o.record === f.record && o.alignedName === g && o.alignedBy !== "local-ai")) continue;
    f.alignedName = g; f.alignedBy = "local-ai";
  }
  // 파생 특징 — 구획 길이 합
  const records = [...new Set(first.map((f) => f.record))];
  const derived: AlignedFeature[] = [];
  for (const r of records) {
    const secs = first.filter((f) => f.record === r && f.alignedName?.startsWith("section."));
    if (secs.length >= 2) {
      const v = Math.round(secs.reduce((a, f) => a + f.alignedValue, 0) * 1000) / 1000;
      derived.push({ record: r, rawLabel: "Σ section", value: v, unit: "mm", layer: "SECTION", via: "geometry", alignedName: "section_sum", alignedBy: "derived", alignedValue: v });
    }
  }
  const features = [...first, ...derived];
  return { features, unaligned: [...new Set(features.filter((f) => !f.alignedName).map((f) => f.rawLabel))], localAi };
}
