# Decision: Global System Settings

Date: 2026-05-09

## Status

Accepted

## Decision

`EDIM Developer` 아래에 `Global System Settings`를 둔다.

이 화면은 EDIM 전체와 모든 엔진에 적용되는 전역 설정을 관리한다.

## Rationale

EDIM은 곧 BOM, Rule, Macro, Drawing, Approval 등 여러 엔진을 만들게 된다.

각 엔진이 서로 다른 기준으로 동작하면 데이터 안정성, 승인, 권한, Run 결과 재현성이 깨질 수 있다.

따라서 엔진 개발 전에 전역 설정을 먼저 정의한다.

## Scope

전역 설정 대상:

- Tenant Data Boundary
- PermissionPoint Policy
- Published Data Rule
- Hierarchy Address Guardrail
- System Template Protection
- EDIM Run Execution Policy
- AI Macro Safety Policy
- CAD Adapter Sandbox
- Global Approval Trigger
- Release / Rollback Policy
- Unit / Locale
- External Adapter Policy

## Consequences

- 공식 Run은 Published 기준을 따른다.
- System Template과 Published 자료는 직접 수정하지 않는다.
- 고위험 변경은 영향 분석과 승인 절차를 거친다.
- 전역 설정 변경은 Release Version과 Rollback 구조를 가진다.
- Tenant Override는 허용 범위 안에서만 가능하다.

## Related Documents

- `EDIM_DEVELOPER_CONSOLE_HEAD_MODEL.md`
- `EDIM_HEAD_REGISTRY_IN_DEVELOPER_MODEL.md`
- `EDIM_HIERARCHY_GUARDRAILS_REVIEW.md`
- `EDIM_CODE_GOVERNANCE_APPROVAL_MODEL.md`
- `EDIM_TEMPLATE_OWNERSHIP_CUSTOMIZATION_MODEL.md`
