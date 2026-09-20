/**
 * platform-test.ts — P3-a DB 검증 (pnpm --filter @edim/db platform:test).
 *
 * 설계서 §4.1 DoD 그대로: 역류 차단이 **앱 코드가 아니라 DB 권한**으로
 * 이루어졌는지 실측한다. 통과 = "앱에 버그가 있어도 DB가 거부한다".
 */
import { withTenant } from "../src/tenant";
import { appPrisma, platformDb } from "../src/client";
import {
  createPlatformRequest,
  listPlatformRequestsForTenant,
  listPlatformRequests,
  decidePlatformRequest,
  listTenantsForPlatform,
  findPlatformAdmin,
  platformDbStatus,
} from "../src/platform";
import { listMembers, setMemberRole, LastOwnerError } from "../src/membership";
import { IDS } from "./seed";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}
async function denied(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch (e) {
    return /permission denied|권한/i.test(e instanceof Error ? e.message : String(e));
  }
}
async function throws(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

async function main(): Promise<void> {
  // --- 1) 역류 차단: 회사 역할 → DB① ----------------------------------------
  check(
    "역류: edim_app 은 platform.learning_source 를 읽을 수 없다",
    await denied(() =>
      appPrisma.$queryRawUnsafe("SELECT count(*) FROM platform.learning_source"),
    ),
  );
  check(
    "역류: edim_app 은 platform.admin_user 를 읽을 수 없다",
    await denied(() =>
      appPrisma.$queryRawUnsafe("SELECT count(*) FROM platform.admin_user"),
    ),
  );

  // --- 2) 반대 방향: 플랫폼 역할 → 회사 업무 테이블 --------------------------
  for (const t of ["product_code", "bom_code_run", "project", "membership", "hierarchy_node", "drawing"]) {
    check(
      `열람 차단: edim_platform 은 ${t} 을(를) 읽을 수 없다`,
      await denied(() => platformDb.$queryRawUnsafe(`SELECT count(*) FROM ${t}`)),
    );
  }

  // --- 3) 플랫폼이 볼 수 있는 것 ---------------------------------------------
  const tenants = await listTenantsForPlatform();
  check("플랫폼은 테넌트 목록을 본다", tenants.length >= 2, String(tenants.length));
  const admin = await findPlatformAdmin(IDS.platformAdmin);
  check("플랫폼 관리자 등록이 조회된다", admin !== null);
  const status = await platformDbStatus();
  check("DB① 은 비어 있다(P3-a 범위)", status.learningSources === 0, String(status.learningSources));

  // --- 4) 요청 통로 ----------------------------------------------------------
  const reqA = await withTenant(IDS.tenantA, (tx) =>
    createPlatformRequest(tx, {
      kind: "special",
      subject: "platform-test 의뢰",
      payload: { detail: "코일 열교환 계산" },
      requestedBy: IDS.ownerA,
    }),
  );
  check("회사는 요청서를 올릴 수 있다", !!reqA.id && reqA.state === "requested");

  const seenByB = await withTenant(IDS.tenantB, (tx) =>
    listPlatformRequestsForTenant(tx),
  );
  check(
    "RLS: 테넌트 B 는 테넌트 A 의 요청을 못 본다",
    !seenByB.some((r) => r.id === reqA.id),
  );

  check(
    "회사는 요청의 결정 상태를 직접 못 바꾼다",
    await throws(() =>
      withTenant(IDS.tenantA, (tx) =>
        tx.platformRequest.update({
          where: { id: reqA.id },
          data: { state: "approved" },
        }),
      ),
    ),
  );

  const queue = await listPlatformRequests("requested");
  check("플랫폼은 대기열에서 그 요청을 본다", queue.some((r) => r.id === reqA.id));

  const n = await decidePlatformRequest({
    id: reqA.id,
    state: "approved",
    decidedBy: IDS.platformAdmin,
    note: "platform-test 승인",
  });
  check("플랫폼은 결정을 쓸 수 있다", n === 1, String(n));

  const backToCompany = await withTenant(IDS.tenantA, (tx) =>
    listPlatformRequestsForTenant(tx),
  );
  check(
    "결정이 회사 화면으로 돌아온다",
    backToCompany.find((r) => r.id === reqA.id)?.state === "approved",
  );
  check(
    "두 번 결정되지 않는다",
    (await decidePlatformRequest({
      id: reqA.id,
      state: "rejected",
      decidedBy: IDS.platformAdmin,
    })) === 0,
  );

  // --- 5) 2층 → 3층 (User Management) ---------------------------------------
  const members = await withTenant(IDS.tenantA, (tx) => listMembers(tx));
  check("회사 구성원 목록이 조회된다", members.length >= 2, String(members.length));

  await withTenant(IDS.tenantA, (tx) =>
    setMemberRole(tx, { userId: IDS.viewerA, role: "engineer", actorId: IDS.ownerA }),
  );
  const after = await withTenant(IDS.tenantA, (tx) => listMembers(tx));
  check(
    "owner 가 viewer 를 engineer 로 올린다",
    after.find((m) => m.userId === IDS.viewerA)?.role === "engineer",
  );

  let lastOwnerBlocked = false;
  try {
    await withTenant(IDS.tenantA, (tx) =>
      setMemberRole(tx, { userId: IDS.ownerA, role: "viewer", actorId: IDS.ownerA }),
    );
  } catch (e) {
    lastOwnerBlocked = e instanceof LastOwnerError;
  }
  check("마지막 owner 강등은 거부된다", lastOwnerBlocked);

  const auditN = await withTenant(IDS.tenantA, (tx) =>
    tx.auditLog.count({ where: { entity: "membership", entityId: IDS.viewerA } }),
  );
  check("역할 변경이 감사에 남는다", auditN >= 1, String(auditN));

  // 원복 (시드 상태 유지)
  await withTenant(IDS.tenantA, (tx) =>
    setMemberRole(tx, { userId: IDS.viewerA, role: "viewer", actorId: IDS.ownerA }),
  );

  console.log(fail === 0 ? `\nALL PASS (${pass})` : `\n${fail} FAILED / ${pass} passed`);
  await appPrisma.$disconnect();
  await platformDb.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
