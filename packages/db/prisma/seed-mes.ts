/**
 * seed-mes.ts — 0038 · 0039 · ccmd L 샘플 기준정보(회사 A 만 · 전부 '샘플' 표지 · 작업자 실명 금지).
 *   작업장 3 · 기계 3 · 작업자 4(작업자 A~D) · 창고 2 · SPF 샘플 제품 품목 자재 정보 · 공정 순서(SPF 3공정 · SCS 1 2공정).
 *   기존 EU 시연 제품에는 넣지 않는다 — **mfg_rate 도 넣지 않는다**(원가 ₩15,487,170 불변).
 * resetMes: 리허설이 쌓은 입출고 · 작업지시 · 검수 · 하자 · 공지 · QR 을 지운다(추가만 표라 앱 역할은 못 지운다 → 스키마 소유자로).
 *   작업지시가 프로젝트 · BOM 스냅샷을 RESTRICT 로 가리키므로 **스냅샷 · 프로젝트보다 먼저** 부른다.
 */
import { adminPrisma } from "../src/client";
import { IDS } from "./seed";

export async function resetMes(tenantId: string = IDS.tenantA): Promise<void> {
  const w = { where: { tenantId } };
  await adminPrisma.qrToken.deleteMany(w);
  await adminPrisma.notice.deleteMany(w);
  await adminPrisma.defectLog.deleteMany(w);
  await adminPrisma.defect.deleteMany(w);
  await adminPrisma.inspection.deleteMany(w);
  await adminPrisma.workStepLog.deleteMany(w);
  await adminPrisma.workOrderStep.deleteMany(w);
  await adminPrisma.workOrder.deleteMany(w);
  await adminPrisma.stockMove.deleteMany(w);
  await adminPrisma.processRoute.deleteMany(w);
  await adminPrisma.itemMaterial.deleteMany(w);
  await adminPrisma.machine.deleteMany(w);
  await adminPrisma.worker.deleteMany(w);
  await adminPrisma.warehouse.deleteMany(w);
  await adminPrisma.workCenter.deleteMany(w);
  await adminPrisma.project.updateMany({ where: { tenantId }, data: { qty: 1, dueDate: null } });   // MRP 입력(0038 두 칸)을 기본값으로
}

export async function seedMes(tenantId: string = IDS.tenantA): Promise<number> {
  if (await adminPrisma.workCenter.count({ where: { tenantId } })) return 0;
  const wc = async (code: string, name: string, h: number) => (await adminPrisma.workCenter.create({ data: { tenantId, code, name, hoursPerDay: h, isSample: true } })).id;
  const ASM = await wc("WC-ASM", "조립장(샘플)", 8), PNT = await wc("WC-PNT", "도장장(샘플)", 8), QC = await wc("WC-QC", "검사장(샘플)", 8);
  await adminPrisma.machine.createMany({ data: [
    { tenantId, workCenterId: ASM, code: "M-ASM1", kind: "조립 지그(샘플)" },
    { tenantId, workCenterId: PNT, code: "M-PNT1", kind: "도장 부스(샘플)" },
    { tenantId, workCenterId: QC, code: "M-QC1", kind: "풍량 시험기(샘플)" },
  ] });
  await adminPrisma.worker.createMany({ data: [
    { tenantId, code: "W-A", displayName: "작업자 A(샘플)", skillGrade: "H2" },
    { tenantId, code: "W-B", displayName: "작업자 B(샘플)", skillGrade: "H1" },
    { tenantId, code: "W-C", displayName: "작업자 C(샘플)", skillGrade: "H3" },
    { tenantId, code: "W-D", displayName: "작업자 D(샘플)", skillGrade: "H2" },
  ] });
  const WH1 = (await adminPrisma.warehouse.create({ data: { tenantId, code: "WH-1", name: "자재 창고(샘플)", location: "본사 / 1창고 / A구역" } })).id;
  const WH2 = (await adminPrisma.warehouse.create({ data: { tenantId, code: "WH-2", name: "완성품 창고(샘플)", location: "본사 / 2창고 / B구역" } })).id;
  await adminPrisma.itemMaterial.createMany({ data: [
    { tenantId, itemCode: "SPF", warehouseId: WH2, minStack: 0, supplier: null, makeBuy: "make", leadDays: 0, unit: "set" },
    { tenantId, itemCode: "SCS 1", warehouseId: WH1, minStack: 0, supplier: null, makeBuy: "make", leadDays: 0, unit: "set" },
    { tenantId, itemCode: "SFN 1", warehouseId: WH1, minStack: 1, supplier: "샘플 팬사", makeBuy: "buy", leadDays: 14, unit: "ea" },
    { tenantId, itemCode: "SMT 1", warehouseId: WH1, minStack: 2, supplier: "샘플 모터사", makeBuy: "buy", leadDays: 7, unit: "ea" },
  ] });
  await adminPrisma.processRoute.createMany({ data: [
    { tenantId, itemCode: "SPF", seq: 1, name: "조립", workCenterId: ASM, persons: 2, skill: "H2", hours: 3, prevSeq: null },
    { tenantId, itemCode: "SPF", seq: 2, name: "도장", workCenterId: PNT, persons: 1, skill: "H1", hours: 2, prevSeq: 1 },
    { tenantId, itemCode: "SPF", seq: 3, name: "검사", workCenterId: QC, persons: 1, skill: "H3", hours: 1, prevSeq: 2 },
    { tenantId, itemCode: "SCS 1", seq: 1, name: "절곡", workCenterId: ASM, persons: 1, skill: "H1", hours: 2, prevSeq: null },
    { tenantId, itemCode: "SCS 1", seq: 2, name: "용접", workCenterId: ASM, persons: 1, skill: "H2", hours: 2, prevSeq: 1 },
  ] });
  return 1;
}
