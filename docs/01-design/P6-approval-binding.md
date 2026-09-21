# P6 — 승인을 BOM 스냅샷에 묶는다

> **구현됨(브랜치 `feat/p6-approval-binding` · main 머지 승인 대기) · 점검 초안** · 2026-09-21
> 착수 근거: 회장님 지시 2026-09-21 "엘이 이어서 할 수 있는 것부터 전부 다 하자"(GitHub 가 막힌 환경 — 회장님 몫 보류). 별도 설계 승인 없이 착수했으므로 **아래 결정 4건은 회장님 사후 확인 대상**이다.
> 근거 문서: `docs/plan/connection-ledger.md`(승인 ↔ Rev·BOM '없음') · EDIM.pdf p55(Approval Management) · p56(Design > Check > Approve > Accepted) · p65(ERP … Approval).

## 문제
승인 요청은 메모에 `code=문자열`을 적을 뿐이었다. 시스템은 **무엇을** 승인했는지 몰랐고, 승인 여부는 어떤 동작도 막지 않았다.

## 결정 (엘이 정함 — 확인 부탁드립니다)
1. **승인의 대상은 BOM 스냅샷이다.** `project_approval.bom_run_id`. 스냅샷이 코드 개정·매크로 개정·카탈로그 지문을 품고 있어 셋이 한 번에 묶인다. `runId` 없는 요청은 400.
2. **밖으로 나가는 것은 승인된 BOM 에서만.** 도면·문서의 *발행*, 구매 요청의 *발주*. 조직 승인(tier:org · approved)이 그 스냅샷에 있어야 한다. DB 트리거가 강제한다(앱을 우회해도 거부). 작성중·검토·견적 요청까지는 승인 없이 된다.
3. **승인 기록은 고칠 수 없다.** 묶인 스냅샷 변경 불가 · 결정된 승인 재결정 불가(DB 트리거). 다시 하려면 새 요청.
4. **플랫폼 단계는 조직 승인을 받은 바로 그 스냅샷**이어야 한다(다르면 409).

## 달라지는 사용 흐름
BOM Run → (Inspector) Check 요청 · BOM xxxxxxxx → 승인 → 그 BOM 의 도면·견적 발행, 구매 발주 가능. BOM 을 다시 돌리면 **새 스냅샷이고, 새 승인이 필요하다** — 승인 후 치수·표를 고친 결과물이 옛 승인으로 나가는 일을 막는다.

## 바꾼 것
마이그레이션 `0010_approval_binding`(열 1 · 함수 3 · 트리거 4, 추가만) · `packages/db/src/approval-gate.ts` · `trace.ts` · `project.ts`(requestApproval 에 runId) · `/api/trace` · Inspector(스냅샷을 들고 요청, 승인된 BOM 코드·불일치 경고) · Purchasing(추적 패널) · 옛 프로젝트 상세의 맨 승인 버튼 → 안내문 · reset-demo(승인 기록 삭제 순서).

## 검증 (엘 샌드박스)
typecheck 11 · 단위 189 · `document:test` 37 · `drawing:test` 16 · `project:test` · `platform:test` 25 · backbone 13 · rls · revision · auth · e2e (S27~S29 추가). 수치는 커밋 메시지·연결 장부 참조.

## 남는 것
- 반려(rejected) 후 재요청 흐름은 도메인에 있으나 e2e 장면은 없다.
- P6 이전에 만든 승인 기록(`bom_run_id` 없음)은 승인으로 세지 않는다 — 데모 DB 에는 없다.
- 승인 권한은 기존 그대로(owner·engineer). 플랫폼 단계 승인자를 플랫폼 계정으로 옮길지는 미정.
