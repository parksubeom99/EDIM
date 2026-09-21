import type { TenantClient } from "./tenant";

/**
 * P6 — 밖으로 나가는 것은 **승인된 BOM 스냅샷**에서만.
 * 도면·문서의 발행(issued)과 구매 요청의 발주(ordered)가 이 문을 지난다.
 * 방어는 DB 트리거(0010 `release_gate`)가 한다 — 여기 검사는 한국어로 이유를 돌려주기 위한 것이다.
 */
export class BomNotApprovedError extends Error {
  readonly code = "BOM_NOT_APPROVED";
  constructor(what: string) {
    super(`승인되지 않은 BOM 에서 나온 ${what} 수 없습니다 — Inspector 에서 이 BOM 의 Check 요청 → 승인을 먼저 받으세요`);
    this.name = "BomNotApprovedError";
  }
}

/** 조직 승인(tier:org)이 approved 인 기록이 이 스냅샷에 묶여 있는가. */
export async function isRunApproved(tx: TenantClient, bomRunId: string): Promise<boolean> {
  const n = await tx.projectApproval.count({
    where: { bomRunId, state: "approved", note: { startsWith: "tier:org" } },
  });
  return n > 0;
}

export async function assertRunApproved(tx: TenantClient, bomRunId: string, what: string): Promise<void> {
  if (!(await isRunApproved(tx, bomRunId))) throw new BomNotApprovedError(what);
}
