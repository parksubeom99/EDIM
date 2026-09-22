# EDIM Auth and Permission Model

이 문서는 EDIM의 로그인, 사용자 승인, 회사/부서/역할, 권한 확장 구조를 정의합니다.

## 핵심 원칙

EDIM은 SaaS이므로 사용자는 반드시 Login 과정을 거쳐야 합니다.

사용자는 계정을 만들었다고 바로 EDIM Core Shell에 들어갈 수 없습니다.

회사 관리자 또는 Platform Admin으로부터 회사 소속과 권한을 승인받아야 합니다.

## 기본 흐름

```text
Login
→ Account 확인
→ Tenant Membership 확인
→ 승인 상태 확인
→ 회사/부서/역할/권한 로드
→ 접근 가능한 Head, Hierarchy, Template, Toolbar 구성
→ EDIM Core Shell 진입
```

## 가장 중요한 구조

User Account와 Tenant Membership은 분리합니다.

```text
User Account = 개인 로그인 계정
Tenant = SaaS를 사용하는 회사
Membership = 사용자가 특정 회사에서 어떤 권한을 갖는지 나타내는 관계
```

이 구조가 필요한 이유:

- 한 사용자가 여러 회사에 소속될 수 있음
- 협력사, 대리점, 고객 승인자, 외부 설계자 확장이 쉬움
- 회사별 권한과 부서가 달라질 수 있음
- SaaS 데이터 분리를 안전하게 유지할 수 있음

## 주요 엔티티

### UserAccount

개인 로그인 계정입니다.

주요 필드:

- `id`
- `email`
- `password_hash`
- `name`
- `phone`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

### Tenant

SaaS를 사용하는 회사입니다.

주요 필드:

- `id`
- `name`
- `business_registration_no`
- `business_type`
- `subscription_status`
- `status`
- `created_at`
- `updated_at`

### TenantMembership

사용자가 특정 회사에 소속되어 있는지, 그리고 사용 승인을 받았는지를 관리합니다.

주요 필드:

- `id`
- `tenant_id`
- `user_account_id`
- `employee_no`
- `display_name`
- `membership_type`
- `status`
- `approved_by`
- `approved_at`
- `suspended_at`
- `created_at`
- `updated_at`

상태값:

- `invited`
- `pending`
- `approved`
- `rejected`
- `suspended`
- `left`

### Department

회사 내부 부서입니다.

예:

- Sales
- Tech
- Purchasing
- Material
- Product
- QC
- Finance
- HR
- Company Info

주요 필드:

- `id`
- `tenant_id`
- `parent_id`
- `code`
- `name`
- `sort_order`
- `status`

### MembershipDepartment

사용자와 부서의 연결입니다.

한 사용자가 여러 부서에 속할 수 있어야 합니다.

주요 필드:

- `id`
- `tenant_membership_id`
- `department_id`
- `is_primary`
- `status`

### Role

역할은 권한 묶음입니다.

초기 기본 Role:

- Owner
- Admin
- Manager
- Sales
- Engineer
- Purchaser
- Production
- QC
- Approver
- Viewer
- External Partner
- Customer Approver

주요 필드:

- `id`
- `tenant_id`
- `code`
- `name`
- `description`
- `status`

### MembershipRole

사용자와 Role의 연결입니다.

주요 필드:

- `id`
- `tenant_membership_id`
- `role_id`
- `status`

## 권한 확장 모델

EDIM의 권한은 처음부터 모든 항목을 확정하기 어렵습니다.

따라서 기능이 추가될 때마다 권한 포인트를 계속 등록할 수 있는 구조가 필요합니다.

핵심 개념:

```text
PermissionPoint = 권한이 필요한 기능 또는 동작
PermissionGrant = 특정 Role/User에게 부여된 권한
```

### PermissionPoint

권한 관리 대상입니다.

주요 필드:

- `id`
- `code`
- `name`
- `description`
- `category`
- `resource_type`
- `action`
- `risk_level`
- `status`

예:

- `head.cpq.view`
- `head.plm.view`
- `head.edim_toolbox.manage`
- `project.create`
- `project.update`
- `project.delete`
- `cpq.selection.run`
- `bom.run`
- `quotation.view_cost`
- `quotation.edit_margin`
- `quotation.approve`
- `drawing.macro_run`
- `document.generate`
- `template.edit`
- `macro.create`
- `macro.approve`
- `system.head.manage`

### PermissionGrant

Role 또는 특정 사용자에게 권한을 부여합니다.

주요 필드:

- `id`
- `tenant_id`
- `subject_type`
- `subject_id`
- `permission_point_id`
- `effect`
- `scope_type`
- `scope_id`
- `condition`
- `created_by`
- `created_at`

`subject_type` 예:

- `role`
- `membership`

`effect`:

- `allow`
- `deny`

`scope_type` 예:

- `tenant`
- `department`
- `project`
- `customer`
- `supplier`
- `head`
- `template`

## 권한 판정 방식

권한 판정은 다음 순서로 처리합니다.

1. 사용자가 로그인되어 있는가?
2. Tenant Membership이 `approved` 상태인가?
3. Tenant 상태가 사용 가능한가?
4. 요청 기능에 PermissionPoint가 있는가?
5. 사용자 Role 또는 Membership에 해당 권한이 있는가?
6. Scope 조건에 맞는가?
7. 명시적 `deny`가 있으면 차단한다.

## Head 권한

Head는 설정 데이터이므로 권한도 동적으로 처리해야 합니다.

예:

- CPQ Head 접근
- PLM Head 접근
- ERP Head 접근
- EDIM Toolbox 접근
- Head 추가/이동/비활성화

관련 PermissionPoint:

- `head.view`
- `head.manage`
- `head.create`
- `head.update`
- `head.reorder`
- `head.disable`
- `head.delete`

## Template 권한

Template은 Main UI, Sub UI, Toolbar, Document, Print Form, Macro, Chart, Table을 포함합니다.

관련 PermissionPoint:

- `template.view`
- `template.create`
- `template.update`
- `template.delete`
- `template.publish`
- `template.version_restore`

## EDIM Run 권한

EDIM Run은 BOM, 도면, 견적, 문서 등 실제 결과물을 생성하므로 별도 권한이 필요합니다.

관련 PermissionPoint:

- `run.bom`
- `run.cost`
- `run.pricing`
- `run.drawing`
- `run.document`
- `run.all`

## AI/Macro 권한

AI와 Macro는 위험도가 높으므로 작성, 검토, 승인, 실행을 분리합니다.

관련 PermissionPoint:

- `macro.create`
- `macro.update`
- `macro.test`
- `macro.approve`
- `macro.run`
- `ai.prompt`
- `ai.generate_macro`
- `ai.train_data_manage`

## 초기 구현 전략

초기 구현에서는 지나치게 복잡한 권한 UI를 만들지 않습니다.

1단계:

- UserAccount
- Tenant
- TenantMembership
- Department
- Role
- PermissionPoint
- PermissionGrant

2단계:

- Head별 접근 권한
- Template별 접근 권한
- EDIM Run 권한

3단계:

- Project/Department/Customer/Supplier Scope 권한
- Macro 승인 권한
- AI 학습자료 권한

## 중요한 설계 결정

권한은 화면이나 코드에 고정하지 않습니다.

새 기능이 추가되면 그 기능에 대한 `PermissionPoint`를 추가하고, Role 또는 Membership에 `PermissionGrant`를 부여합니다.

이 구조를 사용하면 EDIM이 커져도 권한 체계가 무너지지 않습니다.

