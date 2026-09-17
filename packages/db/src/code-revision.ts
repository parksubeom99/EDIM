import type { CodeRevision } from "@prisma/client";
import type { TenantClient } from "./tenant";
import { requireTenant } from "./tenant";

/**
 * Tier B — RCCS assembled-code persistence with revision history.
 *
 * Blueprint: EDIM.pdf p24 "Revisions" (rev_no, rev_date, rev_reason, revised_by)
 * and p12/p13 "Revision : A". Rules:
 *  - append-only: saving is always a new rev_no (max+1 per node); the table
 *    grants no UPDATE/DELETE to the app role, so history cannot be rewritten.
 *  - current = highest rev_no.
 *  - the assembled `code` string is stored alongside `slots` so the history
 *    reads without re-running the grammar; the grammar (apps/web/lib/rccs)
 *    stays the single place that validates.
 *  - revision letters (A, B, C…) are a display concern: see revLabel().
 */
export interface SaveRevisionInput {
  stableId: string;
  code: string;
  slots: Record<string, string>;
  reason?: string | null;
  createdBy: string;
}

/** 1 → "A", 26 → "Z", 27 → "AA" (p12 shows letter revisions). */
export function revLabel(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s || "-";
}

export function listRevisions(tx: TenantClient, stableId: string): Promise<CodeRevision[]> {
  return tx.codeRevision.findMany({ where: { hierarchyStable: stableId }, orderBy: { revNo: "desc" } });
}

export function getCurrentRevision(tx: TenantClient, stableId: string): Promise<CodeRevision | null> {
  return tx.codeRevision.findFirst({ where: { hierarchyStable: stableId }, orderBy: { revNo: "desc" } });
}

export async function saveRevision(tx: TenantClient, input: SaveRevisionInput): Promise<CodeRevision> {
  const tenantId = await requireTenant(tx);
  const agg = await tx.codeRevision.aggregate({ _max: { revNo: true }, where: { hierarchyStable: input.stableId } });
  const revNo = (agg._max.revNo ?? 0) + 1;
  const row = await tx.codeRevision.create({
    data: {
      tenantId,
      hierarchyStable: input.stableId,
      revNo,
      code: input.code,
      slots: input.slots,
      reason: input.reason ?? null,
      createdBy: input.createdBy,
    },
  });
  await tx.$executeRaw`
    INSERT INTO audit_log (tenant_id, actor_id, action, entity, entity_id, before, after)
    VALUES (current_setting('app.current_tenant')::uuid, ${input.createdBy}::uuid, 'code.revision', 'code_revision', ${row.id},
            NULL, ${JSON.stringify({ revNo, code: input.code })}::jsonb)`;
  return row;
}
