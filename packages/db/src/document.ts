import type { TenantClient } from "./tenant";
import { writeAudit } from "./audit";

/**
 * P4-b — 문서(견적 p66 · Tech Data p15~16).
 *
 * 도면(drawing.ts)과 같은 규칙 둘:
 *  1. 문서는 **BOM 스냅샷 하나**에서 나온다(`bomRunId` 필수).
 *  2. 상태는 draft → review → approved → issued 한 방향이고, issued 는 잠긴다.
 *     방어는 DB 트리거(0009 `issued_lock_guard`)가 한다 — 여기 검사는 사용자에게
 *     한국어로 이유를 돌려주기 위한 것이다.
 * `body` 는 만든 순간의 내용을 얼린 것이다. 인쇄본은 body 만 읽는다.
 */

export const DOCUMENT_TYPES = ["quotation", "techdata"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const isDocumentType = (v: unknown): v is DocumentType =>
  typeof v === "string" && (DOCUMENT_TYPES as readonly string[]).includes(v);

export const DOCUMENT_STATUSES = ["draft", "review", "approved", "issued"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export const isDocumentStatus = (v: unknown): v is DocumentStatus =>
  typeof v === "string" && (DOCUMENT_STATUSES as readonly string[]).includes(v);

export class DocumentLockedError extends Error {
  readonly code = "DOCUMENT_LOCKED";
  constructor(no: string) {
    super(`발행된 문서 ${no} 은 수정할 수 없습니다`);
    this.name = "DocumentLockedError";
  }
}
export class DocumentStatusBackwardsError extends Error {
  readonly code = "STATUS_BACKWARDS";
  constructor(from: string, to: string) {
    super(`문서 상태는 되돌릴 수 없습니다 (${from} → ${to})`);
    this.name = "DocumentStatusBackwardsError";
  }
}

export interface SaveDocumentInput {
  stableId: string | null;
  bomRunId: string;
  docType: DocumentType;
  /** 번호 머리 — 'QR-61313' · 'TD-61313' (p66 견적번호 QR-61216-01 모양) */
  noPrefix: string;
  code: string;
  /** 번호·개정이 정해진 뒤에 본문을 만든다 — 본문 안에 번호가 들어가기 때문이다. */
  body: (docNo: string, rev: string) => object;
  createdBy: string;
}

/**
 * 번호 규칙: 같은 노드·같은 종류·같은 코드의 문서가 이미 있으면 **그 번호에 개정**이
 * 붙는다(A → B). 치수나 표를 고쳐 다시 뽑은 견적이 앞 견적과 나란히 남아야
 * "무엇이 달라졌나"를 볼 수 있다. 처음이면 머리 뒤에 다음 순번(-01, -02 …).
 */
export async function saveDocument(tx: TenantClient, input: SaveDocumentInput) {
  const tenantId = (
    await tx.$queryRaw<{ t: string }[]>`
      SELECT current_setting('app.current_tenant')::uuid AS t`
  )[0]!.t;

  const same = await tx.document.findMany({
    where: { hierarchyStable: input.stableId, docType: input.docType, code: input.code },
    orderBy: { currentRev: "desc" },
    take: 1,
  });
  let docNo: string;
  let rev: string;
  if (same[0]) {
    docNo = same[0].docNo;
    rev = String.fromCharCode(Math.min(same[0].currentRev.charCodeAt(0) + 1, 90));
  } else {
    const used = await tx.document.findMany({
      where: { docNo: { startsWith: `${input.noPrefix}-` } },
      select: { docNo: true },
      distinct: ["docNo"],
    });
    const max = used.reduce((m, d) => Math.max(m, Number(d.docNo.slice(input.noPrefix.length + 1)) || 0), 0);
    docNo = `${input.noPrefix}-${String(max + 1).padStart(2, "0")}`;
    rev = "A";
  }

  const row = await tx.document.create({
    data: {
      tenantId,
      hierarchyStable: input.stableId,
      bomRunId: input.bomRunId,
      docNo,
      docType: input.docType,
      currentRev: rev,
      code: input.code,
      body: input.body(docNo, rev),
      createdBy: input.createdBy,
    },
  });
  await writeAudit(tx, input.createdBy, "create", "document", row.id, null, {
    docNo: row.docNo, rev: row.currentRev, type: row.docType, bomRunId: row.bomRunId,
  });
  return row;
}

export async function listDocuments(tx: TenantClient, stableId?: string | null) {
  return tx.document.findMany({
    where: stableId ? { hierarchyStable: stableId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, docNo: true, docType: true, currentRev: true, status: true,
      code: true, bomRunId: true, createdAt: true, updatedAt: true,
    },
  });
}

export async function getDocument(tx: TenantClient, id: string) {
  return tx.document.findUnique({ where: { id } });
}

export async function setDocumentStatus(
  tx: TenantClient,
  input: { id: string; status: DocumentStatus; actorId: string },
) {
  const cur = await tx.document.findUnique({ where: { id: input.id } });
  if (!cur) throw new Error("document not found");
  if (cur.status === "issued") throw new DocumentLockedError(cur.docNo);
  const order = DOCUMENT_STATUSES as readonly string[];
  if (order.indexOf(input.status) < order.indexOf(cur.status))
    throw new DocumentStatusBackwardsError(cur.status, input.status);

  const row = await tx.document.update({ where: { id: input.id }, data: { status: input.status } });
  await writeAudit(tx, input.actorId, "update", "document", row.id, { status: cur.status }, { status: row.status });
  return row;
}
