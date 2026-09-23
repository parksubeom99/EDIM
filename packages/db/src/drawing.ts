import type { TenantClient } from "./tenant";
import { writeAudit } from "./audit";
import { assertRunApproved } from "./approval-gate";

/**
 * P4-a — 도면(p24 "2. Drawings").
 *
 * 규칙 둘:
 *  1. 도면은 **BOM 스냅샷 하나**에서 나온다(`bomRunId` 필수). 근거를 못 대는
 *     도면은 만들지 않는다.
 *  2. 상태는 draft → review → approved → issued 한 방향이고, issued 는 잠긴다.
 *     이 두 가지는 DB 트리거가 건다(0008_drawing) — 여기 검사는 **사용자에게
 *     한국어로 이유를 돌려주기 위한 것**이고, 방어 자체는 DB 가 한다.
 */

export const DRAWING_STATUSES = ["draft", "review", "approved", "issued"] as const;
export type DrawingStatus = (typeof DRAWING_STATUSES)[number];
export const DRAWING_STATUS_LABEL: Record<DrawingStatus, string> = {
  draft: "작성중",
  review: "검토",
  approved: "승인",
  issued: "발행",
};
export const isDrawingStatus = (v: unknown): v is DrawingStatus =>
  typeof v === "string" && (DRAWING_STATUSES as readonly string[]).includes(v);

export class DrawingLockedError extends Error {
  readonly code = "DRAWING_LOCKED";
  constructor(no: string) {
    super(`발행된 도면 ${no} 은 수정할 수 없습니다`);
    this.name = "DrawingLockedError";
  }
}
export class DrawingStatusBackwardsError extends Error {
  readonly code = "STATUS_BACKWARDS";
  constructor(from: string, to: string) {
    super(`도면 상태는 되돌릴 수 없습니다 (${from} → ${to})`);
    this.name = "DrawingStatusBackwardsError";
  }
}

export interface SaveDrawingInput {
  stableId: string | null;
  bomRunId: string;
  drawingNo: string;
  drawingType: "plan" | "assembly" | "front" | "right" | "iso" | "exploded";
  code: string;
  dxf: string;
  meta: object;
  scale?: string;
  size?: string;
  createdBy: string;
}

/**
 * 같은 도면번호를 다시 뽑으면 **개정**이 붙는다(A → B → C…). 앞 개정은 그대로
 * 남는다 — 치수를 바꿔 다시 뽑은 뒤에도 전/후를 비교할 수 있어야 하기 때문이다.
 */
export async function saveDrawing(tx: TenantClient, input: SaveDrawingInput) {
  const tenantId = (
    await tx.$queryRaw<{ t: string }[]>`
      SELECT current_setting('app.current_tenant')::uuid AS t`
  )[0]!.t;

  const prior = await tx.drawing.findMany({
    where: { drawingNo: input.drawingNo },
    orderBy: { currentRev: "desc" },
    take: 1,
  });
  const rev = prior[0]
    ? String.fromCharCode(Math.min(prior[0].currentRev.charCodeAt(0) + 1, 90))
    : "A";

  const row = await tx.drawing.create({
    data: {
      tenantId,
      hierarchyStable: input.stableId,
      bomRunId: input.bomRunId,
      drawingNo: input.drawingNo,
      drawingType: input.drawingType,
      code: input.code,
      dxf: input.dxf,
      meta: input.meta,
      currentRev: rev,
      ...(input.scale ? { scale: input.scale } : {}),
      ...(input.size ? { size: input.size } : {}),
      createdBy: input.createdBy,
    },
  });
  await writeAudit(tx, input.createdBy, "create", "drawing", row.id, null, {
    drawingNo: row.drawingNo,
    rev: row.currentRev,
    type: row.drawingType,
    bomRunId: row.bomRunId,
  });
  return row;
}

export async function listDrawings(tx: TenantClient, stableId?: string | null) {
  return tx.drawing.findMany({
    where: stableId ? { hierarchyStable: stableId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, drawingNo: true, drawingType: true, scale: true, size: true,
      currentRev: true, status: true, code: true, meta: true, bomRunId: true,
      createdAt: true, updatedAt: true,
    },
  });
}

export async function getDrawing(tx: TenantClient, id: string) {
  return tx.drawing.findUnique({ where: { id } });
}

export async function setDrawingStatus(
  tx: TenantClient,
  input: { id: string; status: DrawingStatus; actorId: string },
) {
  const cur = await tx.drawing.findUnique({ where: { id: input.id } });
  if (!cur) throw new Error("drawing not found");
  if (cur.status === "issued") throw new DrawingLockedError(cur.drawingNo);
  const order = DRAWING_STATUSES as readonly string[];
  if (order.indexOf(input.status) < order.indexOf(cur.status))
    throw new DrawingStatusBackwardsError(cur.status, input.status);
  if (input.status === "issued") await assertRunApproved(tx, cur.bomRunId, "도면은 발행할");

  const row = await tx.drawing.update({
    where: { id: input.id },
    data: { status: input.status },
  });
  await writeAudit(tx, input.actorId, "update", "drawing", row.id, { status: cur.status }, { status: row.status });
  return row;
}

/** 스냅샷 하나를 그대로 읽어 온다 — 산출물은 전부 여기서 나온다. */
export async function getBomRun(tx: TenantClient, id: string) {
  return tx.bomCodeRun.findUnique({ where: { id } });
}

/** 그 노드의 최신 코드 개정 id — BOM 실행 시 스냅샷에 박는다. */
export async function latestRevisionId(
  tx: TenantClient,
  stableId: string,
): Promise<string | null> {
  const r = await tx.codeRevision.findFirst({
    where: { hierarchyStable: stableId },
    orderBy: { revNo: "desc" },
    select: { id: true },
  });
  return r?.id ?? null;
}

/**
 * 이 슬롯 조합으로 **저장된** 코드 개정 id. 없으면 null.
 *
 * P4-b 에서 고침: 예전에는 `latestRevisionId` 로 "그 노드의 최신 개정"을 무조건 박았다.
 * 그러면 Rev B(…AL)를 저장해 둔 노드에서 …SS 로 BOM 을 돌려도 스냅샷에 Rev B 가 찍힌다 —
 * 견적서 발치에 **틀린 근거**가 인쇄된다(2026-09-20 인쇄본 육안 검증에서 발견).
 * 근거를 못 대면 비워 둔다: 저장하지 않은 조합으로 돌린 실행은 null 이다.
 */
export async function revisionIdForSlots(
  tx: TenantClient,
  stableId: string,
  slots: Record<string, string>,
): Promise<string | null> {
  const canon = (o: unknown): string => {
    const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
    return JSON.stringify(Object.keys(r).filter((k) => typeof r[k] === "string" && r[k] !== "").sort().map((k) => [k, r[k]]));
  };
  const want = canon(slots);
  const revs = await tx.codeRevision.findMany({
    where: { hierarchyStable: stableId },
    orderBy: { revNo: "desc" },
    select: { id: true, slots: true },
  });
  return revs.find((r) => canon(r.slots) === want)?.id ?? null;
}

