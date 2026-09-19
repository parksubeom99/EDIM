import { platformDb, adminPrisma } from "./client";
import type { TenantClient } from "./tenant";
import { writeAudit } from "./audit";

/**
 * P3-a — 플랫폼 관리자 계층(DB①)과, 회사 → 플랫폼으로 올라가는 요청 통로.
 *
 * 두 쪽을 한 파일에 두되 **접속 주체가 다르다**는 점이 핵심이다:
 *   - platform* 함수 → `platformDb`(edim_platform). platform 스키마와,
 *     public 에서는 tenant·platform_request 만 만질 수 있다.
 *   - 회사 쪽 함수  → `withTenant(...)` 로 받은 TenantClient(edim_app). platform
 *     스키마에는 USAGE 조차 없다.
 * 권한 교차가 없으므로 역류(DB②→DB①)는 앱이 아니라 Postgres 가 막는다.
 *
 * platform 스키마는 Prisma multiSchema 를 쓰지 않는다(테이블 2개 — 설정 변경
 * 위험을 지지 않는다). 그래서 이 파일에서만 raw SQL 로 다룬다.
 */

export interface PlatformAdmin {
  userId: string;
  title: string;
}

export interface PlatformTenantRow {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  requestCount: number;
  pendingCount: number;
}

export interface PlatformRequestRow {
  id: string;
  tenantId: string;
  tenantName: string | null;
  kind: string;
  subject: string;
  payload: unknown;
  state: string;
  requestedAt: Date;
  decidedAt: Date | null;
  decisionNote: string;
}

/** 이 사용자가 플랫폼 관리자인가. 멤버십과 무관하게 platform.admin_user 가 판단한다. */
export async function findPlatformAdmin(
  userId: string,
): Promise<PlatformAdmin | null> {
  const rows = await platformDb.$queryRaw<{ user_id: string; title: string }[]>`
    SELECT user_id, title FROM platform.admin_user WHERE user_id = ${userId}::uuid`;
  const row = rows[0];
  return row ? { userId: row.user_id, title: row.title } : null;
}

/**
 * 플랫폼이 볼 수 있는 테넌트 목록. 이름·slug·가입일과 **요청 건수**까지다.
 * 인원수(membership)는 업무 테이블이라 권한을 주지 않았다 — 설계서 §3 의
 * "그 외 public 테이블 권한 없음"을 그대로 지킨다.
 */
export async function listTenantsForPlatform(): Promise<PlatformTenantRow[]> {
  return platformDb.$queryRaw<PlatformTenantRow[]>`
    SELECT t.id,
           t.slug,
           t.name,
           t.created_at                                              AS "createdAt",
           COUNT(r.id)::int                                          AS "requestCount",
           COUNT(r.id) FILTER (WHERE r.state = 'requested')::int      AS "pendingCount"
      FROM tenant t
      LEFT JOIN platform_request r ON r.tenant_id = t.id
     GROUP BY t.id, t.slug, t.name, t.created_at
     ORDER BY t.created_at ASC`;
}

/** 요청 대기열. state 를 주면 그 상태만. */
export async function listPlatformRequests(
  state?: string,
): Promise<PlatformRequestRow[]> {
  const rows = state
    ? await platformDb.$queryRaw<PlatformRequestRow[]>`
        SELECT r.id, r.tenant_id AS "tenantId", t.name AS "tenantName", r.kind, r.subject,
               r.payload, r.state, r.requested_at AS "requestedAt",
               r.decided_at AS "decidedAt", r.decision_note AS "decisionNote"
          FROM platform_request r LEFT JOIN tenant t ON t.id = r.tenant_id
         WHERE r.state = ${state}
         ORDER BY r.requested_at DESC`
    : await platformDb.$queryRaw<PlatformRequestRow[]>`
        SELECT r.id, r.tenant_id AS "tenantId", t.name AS "tenantName", r.kind, r.subject,
               r.payload, r.state, r.requested_at AS "requestedAt",
               r.decided_at AS "decidedAt", r.decision_note AS "decisionNote"
          FROM platform_request r LEFT JOIN tenant t ON t.id = r.tenant_id
         ORDER BY r.requested_at DESC`;
  return rows;
}

/** 플랫폼의 결정. 결정 컬럼만 UPDATE 권한이 있으므로 다른 컬럼은 손댈 수 없다. */
export async function decidePlatformRequest(input: {
  id: string;
  state: "approved" | "rejected";
  decidedBy: string;
  note?: string;
}): Promise<number> {
  return platformDb.$executeRaw`
    UPDATE platform_request
       SET state = ${input.state},
           decided_by = ${input.decidedBy}::uuid,
           decided_at = now(),
           decision_note = ${input.note ?? ""}
     WHERE id = ${input.id}::uuid AND state = 'requested'`;
}

/** DB① 상태 — P3-a 에서는 비어 있는 것이 정상이다(내용물은 P3-b). */
export async function platformDbStatus(): Promise<{
  learningSources: number;
  admins: number;
}> {
  const rows = await platformDb.$queryRaw<
    { learning_sources: bigint; admins: bigint }[]
  >`
    SELECT (SELECT COUNT(*) FROM platform.learning_source) AS learning_sources,
           (SELECT COUNT(*) FROM platform.admin_user)      AS admins`;
  const r = rows[0];
  return {
    learningSources: Number(r?.learning_sources ?? 0),
    admins: Number(r?.admins ?? 0),
  };
}

/** 로그인 부트스트랩용(테넌트 컨텍스트 이전) — resolve.ts 와 같은 사유로 admin 접속. */
export async function platformAdminByEmail(
  email: string,
): Promise<{ userId: string; email: string; title: string } | null> {
  const user = await adminPrisma.appUser.findUnique({ where: { email } });
  if (!user) return null;
  const admin = await findPlatformAdmin(user.id);
  return admin ? { userId: user.id, email: user.email, title: admin.title } : null;
}

// --- 회사 쪽 (edim_app · RLS) -------------------------------------------------

export interface PlatformRequestInput {
  kind: "special" | "question";
  subject: string;
  payload?: unknown;
  requestedBy: string;
}

/** 회사가 요청서를 올린다. 결정 컬럼은 DB 권한상 건드릴 수 없다. */
export async function createPlatformRequest(
  tx: TenantClient,
  input: PlatformRequestInput,
) {
  const row = await tx.platformRequest.create({
    data: {
      tenantId: (
        await tx.$queryRaw<{ t: string }[]>`
          SELECT current_setting('app.current_tenant')::uuid AS t`
      )[0]!.t,
      kind: input.kind,
      subject: input.subject,
      payload: (input.payload ?? {}) as object,
      requestedBy: input.requestedBy,
    },
  });
  await writeAudit(
    tx,
    input.requestedBy,
    "create",
    "platform_request",
    row.id,
    null,
    { kind: row.kind, subject: row.subject },
  );
  return row;
}

/** 회사가 자기 요청과 그 결정을 본다(RLS 로 자기 테넌트만). */
export async function listPlatformRequestsForTenant(tx: TenantClient) {
  return tx.platformRequest.findMany({ orderBy: { requestedAt: "desc" } });
}
