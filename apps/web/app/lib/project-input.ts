import { PROJECT_TYPES, type ProjectType } from "@edim/core-ontology";
import { listMembers, type TenantClient } from "@edim/db";

/** p12 헤더 입력 검증 — 생성(POST)과 수정(PATCH)이 같은 규칙을 쓴다. */
export const txt = (v: unknown, max: number): string | null | undefined =>
  v === undefined ? undefined : typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export function projectType(v: unknown): ProjectType | undefined | false {
  if (v === undefined) return undefined;
  return typeof v === "string" && (PROJECT_TYPES as readonly string[]).includes(v) ? (v as ProjectType) : false;
}

/** 담당자는 이 회사 구성원이어야 한다(다른 테넌트 사람·없는 id 는 거부). null = 비움. */
export async function ownerOk(tx: TenantClient, ownerId: unknown): Promise<string | null | undefined | false> {
  if (ownerId === undefined) return undefined;
  if (ownerId === null || ownerId === "") return null;
  if (typeof ownerId !== "string") return false;
  const members = await listMembers(tx);
  return members.some((m) => m.userId === ownerId) ? ownerId : false;
}

export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
