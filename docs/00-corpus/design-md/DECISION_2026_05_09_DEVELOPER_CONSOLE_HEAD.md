# Decision: EDIM Developer Console Head

Date: 2026-05-09

## Status

Accepted

## Decision

EDIM Head에 개발자 전용 `EDIM Developer` Head를 추가한다.

이 Head는 일반 사용자나 Tenant 관리자용이 아니라 EDIM 플랫폼 개발자와 시스템 최고 관리자만 접근하는 전역 시스템 관리 통로이다.

## Rationale

EDIM은 SaaS 기반이므로 회사별 관리 권한과 EDIM 제품 자체의 개발/운영 권한을 분리해야 한다.

`System Setup`은 각 회사의 관리자 설정용으로 사용한다.

`EDIM Developer`는 EDIM의 핵심 구조와 엔진을 관장한다.

## Scope

초기 관리 대상:

- Core Engine Registry
- Module / Head Registry
- Permission Point Catalog
- Template Schema Manager
- Rule / Macro Engine
- CAD / Drawing Adapter
- SaaS Tenant Operations
- Release / Audit Control

## Consequences

이 결정에 따라 다음 원칙을 따른다.

- 일반 Tenant 사용자에게 `EDIM Developer` Head는 보이지 않는다.
- 접근은 `developer_console.view` 등 개발자 권한으로 제한한다.
- System Template, Rule Engine, CAD Adapter, PermissionPoint 변경은 영향 분석과 이력을 남긴다.
- 전체 Tenant에 영향을 주는 변경은 Release / Approval / Rollback 구조를 거친다.

## Related Documents

- `EDIM_SYSTEM_ADMIN_ORG_PERMISSION_MODEL.md`
- `EDIM_GLOBAL_SYSTEM_HEADS_MODEL.md`
- `EDIM_TEMPLATE_OWNERSHIP_CUSTOMIZATION_MODEL.md`
- `EDIM_HIERARCHY_GUARDRAILS_REVIEW.md`
