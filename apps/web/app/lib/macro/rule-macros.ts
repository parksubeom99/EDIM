import { parse, InMemoryProvider } from "@edim/macro-dsl";
import { dryRun } from "@edim/macro-verify";
import { withTenant } from "@edim/db";
import type { DesignRule, MacroRuleEval, MacroRuleOutcome } from "@edim/bom-code";

/**
 * E6 · p39 "설계 검증 [Macro]" — 규칙 표의 op=macro 행이 가리키는 매크로를 **이름**으로 찾는다.
 * 매크로의 이름 = 그 매크로가 걸린 Work Hierarchy 노드의 이름(label, 현재 개정).
 *
 * BOM Run 한 번에 한 번만 DB 를 읽고(이름 → 노드 → 승인본), 판정은 기존 결정론 실행기(dryRun)로
 * **스냅샷 값만** 넣어 돌린다 — 런타임 LLM 0, 같은 스냅샷이면 같은 판정.
 * 없음 · 미승인(초안만 있음) · 실행 오류는 통과로 치지 않는다(bom-code checkDesign 이 위반으로 적는다).
 */
export async function ruleMacroEvaluator(tenantId: string, rules: DesignRule[]): Promise<MacroRuleEval | undefined> {
  const names = [...new Set(rules.flatMap((r) => (r.op === "macro" ? [r.macro] : [])))];
  if (names.length === 0) return undefined;
  const found = await withTenant(tenantId, async (tx) => {
    const nodes = await tx.hierarchyNode.findMany({ where: { label: { in: names }, isCurrent: true }, select: { stableId: true, label: true } });
    const stables = nodes.map((n) => n.stableId);
    const macros = stables.length
      ? await tx.macroRegistry.findMany({ where: { stableId: { in: stables } }, select: { stableId: true, status: true, dsl: true, revision: true } })
      : [];
    return { nodes, macros };
  });
  const byName = new Map<string, MacroRuleOutcome | { dsl: string }>();
  for (const name of names) {
    const node = found.nodes.find((n) => n.label === name);
    if (!node) { byName.set(name, { ok: false, reason: "missing" }); continue; }
    const mine = found.macros.filter((m) => m.stableId === node.stableId);
    const approved = mine.find((m) => m.status === "approved");
    if (approved) byName.set(name, { dsl: approved.dsl });
    else byName.set(name, { ok: false, reason: mine.length ? "unapproved" : "missing" });
  }
  return (name, facts) => {
    const got = byName.get(name) ?? { ok: false, reason: "missing" };
    if (!("dsl" in got)) return got;
    const parsed = parse(got.dsl);
    if (!parsed.ok) return { ok: false, reason: "error", message: parsed.error.message };
    // 조건에는 코드 기호(L · LMAXPCT …), 셈에는 같은 값의 Var(DIM, …) — 학습 공식이 옮겨 오는 어휘와 같다
    const vars: Record<string, number> = { "DIM|SECSUM": facts.L ?? 0 };
    for (const [k, v] of Object.entries(facts)) vars[`DIM|${k}`] = v;
    const r = dryRun(parsed.value, new InMemoryProvider({ codes: facts, vars }));
    if (!r.ok) return { ok: false, reason: "error", message: r.diagnostic?.message ?? "evaluation failed" };
    return typeof r.value === "number" ? { ok: true, value: r.value } : { ok: false, reason: "error", message: "결과가 숫자가 아님" };
  };
}
