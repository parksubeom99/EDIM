/**
 * Two-tier approval pipeline (p28 · p56): Design → Check → Approve → Accepted.
 *
 * Derived purely from existing `ProjectApproval` rows (no schema change):
 *   note prefix `tier:org`      → organizational approval (tier 1)
 *   note prefix `tier:platform` → platform approval (tier 2)
 *
 *   Design   : no org row, or latest org row rejected
 *   Check    : latest org row requested
 *   Approve  : latest org row approved, platform not yet approved
 *   Accepted : latest platform row approved
 */

export type ApprovalTier = "org" | "platform";
export type PipelineStage = "Design" | "Check" | "Approve" | "Accepted";
export const PIPELINE: readonly PipelineStage[] = [
  "Design",
  "Check",
  "Approve",
  "Accepted",
];

export interface ApprovalRow {
  id: string;
  state: string; // requested | approved | rejected
  note: string | null;
  requestedAt: string | Date;
}

export const TIER_PREFIX: Record<ApprovalTier, string> = {
  org: "tier:org",
  platform: "tier:platform",
};

export function tierOf(row: ApprovalRow): ApprovalTier | null {
  const n = row.note ?? "";
  if (n.startsWith(TIER_PREFIX.platform)) return "platform";
  if (n.startsWith(TIER_PREFIX.org)) return "org";
  return null;
}

function latest(rows: ApprovalRow[], tier: ApprovalTier): ApprovalRow | null {
  const xs = rows
    .filter((r) => tierOf(r) === tier)
    .sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
  return xs[0] ?? null;
}

export interface PipelineState {
  stage: PipelineStage;
  org: ApprovalRow | null;
  platform: ApprovalRow | null;
  /** id of the row awaiting a decision (for decide buttons), if any */
  pending: { tier: ApprovalTier; id: string } | null;
  /** which transition the current user may request next */
  next: ApprovalTier | null;
}

export function derivePipeline(rows: ApprovalRow[]): PipelineState {
  const org = latest(rows, "org");
  const platform = latest(rows, "platform");

  if (platform && platform.state === "approved")
    return { stage: "Accepted", org, platform, pending: null, next: null };
  if (platform && platform.state === "requested")
    return {
      stage: "Approve",
      org,
      platform,
      pending: { tier: "platform", id: platform.id },
      next: null,
    };
  if (org && org.state === "approved")
    return { stage: "Approve", org, platform, pending: null, next: "platform" };
  if (org && org.state === "requested")
    return {
      stage: "Check",
      org,
      platform,
      pending: { tier: "org", id: org.id },
      next: null,
    };
  return { stage: "Design", org, platform, pending: null, next: "org" };
}

export function stageIndex(stage: PipelineStage): number {
  return PIPELINE.indexOf(stage);
}
