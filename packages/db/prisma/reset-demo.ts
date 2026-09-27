/**
 * reset-demo.ts — 시연 DB를 '발표 시작 상태'로 되돌린다. `pnpm db:reset:demo`
 *
 * 왜 필요한가: 리허설(demo_e2e.py · revision:test · 손 시연)은 흔적을 남긴다.
 *   - code_revision  : append-only라 앱에서는 지울 수 없다 → 본 시연의 첫 저장이 'Rev A'가 아니라 'Rev E'가 된다
 *   - macro_registry : 승인할 때마다 revision이 오른다(r1 → r6 …)
 *   - project_approval / task / attachment, audit_log
 *   - document / purchase_request : 시연 중 뜬 견적·Tech Data·구매 요청(발행·발주 잠금 포함)
 *   - platform_request : 시연 중 올린 Special 의뢰 · 멤버 역할 변경(User Management)
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
  // 도면이 BOM 스냅샷을 참조하므로 **도면을 먼저** 지운다(FK RESTRICT).
  // 발행된 도면은 트리거가 삭제를 막으므로(운영에서는 그게 맞다) 리셋 동안만 내린다.
  await adminPrisma.$executeRawUnsafe(`ALTER TABLE "drawing" DISABLE TRIGGER USER`);
  const dwg = await adminPrisma.drawing.deleteMany({ where: { tenantId: t } });
  await adminPrisma.$executeRawUnsafe(`ALTER TABLE "drawing" ENABLE TRIGGER USER`);
  // P4-b: 문서·구매 요청도 BOM 스냅샷을 참조한다 → 스냅샷보다 **먼저** 지운다.
  // 발행·발주된 것은 트리거가 삭제를 막으므로 리셋 동안만 내린다(줄은 머리와 함께 cascade).
  const P4B = ["document", "purchase_request", "purchase_request_line"];
  for (const tb of P4B) await adminPrisma.$executeRawUnsafe(`ALTER TABLE "${tb}" DISABLE TRIGGER USER`);
  const doc = await adminPrisma.document.deleteMany({ where: { tenantId: t } });
  const prq = await adminPrisma.purchaseRequest.deleteMany({ where: { tenantId: t } });
  for (const tb of P4B) await adminPrisma.$executeRawUnsafe(`ALTER TABLE "${tb}" ENABLE TRIGGER USER`);
  // P6: 승인 기록이 BOM 스냅샷을 참조한다 → 스냅샷보다 먼저 지운다(시연은 Design 단계에서 시작).
  const apr = await adminPrisma.projectApproval.deleteMany({ where: { tenantId: t } });
  const run = await adminPrisma.bomCodeRun.deleteMany({ where: { tenantId: t } });
  const req = await adminPrisma.platformRequest.deleteMany({ where: { tenantId: t } });
  const aud = await adminPrisma.auditLog.deleteMany({ where: { tenantId: t } });
  // 0015: 리허설이 바꾼 인쇄 양식(p48)을 지운다 → 기본 양식으로 돌아간다.
  await adminPrisma.printSetup.deleteMany({ where: { tenantId: t } });
  // 0016: 리허설이 만든 사용자 UI Form(p25·p26)을 지운다.
  await adminPrisma.uiForm.deleteMany({ where: { tenantId: t } });
  // 0017: 리허설이 쌓은 단가 이력(p32·p67)을 지운다.
  await adminPrisma.priceHistory.deleteMany({ where: { tenantId: t } });
  // 리허설(e2e S45)이 만든 E2E- 자재 코드를 지운다 — 카탈로그 시드는 reset 이 다시 넣지 않으므로 접두어로만 골라 지운다.
  await adminPrisma.productCode.deleteMany({ where: { tenantId: t, code: { startsWith: "E2E-" } } });
  // 0018: 리허설이 등록한 Arrangement Code(p35)를 지운다.
  await adminPrisma.arrangementCode.deleteMany({ where: { tenantId: t } });
  // 0019: 리허설이 더한 사양 항목(p46)을 지운다 — 시드 항목은 아래 seedDemo(forceCatalog) 가 다시 넣는다.
  await adminPrisma.specItem.deleteMany({ where: { tenantId: t } });
  // 0021: 리허설이 더한 고객·공급처(p64)를 지운다(프로젝트·단가 이력의 연결은 ON DELETE SET NULL) — 시드 둘은 seedDemo 가 다시 넣는다.
  await adminPrisma.partner.deleteMany({ where: { tenantId: t } });
  // 0022: 리허설이 더한 Input Data 항목(p16)을 지운다 — 시드 두 항목은 seedDemo 가 다시 넣는다.
  await adminPrisma.inputItem.deleteMany({ where: { tenantId: t } });
  // 0023: 리허설이 만든 Client 담당자 · 영업 활동 이력(p12). 프로젝트는 seedAll 이 다시 만들지만 이력은 앱 역할이 못 지우므로 여기서.
  await adminPrisma.projectActivity.deleteMany({ where: { tenantId: t } });
  await adminPrisma.projectContact.deleteMany({ where: { tenantId: t } });
  // 0025: 리허설이 올린 첨부(코드 DWG · Arrangement DWG · Data Up-Load) 행. 코드 상태는 카탈로그 재시드(forceCatalog)로 미지정으로 돌아간다.
  await adminPrisma.attachment.deleteMany({ where: { tenantId: t } });
  // 0026: 리허설이 등록한 제조 정보 표(p66 · p67) — 시드에는 없다(표가 비면 인건비 = 재료비 × 18%).
  await adminPrisma.mfgRate.deleteMany({ where: { tenantId: t } });
  // 0027: 리허설이 더한 ERP 기준정보(p64) — 예시 두 행은 seedDemo 가 다시 넣는다.
  await adminPrisma.erpMaster.deleteMany({ where: { tenantId: t } });
  // 0028: 리허설이 만든 도면 템플릿(Sub Drawing 호출 · 주의사항, p39 · p40).
  await adminPrisma.drawingTemplateItem.deleteMany({ where: { tenantId: t } });
  // 0029: 리허설이 만든 Output Data 템플릿 · 그래프 · Table List 칸(p16 · p47).
  await adminPrisma.outputItem.deleteMany({ where: { tenantId: t } });
  await adminPrisma.graphDef.deleteMany({ where: { tenantId: t } });
  await adminPrisma.tableMeta.deleteMany({ where: { tenantId: t } });
  // 0030: 리허설이 저장한 인쇄 양식 버전(p48) — 문서(위에서 먼저 지움)가 가리키므로 문서 뒤에 지운다.
  await adminPrisma.printLayout.deleteMany({ where: { tenantId: t } });
  // 리허설이 역할을 바꿔 놓았을 수 있다(User Management 시연) → 시드 역할로 되돌린다.
  await adminPrisma.membership.updateMany({ where: { tenantId: t, userId: IDS.viewerA }, data: { role: "viewer" } });
  await adminPrisma.membership.updateMany({ where: { tenantId: t, userId: IDS.ownerA }, data: { role: "owner" } });
  console.log(`Demo reset: removed ${rev.count} code revisions, ${mac.count} macros, ${run.count} BOM run snapshots, ${dwg.count} drawings, ${doc.count} documents, ${prq.count} purchase requests, ${apr.count} approvals, ${req.count} platform requests, ${aud.count} audit rows; memberships restored.`);
  await seedAll();
  await seedDemo({ forceCatalog: true }); // 시연 중 고친 표·관계를 원상 복구
  console.log("Demo reset complete — first save will be Rev A, approved macro is back to the seeded revision.");
}

resetDemo()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
