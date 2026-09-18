/**
 * reset-demo.ts — 시연 DB를 '발표 시작 상태'로 되돌린다. `pnpm db:reset:demo`
 *
 * 왜 필요한가: 리허설(demo_e2e.py · revision:test · 손 시연)은 흔적을 남긴다.
 *   - code_revision  : append-only라 앱에서는 지울 수 없다 → 본 시연의 첫 저장이 'Rev A'가 아니라 'Rev E'가 된다
 *   - macro_registry : 승인할 때마다 revision이 오른다(r2 → r7 …)
 *   - project_approval / task / attachment, audit_log
 * 앱 역할(edim_app)에는 code_revision DELETE 권한이 없다(의도된 설계). 그래서 이 스크립트만
 * 스키마 소유자(adminPrisma)로 지운다. 대상은 데모 테넌트(tenantA) 한정.
 *
 * 순서: 흔적 삭제 → seedAll()(프로젝트 재생성, 승인·태스크·첨부는 cascade) → seedDemo()(승인 매크로 r2).
 * 운영 DB 보호: NODE_ENV=production이면 거부.
 */
import { adminPrisma } from "../src/client";
import { IDS, seedAll } from "./seed";
import { seedDemo } from "./seed-demo";

async function resetDemo(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("db:reset:demo refuses to run with NODE_ENV=production");
  }
  const t = IDS.tenantA;
  const rev = await adminPrisma.codeRevision.deleteMany({ where: { tenantId: t } });
  const mac = await adminPrisma.macroRegistry.deleteMany({ where: { tenantId: t } });
  const aud = await adminPrisma.auditLog.deleteMany({ where: { tenantId: t } });
  console.log(`Demo reset: removed ${rev.count} code revisions, ${mac.count} macros, ${aud.count} audit rows.`);
  await seedAll();
  await seedDemo();
  console.log("Demo reset complete — first save will be Rev A, approved macro is back to the seeded revision.");
}

resetDemo()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
