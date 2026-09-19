import { isRole, type Role } from "@edim/core-ontology";
import type { TenantClient } from "./tenant";
import { writeAudit } from "./audit";

/**
 * P3-a 2층→3층 — 회사 관리자(owner)가 자기 테넌트의 사용자 역할을 통제한다.
 * EDIM.pdf p54 "2. User Management" · "편집: 각 사용자의 권한을 받은 항목만 표시".
 *
 * 테넌트 경계는 membership 의 RLS 가 지킨다(0002_rls). 여기서는 그 위에
 * **마지막 owner 강등 금지**라는 업무 규칙 하나를 더 건다 — 관리자가 0명인
 * 테넌트가 생기면 아무도 사용자를 되돌릴 수 없기 때문이다.
 */

export interface MemberRow {
  userId: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

export class LastOwnerError extends Error {
  readonly code = "LAST_OWNER";
  constructor() {
    super("마지막 owner 는 강등할 수 없습니다");
    this.name = "LastOwnerError";
  }
}

export async function listMembers(tx: TenantClient): Promise<MemberRow[]> {
  return tx.$queryRaw<MemberRow[]>`
    SELECT m.user_id AS "userId", u.email, u.name, m.role, m.created_at AS "createdAt"
      FROM membership m
      JOIN app_user u ON u.id = m.user_id
     ORDER BY m.created_at ASC`;
}

export async function setMemberRole(
  tx: TenantClient,
  input: { userId: string; role: Role; actorId: string },
): Promise<MemberRow> {
  if (!isRole(input.role)) throw new Error(`unknown role: ${input.role}`);

  const members = await listMembers(tx);
  const target = members.find((m) => m.userId === input.userId);
  if (!target) throw new Error("membership not found in this tenant");
  if (target.role === input.role) return target;

  const owners = members.filter((m) => m.role === "owner");
  if (target.role === "owner" && input.role !== "owner" && owners.length <= 1) {
    throw new LastOwnerError();
  }

  const tenantId = (
    await tx.$queryRaw<{ t: string }[]>`
      SELECT current_setting('app.current_tenant')::uuid AS t`
  )[0]!.t;

  await tx.membership.update({
    where: { tenantId_userId: { tenantId, userId: input.userId } },
    data: { role: input.role },
  });
  await writeAudit(
    tx,
    input.actorId,
    "update",
    "membership",
    input.userId,
    { role: target.role },
    { role: input.role },
  );
  return { ...target, role: input.role };
}
