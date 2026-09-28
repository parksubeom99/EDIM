import {
  platformSourceContents, platformInsertFeatures, platformDeleteFeatures, platformListFeatures, platformInsertFormula,
  platformDecideFormula, platformProjectFormula, platformGetJob,
} from "@edim/db";
import { extractSource } from "./extract";
import { alignFeatures, alignByDictionary } from "./align";
import { mineFormulas, type Candidate, type MineRecord } from "./mine";
import { learnedExpression, userProjection, verifyCandidate, describeExpression, lrnId, koName } from "./formula";
import { makeLocalNamer, explainFormula, type LocalAiUsage } from "./local-ai";

/**
 * B · 학습 도구 등록부 — 이름 → 도구 하나. 작업 실행기(runner.ts)는 이 맵을 돌 뿐 도구의 속을 모른다(도구 추가 = 항목 하나).
 * 도구 수명주기 3단: validate(입력) → authorize(맥락) → run(입력, 맥락).
 *   readOnly = true  : 원천·특징을 읽고 자기 결과만 쓴다(extract · align · mine · verify)
 *   readOnly = false : 학습 결과를 확정하거나 회사로 내보낸다(approve · project) — **관리자 승인 관문**을 통과해야만 돈다.
 * 하위 작업자 격리: extract 는 원천 1건씩 · align 은 원천 1건의 특징 묶음씩만 본다(서로의 중간 상태를 모른다).
 */
export interface ToolCtx {
  jobId: string;
  actorId: string;
  /** 관리자가 화면에서 이 쓰기를 눌렀다(승인 관문) — readOnly=false 도구는 이것 없이 돌지 않는다 */
  adminApproved?: boolean;
  usage: LocalAiUsage;
}
export interface ToolResult { outputRef: Record<string, unknown>; rows: number }
export interface LearningTool {
  name: string;
  readOnly: boolean;
  /** 한 줄 설명(계획 미리보기에 보인다) */
  title: string;
  validate(input: Record<string, unknown>): string | null;
  authorize(ctx: ToolCtx): string | null;
  run(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const readOnlyGate = () => null;
const adminGate = (ctx: ToolCtx) => (ctx.adminApproved ? null : "관리자 승인 없이 쓰기 도구를 돌릴 수 없습니다");

/** 이전 단계 결과(작업 그래프) — mine 의 후보를 verify 가 읽는다 */
async function stepOutput(jobId: string, tool: string): Promise<Record<string, unknown> | null> {
  const j = await platformGetJob(jobId);
  const s = j?.steps.find((x) => x.tool === tool && x.state === "done");
  return (s?.outputRef as Record<string, unknown> | null) ?? null;
}

/** 특징 → 기록(도면 1장 · CSV 1행). id 는 원천 제목(+ 행 번호) — 사람이 어긋난 도면을 바로 찾게. */
export async function jobRecords(jobId: string, titles: Map<string, string>): Promise<MineRecord[]> {
  const feats = await platformListFeatures(jobId);
  const by = new Map<string, MineRecord>();
  for (const f of feats) {
    if (!f.alignedName || f.alignedValue === null) continue;
    const t = titles.get(f.sourceId) ?? f.sourceId;
    const id = t.endsWith(".csv") ? `${t}#${f.record + 1}` : t;
    const r = by.get(id) ?? { id, features: {} };
    r.features[f.alignedName] = f.alignedValue;
    by.set(id, r);
  }
  return [...by.values()];
}

export const TOOLS: Record<string, LearningTool> = {
  extract: {
    name: "extract", readOnly: true, title: "도면·문서 → 특징 행(치수 글자 · 구획 길이 · 코드 슬롯 · 표 열)",
    validate: (i) => (i.sourceIds === undefined || (Array.isArray(i.sourceIds) && i.sourceIds.every((x) => typeof x === "string" && UUID.test(x))) ? null : "sourceIds 는 uuid 목록"),
    authorize: readOnlyGate,
    async run(i, ctx) {
      const srcs = await platformSourceContents(i.sourceIds as string[] | undefined);
      await platformDeleteFeatures(ctx.jobId);   // 재시작해도 같은 결과(작업 그래프 재실행)
      let rows = 0;
      for (const s of srcs) {
        const raw = extractSource(s.kind, Buffer.from(s.content).toString("utf8"));   // 원천 1건만 본다
        rows += await platformInsertFeatures(ctx.jobId, raw.map((f) => ({ sourceId: s.id, record: f.record, name: f.rawLabel, value: f.value, unit: f.unit, rawLabel: f.rawLabel, layer: f.layer, via: f.via })));
      }
      return { outputRef: { sources: srcs.length, features: rows }, rows };
    },
  },
  align: {
    name: "align", readOnly: true, title: "이름·단위를 EDIM 형식으로(정렬 사전 → 사전 밖은 로컬 AI · 허용 목록 안에서만)",
    validate: () => null, authorize: readOnlyGate,
    async run(_i, ctx) {
      const feats = (await platformListFeatures(ctx.jobId)).filter((f) => f.alignedBy !== "derived");   // 다시 돌려도 파생이 겹치지 않게
      // 사전 밖 이름을 먼저 모아 로컬 AI 에 한 번만 묻는다(원천마다 부르지 않는다 — 비용)
      const unknown = [...new Set(feats.filter((f) => !alignByDictionary(f.rawLabel)).map((f) => f.rawLabel))];
      const answers = unknown.length ? await makeLocalNamer(ctx.usage)(unknown) : new Map<string, string | null>();
      const namer = async (ls: string[]) => new Map(ls.map((l) => [l, answers.get(l) ?? null] as const));
      const bySource = new Map<string, typeof feats>();
      for (const f of feats) bySource.set(f.sourceId, [...(bySource.get(f.sourceId) ?? []), f]);
      await platformDeleteFeatures(ctx.jobId);
      let rows = 0; const unaligned = new Set<string>(); let byDict = 0, byAi = 0;
      for (const [sourceId, fs] of bySource) {   // 원천 1건의 특징 묶음씩(격리)
        const a = await alignFeatures(fs.map((f) => ({ record: f.record, rawLabel: f.rawLabel, value: f.value, unit: f.unit, layer: f.layer, via: f.via as "text" | "geometry" | "code" | "table" })), namer);
        a.unaligned.forEach((u) => unaligned.add(u));
        byDict += a.features.filter((x) => x.alignedBy === "dictionary" || x.alignedBy === "section").length;
        byAi += a.features.filter((x) => x.alignedBy === "local-ai").length;
        rows += await platformInsertFeatures(ctx.jobId, a.features.map((f) => ({
          sourceId, record: f.record, name: f.alignedName ?? f.rawLabel, value: f.value, unit: f.unit, rawLabel: f.rawLabel, layer: f.layer, via: f.via,
          alignedName: f.alignedName, alignedBy: f.alignedBy, alignedValue: f.alignedValue,
        })));
      }
      return { outputRef: { features: rows, byDictionary: byDict, byLocalAi: byAi, unaligned: [...unaligned], localAi: Object.fromEntries(answers) }, rows };
    },
  },
  mine: {
    name: "mine", readOnly: true, title: "특징 사이의 공식 후보 탐구(특징 ≤ 3 · 허용 1 mm · 어긋남 ≤ 5 % · 근거 ≥ 10)",
    validate: () => null, authorize: readOnlyGate,
    async run(i, ctx) {
      const recs = await jobRecords(ctx.jobId, (i.titles as Map<string, string>) ?? new Map());
      const m = mineFormulas(recs);
      return { outputRef: { records: recs.length, tried: m.tried, capped: m.capped, accepted: m.accepted, rejected: m.rejected.slice(0, 20) }, rows: m.accepted.length };
    },
  },
  verify: {
    name: "verify", readOnly: true, title: "후보를 Macro DSL 로 적어 검증기 · 시험 실행 3장 → 공식 후보(proposed)",
    validate: () => null, authorize: readOnlyGate,
    async run(i, ctx) {
      const mined = await stepOutput(ctx.jobId, "mine");
      const cands = (mined?.accepted ?? []) as Candidate[];
      const recs = await jobRecords(ctx.jobId, (i.titles as Map<string, string>) ?? new Map());
      let proposed = 0, rejected = 0;
      for (const c of cands) {
        const v = verifyCandidate(c, recs);
        const expr = learnedExpression(c);
        const up = userProjection(c);
        const glossary: Record<string, string> = {};
        for (const n of [c.target, ...c.terms.map((t) => t.name)]) glossary[`LRN|${lrnId(n)}`] = koName(n);
        const plain = `${koName(c.target)} = ${describeExpression(expr, glossary)}`;
        const note = v.ok ? await explainFormula(plain, ctx.usage) : null;
        await platformInsertFormula({
          jobId: ctx.jobId, target: c.target, expression: expr, userTarget: up.target, userExpression: up.expression,
          fit: c.fit, supportSources: c.fit.n, outliers: c.outliers, verify: { ...v, missingInCompany: up.missing },
          description: plain, localAiNote: note, state: v.ok ? "proposed" : "rejected", note: v.ok ? "" : v.reason,
        });
        if (v.ok) proposed++; else rejected++;
      }
      return { outputRef: { proposed, rejected }, rows: proposed + rejected };
    },
  },
  approve: {
    name: "approve", readOnly: false, title: "후보 → 승인 공식(사람이 붙이는 라벨)",
    validate: (i) => (typeof i.formulaId === "string" && UUID.test(i.formulaId) && (i.decision === "approved" || i.decision === "rejected") ? null : "formulaId · decision(approved|rejected)"),
    authorize: adminGate,
    async run(i, ctx) {
      const n = await platformDecideFormula(i.formulaId as string, i.decision as "approved" | "rejected", ctx.actorId, typeof i.note === "string" ? i.note.slice(0, 300) : "");
      return { outputRef: { changed: n }, rows: n };
    },
  },
  project: {
    name: "project", readOnly: false, title: "승인 공식 → π_user → 회사 착지 표(한쪽 방향 · SECURITY DEFINER 함수)",
    validate: (i) => (typeof i.formulaId === "string" && UUID.test(i.formulaId) && typeof i.tenantId === "string" && UUID.test(i.tenantId) ? null : "formulaId · tenantId"),
    authorize: adminGate,
    async run(i, ctx) {
      const sid = await platformProjectFormula(i.formulaId as string, i.tenantId as string, ctx.actorId);
      return { outputRef: { suggestionId: sid }, rows: 1 };
    },
  },
};

/** 새 학습 작업의 기본 계획(읽기 전용 4단계). 승인·투영은 관리자가 결과를 보고 누른다. */
export const DEFAULT_PLAN = ["extract", "align", "mine", "verify"] as const;
