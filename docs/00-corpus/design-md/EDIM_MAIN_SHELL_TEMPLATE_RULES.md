# EDIM Main Shell Template Rules

Date: 2026-05-10

## Purpose

Main Shell의 중요한 동작은 직접 고정하지 않고 Template으로 지정한다.
Head, Hierarchy Node, 사용자 권한, 자료 상태에 따라 좌측/중앙/우측 Panel과 권한/승인/이력 표시가 결정된다.

## Template Groups

| Group | Template | Purpose | DB Table |
| --- | --- | --- | --- |
| Tenant Branding | Tenant Branding Template | 회사별 로고, 표시명, 화면 색상, 문서 로고 정책 | `tenant_branding_template` |
| Left Hierarchy | Hierarchy Operation Template | Tree 추가, 수정, 이동, 호출, 공유/참조 정책 | `hierarchy_operation_template` |
| Center Main Panel | Main Panel Call Rule Template | Head와 Hierarchy 선택에 따른 Main UI 호출 | `main_panel_call_rule` |
| Right Accordion | Right Accordion Composition Template | Sub Work Place Accordion 구성, 순서, 기본 열림 상태 | `right_accordion_template` |
| Permission / Approval / History | Permission Approval History Template | 권한점, 승인 조건, Audit/History 표시 | `permission_approval_history_template` |

## Resolution Order

1. System Default Template
2. Tenant Override Template
3. Department / Project / Object Status Override
4. User Custom Template, only when allowed
5. Head Default Binding fallback

Resolution input:

- `tenant_id`
- `head_id`
- `hierarchy_node_id`
- `permission_point`
- `object_status`
- `template_status`

Resolution output:

- left panel template
- center main panel template
- right accordion template
- permission, approval, history display rule

## Required Fields

Every template should include:

- `template_id`
- `template_name`
- `template_type`
- `version`
- `status`: Draft, Review, Published, Deprecated
- `tenant_id`: nullable for system default
- `head_id`: nullable for global template
- `hierarchy_node_id`: nullable for Head-level template
- `permission_point`
- `edit_policy`
- `approval_rule_id`
- `audit_policy`
- `rollback_version`
- `created_by`
- `updated_by`
- `published_at`

## Guardrails

- Published templates are not edited directly. A new draft version is created.
- High-risk templates require approval before publishing.
- Tenant templates cannot overwrite EDIM Developer system templates.
- Every change writes before/after values to template history.
- If a Hierarchy path changes, the stable node id remains the binding key.

## Current Prototype

The prototype now includes:

- `Company Info > Tenant Branding`: editable branding template with logo image preview.
- `EDIM Developer > Permission / Template > Main Shell Template Rules`: full rule map for Main Shell setting templates.
- `EDIM Developer > Permission / Template > Panel Template Builder`: Head/Node-level left, center, right panel composition.

