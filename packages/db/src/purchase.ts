import type { TenantClient } from "./tenant";
import { writeAudit } from "./audit";
import { assertRunApproved } from "./approval-gate";

/**
 * P4-b — 구매 요청(p51 [Set-Up / User ERP / Material / Purchase]).
 *
 * 머리: Purchase request No · BOM No.(= 스냅샷) · Project No. · Process · PO No.
 * 줄:   Item · Code · Supplier · Required date · Price — 값은 **스냅샷 줄에서 복사**한다.
 * Process 는 draft → rfq(견적 요청) → ordered(발주) 한 방향이고, 발주되면 잠긴다.
 * 한 스냅샷에 구매 요청은 하나다(DB unique) — 같은 BOM 으로 두 번 사지 않는다.
 */

export const PR_STATUSES = ["draft", "rfq", "ordered"] as const;
export type PrStatus = (typeof PR_STATUSES)[number];
export const PR_STATUS_LABEL: Record<PrStatus, string> = { draft: "작성중", rfq: "견적 요청", ordered: "발주" };
export const isPrStatus = (v: unknown): v is PrStatus =>
  typeof v === "string" && (PR_STATUSES as readonly string[]).includes(v);

export class PrLockedError extends Error {
  readonly code = "PR_LOCKED";
  constructor(no: string) {
    super(`발주된 구매 요청 ${no} 은 수정할 수 없습니다`);
    this.name = "PrLockedError";
  }
}
export class PrBackwardsError extends Error {
  readonly code = "PROCESS_BACKWARDS";
  constructor(from: string, to: string) {
    super(`구매 Process 는 되돌릴 수 없습니다 (${from} → ${to})`);
    this.name = "PrBackwardsError";
  }
}
export class PrDuplicateError extends Error {
  readonly code = "PR_DUPLICATE";
  constructor(readonly prNo: string) {
    super(`이 BOM 스냅샷의 구매 요청이 이미 있습니다 (${prNo})`);
    this.name = "PrDuplicateError";
  }
}
export class PrEmptyError extends Error {
  readonly code = "PR_EMPTY";
  constructor() {
    super("이 BOM 스냅샷에는 구매 품목이 없습니다");
    this.name = "PrEmptyError";
  }
}

export interface PrLineInput {
  bomLineNo: number;
  childCode: string;
  resolvedCode: string;
  part: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

export interface CreatePrInput {
  stableId: string | null;
  bomRunId: string;
  /** 번호 머리의 가운데 — 프로젝트 번호에서 온다('61313' → PR-61313-n · PO-61313-n, p51) */
  noCore: string;
  projectNo: string | null;
  code: string;
  requiredDate: Date | null;
  remarks: string | null;
  lines: PrLineInput[];
  createdBy: string;
}

async function nextNo(tx: TenantClient, kind: "PR" | "PO", core: string): Promise<string> {
  const head = `${kind}-${core}-`;
  const rows = await tx.purchaseRequest.findMany({
    where: kind === "PR" ? { prNo: { startsWith: head } } : { poNo: { startsWith: head } },
    select: { prNo: true, poNo: true },
  });
  const max = rows.reduce((m, r) => Math.max(m, Number(((kind === "PR" ? r.prNo : r.poNo) ?? "").slice(head.length)) || 0), 0);
  return `${head}${max + 1}`;
}

export async function createPurchaseRequest(tx: TenantClient, input: CreatePrInput) {
  if (input.lines.length === 0) throw new PrEmptyError();
  const dup = await tx.purchaseRequest.findFirst({ where: { bomRunId: input.bomRunId }, select: { prNo: true } });
  if (dup) throw new PrDuplicateError(dup.prNo);

  const tenantId = (
    await tx.$queryRaw<{ t: string }[]>`
      SELECT current_setting('app.current_tenant')::uuid AS t`
  )[0]!.t;
  const prNo = await nextNo(tx, "PR", input.noCore);
  const row = await tx.purchaseRequest.create({
    data: {
      tenantId,
      hierarchyStable: input.stableId,
      bomRunId: input.bomRunId,
      prNo,
      projectNo: input.projectNo,
      code: input.code,
      requiredDate: input.requiredDate,
      remarks: input.remarks,
      createdBy: input.createdBy,
      lines: {
        create: input.lines.map((l, i) => ({
          tenantId, lineNo: i + 1, bomLineNo: l.bomLineNo, childCode: l.childCode, resolvedCode: l.resolvedCode,
          part: l.part, spec: l.spec, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice, requiredDate: input.requiredDate,
        })),
      },
    },
    include: { lines: { orderBy: { lineNo: "asc" } } },
  });
  await writeAudit(tx, input.createdBy, "create", "purchase_request", row.id, null, {
    prNo: row.prNo, bomRunId: row.bomRunId, lines: row.lines.length,
  });
  return row;
}

export async function listPurchaseRequests(tx: TenantClient, stableId?: string | null) {
  return tx.purchaseRequest.findMany({
    where: stableId ? { hierarchyStable: stableId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { lines: { orderBy: { lineNo: "asc" } } },
  });
}

export async function getPurchaseRequest(tx: TenantClient, id: string) {
  return tx.purchaseRequest.findUnique({ where: { id }, include: { lines: { orderBy: { lineNo: "asc" } } } });
}

/** Process 전이. 발주로 올릴 때 PO 번호가 붙는다(p51 "PO No : PO-61313-2"). */
export async function setPurchaseRequestStatus(
  tx: TenantClient,
  input: { id: string; status: PrStatus; actorId: string },
) {
  const cur = await tx.purchaseRequest.findUnique({ where: { id: input.id } });
  if (!cur) throw new Error("purchase request not found");
  if (cur.status === "ordered") throw new PrLockedError(cur.prNo);
  const order = PR_STATUSES as readonly string[];
  if (order.indexOf(input.status) < order.indexOf(cur.status))
    throw new PrBackwardsError(cur.status, input.status);
  if (input.status === "ordered") await assertRunApproved(tx, cur.bomRunId, "구매 요청은 발주할");

  const core = cur.prNo.split("-").slice(1, -1).join("-");
  const poNo = input.status === "ordered" ? await nextNo(tx, "PO", core) : null;
  const row = await tx.purchaseRequest.update({
    where: { id: input.id },
    data: { status: input.status, ...(poNo ? { poNo } : {}) },
  });
  await writeAudit(tx, input.actorId, "update", "purchase_request", row.id, { status: cur.status }, { status: row.status, poNo: row.poNo });
  return row;
}
