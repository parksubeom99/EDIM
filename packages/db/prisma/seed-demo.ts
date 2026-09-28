/**
 * seed-demo.ts — 발표(시연) 준비 시드. `pnpm db:seed` 위에 얹는다.
 *
 * 무엇을 하나: 데모 프로젝트 노드(PS-61313-5, IDS.a_proj)에 승인된 매크로
 * 1건을 미리 넣는다. 그래야 fresh DB에서 첫 'EDIM Run'이 'no-macro' 안내가
 * 아니라 계산값(455.4)으로 시작한다. 라이브로 DSL을 쓰고 승인하는 시연은
 * 그대로 가능하다(승인 시 이 매크로가 superseded로 밀리고 revision이 오른다).
 *
 * 왜 여기서 하나: 시연 중 타이핑 실수·네트워크 지연 한 번이 발표를 흔든다.
 * 준비된 상태에서 시작하고, 원하면 '틀린 규칙은 차단된다' 장면만 라이브로.
 *
 * DSL 근거: EDIM.pdf p27·p60 (Table·Var·IF 매크로 문법), 문법 확정치는
 * packages/macro-dsl. 값 자체는 샘플 표 기준(provider.ts SAMPLE_TABLES).
 *
 * 멱등: 같은 DSL의 approved 행이 이미 있으면 아무것도 하지 않는다.
 */
import { withTenant } from "../src/tenant";
import { createDraft, approve, getApproved } from "../src/macro";
import { IDS } from "./seed";
import { seedCatalog } from "./seed-catalog";
import { seedLearning } from "./seed-learning";

export const DEMO_DSL =
  "=IF(CAP,CAP>25, SUM(Table1(A,4:4))*Var(NS,15)*Var(NS,20), SUM(Table1(A,1:1))*Var(NS,20))";

/**
 * E6 · p39 "설계 검증 [Macro]" 샘플 — 규칙 표(ahu-demo.json rule R4)의 op=macro 가 이 이름을 부른다.
 * 스냅샷 기호: LMAXPCT = 가장 긴 구획 ÷ 전장 × 100 · SECTIONS = 구획 수. 1 = 통과 · 0 = 위반.
 */
export const VERIFY_MACRO_DSL = "=AND(LMAXPCT<=50, SECTIONS>=2)";

/** 0021 · Company DB 데모 — 고객 1 · 공급처 1. 데모 프로젝트의 client_name("Micron")은 연결하지 않고 둔다(옛 데이터 보존을 보이려고). */
export const DEMO_PARTNERS = [
  { kind: "customer", code: "C-MICRON", name: "Micron", contact: "FAB 설비팀", nation: "KR" },
  { kind: "supplier", code: "S-KSB", name: "KSB Motor", contact: "영업 1팀", nation: "KR" },
] as const;

/** 0027 · p64 ERP 기준정보 예시 두 행 — 나머지는 회사가 채운다. Company DB 두 곳의 Nation "KR" 이 이 국가를 가리킨다. */
export const DEMO_ERP_MASTER = [
  { kind: "nation", code: "KR", name: "대한민국", attrs: { currency: "KRW" } },
  { kind: "department", code: "D100", name: "설계팀", attrs: {} },
] as const;

/** 0022 · p16 Input Data 템플릿 데모 — 청사진의 두 항목. */
export const DEMO_INPUT_ITEMS = [
  { key: "temperature", label: "Temperature", unit: "°C", defaultValue: 20, minValue: -40, maxValue: 60 },
  { key: "humidity", label: "Humidity", unit: "%", defaultValue: 50, minValue: 0, maxValue: 100 },
];

export async function seedDemo(opts: { forceCatalog?: boolean } = {}): Promise<void> {
  // P1: BOM Code Set-Up 데모 카탈로그 — BOM Run은 등록된 코드·관계에서만 나온다.
  await seedCatalog({ force: opts.forceCatalog });
  await withTenant(IDS.tenantA, async (tx) => {
    if ((await tx.partner.count()) > 0) return;
    for (const p of DEMO_PARTNERS) await tx.partner.create({ data: { tenantId: IDS.tenantA, ...p, createdBy: IDS.ownerA } });
    console.log(`Demo seed: ${DEMO_PARTNERS.length} partners (p64 Company DB).`);
  });
  await withTenant(IDS.tenantA, async (tx) => {
    if ((await tx.erpMaster.count()) > 0) return;
    for (const m of DEMO_ERP_MASTER) await tx.erpMaster.create({ data: { tenantId: IDS.tenantA, kind: m.kind, code: m.code, name: m.name, attrs: { ...m.attrs }, createdBy: IDS.ownerA } });
    console.log(`Demo seed: ${DEMO_ERP_MASTER.length} ERP master rows (p64).`);
  });
  // 0022 · p16 Input Data 템플릿 — 청사진 그대로 Temperature °C · Humidity %
  await withTenant(IDS.tenantA, async (tx) => {
    if ((await tx.inputItem.count()) > 0) return;
    for (const [i, it] of DEMO_INPUT_ITEMS.entries()) await tx.inputItem.create({ data: { tenantId: IDS.tenantA, docType: "techdata", seq: i + 1, ...it, createdBy: IDS.ownerA } });
    console.log(`Demo seed: ${DEMO_INPUT_ITEMS.length} input data items (p16).`);
  });
  await withTenant(IDS.tenantA, async (tx) => {
    const current = await getApproved(tx, IDS.a_proj);
    if (current && current.dsl === DEMO_DSL) {
      console.log(`Demo seed: approved macro already present (r${current.revision}) — no-op.`);
      return;
    }
    const id = await createDraft(tx, { stableId: IDS.a_proj, dsl: DEMO_DSL, createdBy: IDS.ownerA });
    // 정적 검증은 apps/web 게이트(draft 시 static + runtime dry-run)와 동일 DSL이므로 verified=true.
    await approve(tx, { id, approvedBy: IDS.ownerA, verified: true });
    const after = await getApproved(tx, IDS.a_proj);
    console.log(`Demo seed: approved macro r${after?.revision} on ${IDS.a_proj} (PS-61313-5).`);
  });
  await withTenant(IDS.tenantA, async (tx) => {
    const current = await getApproved(tx, IDS.a_vmacro);
    if (current && current.dsl === VERIFY_MACRO_DSL) return;
    const id = await createDraft(tx, { stableId: IDS.a_vmacro, dsl: VERIFY_MACRO_DSL, createdBy: IDS.ownerA });
    await approve(tx, { id, approvedBy: IDS.ownerA, verified: true });
    console.log(`Demo seed: approved verification macro V_SECTION_RATIO (p39 · sample).`);
  });
  // 0033 · B 학습 AI — DB① 샘플 도면 68 + 기술문서 CSV 1 (샘플 표지)
  const ln = await seedLearning();
  if (ln > 0) console.log(`Demo seed: ${ln} sample learning sources (DB① · 샘플).`);
}

const isMain = process.argv[1]?.endsWith("seed-demo.ts") ?? false;
if (isMain) {
  seedDemo()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
