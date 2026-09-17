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

export const DEMO_DSL =
  "=IF(CAP,CAP>25, SUM(Table1(A,4:4))*Var(NS,15)*Var(NS,20), SUM(Table1(A,1:1))*Var(NS,20))";

export async function seedDemo(): Promise<void> {
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
