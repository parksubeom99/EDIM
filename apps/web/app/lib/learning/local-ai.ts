import { ALLOWED_NAMES } from "./align";

/**
 * 로컬 AI — 이 서버 옆에서 도는 로컬 LLM(Ollama). 외부 API 키 없음 · 자료가 밖으로 나가지 않는다.
 *
 * 쓰는 곳은 플랫폼 학습 작업(DB① 쪽) 두 군데뿐이다:
 *   1) align — 사전에 없는 도면 이름을 **허용 목록 안에서만** 고르게 한다(JSON 스키마로 출력 제한 · 목록 밖/모름 = null)
 *   2) 공식 카드의 쉬운 설명 한 줄(결정론 역번역 옆에 "로컬 AI 설명"으로 따로 붙인다)
 * 어느 쪽도 공식을 **만들지** 않는다 — 공식은 결정론 탐구(mine)가 찾고, 검증기와 관리자 승인을 거친다.
 * 회사 런타임(BOM Run · EDIM Run)은 여전히 LLM 호출 0.
 *
 * 켜기: EDIM_LOCAL_AI_URL=http://localhost:11434 (· EDIM_LOCAL_AI_MODEL, 기본 qwen2.5-coder:7b-32k).
 * 꺼져 있거나 응답이 없으면 결정론 폴백(사전만) — 작업은 멈추지 않고, 미정렬로 드러난다.
 */
export interface LocalAiUsage { calls: number; promptTokens: number; outputTokens: number; ms: number; model: string | null; error?: string }

export function localAiConfig(): { url: string; model: string } | null {
  const url = process.env.EDIM_LOCAL_AI_URL?.trim();
  if (!url) return null;
  return { url: url.replace(/\/+$/, ""), model: process.env.EDIM_LOCAL_AI_MODEL?.trim() || "qwen2.5-coder:7b-32k" };
}

async function chat(system: string, user: string, format: object, usage: LocalAiUsage): Promise<unknown> {
  const cfg = localAiConfig();
  if (!cfg) throw new Error("local ai off");
  usage.model = cfg.model;
  const t0 = Date.now();
  const res = await fetch(`${cfg.url}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.model, stream: false, format, options: { temperature: 0, seed: 42 }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    signal: AbortSignal.timeout(90_000),
  });
  usage.ms += Date.now() - t0;
  if (!res.ok) throw new Error(`local ai ${res.status}`);
  const j = (await res.json()) as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
  usage.calls += 1;
  usage.promptTokens += j.prompt_eval_count ?? 0;
  usage.outputTokens += j.eval_count ?? 0;
  return JSON.parse(j.message?.content ?? "null");
}

const VOCAB_HELP =
  "overall_length (total length), overall_width (total width), overall_height (total height incl. frames), " +
  "casing_height (height of the casing box without frames), base_frame (height of one base/top frame channel), " +
  "code.cap (capacity code), coil.rows, coil.fin_pitch, coil.depth";

/** 사전 밖 이름 → 허용 목록의 이름 또는 null. 실패하면 빈 지도(폴백). */
export function makeLocalNamer(usage: LocalAiUsage) {
  return async (labels: string[]): Promise<Map<string, string | null>> => {
    const out = new Map<string, string | null>();
    if (!localAiConfig() || labels.length === 0) return out;
    try {
      const format = {
        type: "object",
        properties: { mappings: { type: "array", items: { type: "object", properties: { label: { type: "string" }, name: { type: ["string", "null"], enum: [...ALLOWED_NAMES, null] } }, required: ["label", "name"] } } },
        required: ["mappings"],
      };
      const j = (await chat(
        `You map dimension labels found on air-handling-unit (AHU) CAD drawings to a fixed vocabulary. Answer only with the JSON. Use null when unsure.\nVocabulary: ${VOCAB_HELP}.`,
        `Labels: ${JSON.stringify(labels)}`, format, usage,
      )) as { mappings?: { label?: string; name?: string | null }[] };
      for (const m of j?.mappings ?? []) {
        if (typeof m.label !== "string" || !labels.includes(m.label)) continue;
        out.set(m.label, typeof m.name === "string" && ALLOWED_NAMES.includes(m.name) ? m.name : null);
      }
    } catch (e) { usage.error = e instanceof Error ? e.message : String(e); }
    return out;
  };
}

/** 공식 한 줄 설명(한국어). 입력은 결정론 역번역(한국어 이름) — 실패하면 null, 카드에는 역번역만 남는다. */
export async function explainFormula(plainKo: string, usage: LocalAiUsage): Promise<string | null> {
  if (!localAiConfig()) return null;
  try {
    const j = (await chat(
      "너는 공조기(AHU) 설계 엔지니어에게 도면에서 찾은 공식을 설명한다. 한국어 한 문장으로만 답한다. 변수 이름(영문)은 쓰지 말고 주어진 한국어 이름을 쓴다. 공식에 없는 숫자를 지어내지 않는다.\n" +
        "예) 공식: 전고 = 케이싱 높이 + (2 × 프레임 높이) → 문장: 전고는 케이싱 높이에 위·아래 프레임 높이를 한 번씩 더한 값이다.",
      `공식: ${plainKo}`,
      { type: "object", properties: { sentence: { type: "string" } }, required: ["sentence"] }, usage,
    )) as { sentence?: string };
    const s = typeof j?.sentence === "string" ? j.sentence.trim().slice(0, 200) : "";
    return s || null;
  } catch (e) { usage.error = e instanceof Error ? e.message : String(e); return null; }
}

export const newUsage = (): LocalAiUsage => ({ calls: 0, promptTokens: 0, outputTokens: 0, ms: 0, model: null });
