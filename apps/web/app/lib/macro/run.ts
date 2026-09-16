import { parse } from "@edim/macro-dsl";
import { dryRun, verify, hasErrors, type Diagnostic } from "@edim/macro-verify";
import { createDraft, getApproved, withTenant } from "@edim/db";
import { getServerSession } from "../session";
import { getTreeForSession } from "../hierarchy";
import type { SlotValues } from "../rccs";
import { providerFromSlots } from "./provider";

/** Baseline slots used to probe a draft at runtime (all code refs defined). */
const BASELINE_SLOTS: SlotValues = { A: "EU", B: "55", C: "2123", D: "630", E: "SS", F: "1-21-13-15" };

export interface RunOutcome {
  readonly ok: boolean;
  readonly status: "ran" | "no-macro" | "parse-error" | "eval-error";
  readonly macroId?: string;
  readonly revision?: number;
  readonly dsl?: string;
  readonly value?: number | number[] | string;
  readonly preview?: string;
  readonly message: string;
}

/**
 * M2 execution loop: approved macro for the node → parse → evaluate against the
 * slot-derived provider. Only *approved* macros run (registry invariant); a draft
 * never reaches the runtime.
 */
export async function runApprovedForSession(stableId: string, slots: SlotValues): Promise<RunOutcome | null> {
  const session = await getServerSession();
  if (!session) return null;
  const macro = await withTenant(session.tenantId, (tx) => getApproved(tx, stableId));
  if (!macro) return { ok: false, status: "no-macro", message: "승인된 매크로 없음 — Macro 탭에서 초안 → 승인" };
  const parsed = parse(macro.dsl);
  if (!parsed.ok) return { ok: false, status: "parse-error", macroId: macro.id, dsl: macro.dsl, message: parsed.error.message };
  const r = dryRun(parsed.value, providerFromSlots(slots));
  if (!r.ok)
    return { ok: false, status: "eval-error", macroId: macro.id, revision: macro.revision, dsl: macro.dsl, message: r.diagnostic?.message ?? "evaluation failed" };
  return {
    ok: true,
    status: "ran",
    macroId: macro.id,
    revision: macro.revision,
    dsl: macro.dsl,
    value: r.value,
    preview: r.preview,
    message: `Run → ${typeof r.value === "number" ? Math.round(r.value * 1000) / 1000 : String(r.value)}`,
  };
}

/** Direct-input path (p57 Macro): a DSL draft without the LLM compiler. */
export async function draftDslForSession(
  stableId: string,
  dsl: string,
): Promise<{ macroId: string | null; diagnostics: Diagnostic[] } | null> {
  const session = await getServerSession();
  if (!session) return null;
  const tree = await getTreeForSession();
  if (!tree) return null;
  const diagnostics = [...verify(dsl, { tree, tenantId: session.tenantId })];
  if (!hasErrors(diagnostics)) {
    // Static verify cannot see runtime code refs / tables; dry-run against the
    // baseline provider so an unknown symbol is caught *before* it can be approved.
    const parsed = parse(dsl);
    if (parsed.ok) {
      const probe = dryRun(parsed.value, providerFromSlots(BASELINE_SLOTS));
      if (!probe.ok && probe.diagnostic) diagnostics.push(probe.diagnostic);
    }
  }
  if (hasErrors(diagnostics)) return { macroId: null, diagnostics };
  const macroId = await withTenant(session.tenantId, (tx) =>
    createDraft(tx, { stableId, dsl, createdBy: session.userId }),
  );
  return { macroId, diagnostics };
}
