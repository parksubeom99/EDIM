# EDIM System Admin and Organization Permission Model

이 문서는 EDIM에서 개발자 그룹의 System 권한 관리자 설정, 회사별 조직도 기반 권한, 사용자/부서/역할별 항목 권한을 정의합니다.

## 핵심 결정

EDIM은 SaaS 플랫폼이므로 권한 주체를 두 계층으로 분리합니다.

```text
1. Platform / System 권한
   EDIM 개발자, Platform Admin, System 운영자 권한

2. Tenant / Organization 권한
   각 회사의 조직도, 부서, 사용자, 역할 기반 권한
```

이 두 권한은 섞으면 안 됩니다.

Platform 권한은 EDIM 전체와 System 자료를 관리하고, Tenant 권한은 해당 회사의 데이터와 업무를 관리합니다.

## 권한 계층

```text
Platform
└─ Developer Group / System Admin

Tenant
└─ Organization
   ├─ Department
   │  ├─ Team
   │  └─ User
   └─ Role / Permission
```

## Platform / System 권한

EDIM 전체 시스템을 관리하는 권한입니다.

주요 역할:

- Platform Owner
- Platform Admin
- System Developer
- System Template Manager
- System Data Manager
- Security Admin
- Support Admin
- Read-only Auditor

관리 대상:

- System Template
- System Head
- System Hierarchy
- System Data Dictionary
- System PermissionPoint
- System Macro Function
- Global Configuration
- Tenant 생성/정지
- System Audit
- Version Update

## Developer Group

개발자 그룹은 System 자료를 만들거나 수정할 수 있는 권한을 가집니다.

단, 개발자도 모든 운영 Tenant 데이터에 자유롭게 접근하면 안 됩니다.

원칙:

- System 자료 수정 가능
- Tenant 운영 데이터 접근은 제한
- 고객 데이터 접근 시 승인/로그 필요
- Support Access는 시간 제한과 사유 기록 필요
- 모든 System 변경은 Audit Log 기록

## Tenant / Organization 권한

각 회사 내부 사용자의 권한입니다.

조직도 기반으로 관리합니다.

구성:

- Company
- Division
- Department
- Team
- User
- Role
- Position
- Job Duty

예:

```text
Nova Solution
└─ Engineering
   ├─ Design Team
   └─ Automation Team
└─ Sales
└─ Purchasing
└─ Manufacturing
└─ QC
```

## Organization Unit

조직도 항목입니다.

주요 필드:

- `id`
- `tenant_id`
- `parent_id`
- `org_type`
- `code`
- `name`
- `manager_membership_id`
- `sort_order`
- `status`

`org_type` 예:

- `company`
- `division`
- `department`
- `team`
- `external_partner`
- `customer_group`

## Position / Job Duty

부서만으로는 충분하지 않으므로 직책과 담당 업무도 분리합니다.

예:

- Sales Manager
- Design Engineer
- BOM Manager
- Code Manager
- Purchasing Officer
- QC Inspector
- Approval Manager

## 항목별 권한 설정

각 사용자는 조직도와 역할에 따라 항목별 권한을 가집니다.

권한 설정 대상:

- Head
- WorkHierarchy
- Template
- Code
- Sub Code
- Product Code
- BOM Code
- Drawing
- Table
- Macro
- Document
- Approval Workflow
- Project
- Customer
- Supplier
- Dashboard
- Mobile Feature

## Permission Scope

권한은 범위를 가져야 합니다.

Scope 예:

- 전체 회사
- 특정 부서
- 특정 팀
- 특정 Project
- 특정 Customer
- 특정 Supplier
- 특정 Head
- 특정 Hierarchy
- 특정 Code Type
- 특정 Template
- 특정 Security Grade

예:

```text
Engineering Department
→ PLM Head 접근 가능
→ Drawing 수정 가능
→ Product Code 승인 불가
```

```text
Code Manager
→ Sub Code 생성 가능
→ Product Code 승인 가능
→ System Template 수정 불가
```

```text
Purchasing Team
→ Material Code 보기 가능
→ Purchase Item Code 수정 가능
→ Cost Table 일부 보기 가능
```

## Permission Inheritance

조직도 기반 권한은 상속 구조가 필요합니다.

예:

```text
Engineering Department 권한
→ Design Team에 기본 상속
→ 특정 사용자에게 추가 권한 또는 제한 권한 부여
```

명시적 Deny는 Allow보다 우선합니다.

## 권한 우선순위

권한 판정 우선순위:

```text
1. System Security Deny
2. Explicit User Deny
3. Explicit User Allow
4. Role Permission
5. Organization Permission
6. Tenant Default Permission
7. System Default
```

## Permission Matrix

관리자는 Matrix 형태로 권한을 볼 수 있어야 합니다.

예:

```text
                View   Create   Edit   Approve   Run   Manage
Sub Code         O       O       O       X        X      X
Product Code     O       O       O       O        X      X
BOM Code         O       O       O       O        O      X
Template         O       X       X       X        X      X
```

## 데이터 모델 후보

### PlatformRole

System 권한 Role입니다.

주요 필드:

- `id`
- `code`
- `name`
- `description`
- `status`

### PlatformUserRole

System 사용자와 Platform Role 연결입니다.

주요 필드:

- `id`
- `user_account_id`
- `platform_role_id`
- `status`
- `granted_by`
- `granted_at`

### OrganizationUnit

회사 조직도입니다.

주요 필드:

- `id`
- `tenant_id`
- `parent_id`
- `org_type`
- `code`
- `name`
- `manager_membership_id`
- `status`

### MembershipOrgAssignment

사용자와 조직도 연결입니다.

주요 필드:

- `id`
- `tenant_membership_id`
- `organization_unit_id`
- `position`
- `job_duty`
- `is_primary`
- `status`

### PermissionPolicy

항목별 권한 정책입니다.

주요 필드:

- `id`
- `tenant_id`
- `subject_type`
- `subject_id`
- `resource_type`
- `resource_id`
- `action`
- `effect`
- `scope_type`
- `scope_id`
- `condition_rule`
- `status`

`subject_type` 예:

- `platform_role`
- `tenant_role`
- `organization_unit`
- `membership`

`resource_type` 예:

- `head`
- `hierarchy`
- `template`
- `code_type`
- `code_definition`
- `drawing`
- `table`
- `macro`
- `document`
- `project`

## Support Access

개발자나 Support Admin이 고객 Tenant 데이터에 접근해야 하는 경우가 있을 수 있습니다.

원칙:

- 사유 입력
- 시간 제한
- 접근 범위 제한
- 관리자 승인
- Audit Log
- 민감정보 마스킹 가능

## MVP 반영 범위

첫 구현에서는 다음을 준비합니다.

- Platform Role
- Tenant Organization Unit
- Membership Org Assignment
- Role 기반 권한
- Head / Hierarchy / Template / Code Type 권한
- 명시적 Deny 우선
- System Admin과 Tenant Admin 분리

다음 단계에서 Permission Matrix UI, Support Access, 세부 Scope 권한을 확장합니다.

## 결정 사항

EDIM은 Platform/System 권한과 Tenant/Organization 권한을 분리합니다.

각 사용자와 조직도에 따라 Head, Hierarchy, Template, Code, Drawing, Macro 등 항목별 권한을 설정할 수 있어야 합니다.

