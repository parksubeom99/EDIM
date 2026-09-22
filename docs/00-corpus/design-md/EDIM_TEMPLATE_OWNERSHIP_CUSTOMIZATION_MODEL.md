# EDIM Template Ownership and Customization Model

이 문서는 EDIM 중앙 Main Panel에 호출되는 UI Template의 소유권, 편집, 복사, 상속, 접근 권한, System 자료 보호 방식을 정의합니다.

## 핵심 결정

중앙 Main Panel에는 다음 유형의 Template이 호출될 수 있습니다.

```text
1. System Template
   EDIM Platform이 기본 제공하는 Template

2. Tenant Template
   회사 관리자가 회사 업무에 맞게 만든 Template

3. Department Template
   부서별 업무에 맞게 만든 Template

4. User Template
   사용자가 개인 업무용으로 만든 Template

5. User Edited Template
   System 또는 회사 Template을 복사/상속하여 사용자가 편집한 Template
```

사용자는 System이 제공한 Template을 참고하거나 편집할 수 있지만, 원본 System Template을 직접 변경하지 않습니다.

System 안정성을 위해 `Copy / Fork / Override` 방식으로 편집합니다.

## Template 호출 우선순위

Head와 Hierarchy 선택 시 중앙 Main UI Template은 다음 순서로 결정합니다.

```text
User Override Template
→ Department Template
→ Tenant Template
→ System Template
```

예:

```text
CPQ > Quotation 선택
→ 사용자의 개인 Quotation UI가 있으면 호출
→ 없으면 부서 Quotation UI 호출
→ 없으면 회사 Quotation UI 호출
→ 없으면 System 기본 Quotation UI 호출
```

## Template Scope

Template은 적용 범위를 가져야 합니다.

`template_scope` 예:

- `system`
- `tenant`
- `department`
- `role`
- `user`
- `project`

## Template Ownership

각 Template은 소유자를 가져야 합니다.

주요 필드:

- `owner_type`
- `owner_id`
- `created_by`
- `managed_by`

`owner_type` 예:

- `system`
- `tenant`
- `department`
- `user`

## System Template 보호 원칙

System Template은 EDIM 전체에 영향을 줄 수 있으므로 직접 수정하지 않습니다.

허용:

- 보기
- 사용
- 복사
- Fork
- 일부 설정 Override

제한:

- 원본 수정
- 원본 삭제
- 원본 구조 훼손
- System 공통 Data Dictionary 직접 변경
- System Macro 직접 변경

System Template 변경은 Platform Admin만 수행할 수 있습니다.

## 편집 방식

### 1. Copy

System Template을 복사하여 독립 Template으로 만듭니다.

특징:

- 원본과 연결이 끊어짐
- 자유롭게 편집 가능
- System Template 업데이트가 자동 반영되지 않음

### 2. Fork

System Template을 기반으로 새 Template을 만들되 원본 관계를 유지합니다.

특징:

- 원본 Template ID 기록
- 변경 차이를 추적 가능
- 나중에 System Template 업데이트와 비교 가능

### 3. Override

System Template의 일부 설정만 바꿉니다.

예:

- 필드 표시/숨김
- 표시명 변경
- 정렬 변경
- 기본 값 변경
- 특정 Sub Template 연결 변경
- 권한 조건 변경

원본 Layout과 핵심 기능은 유지합니다.

### 4. Full Custom

사용자가 직접 만든 완전한 UI Template입니다.

특징:

- System Template과 무관
- 자유도가 가장 높음
- 검증과 권한 설정이 더 중요함

## System 자료 접근 정책

Template 편집자는 System 자료에 접근할 수 있는 범위를 설정받아야 합니다.

System 자료 예:

- System Template
- System Data Dictionary
- System Code Set
- System UI Component
- System Macro Function
- System Validation Rule
- System Document Template
- System API Action

접근 수준:

- `none`: 접근 불가
- `view`: 보기 가능
- `use`: 호출/사용 가능
- `copy`: 복사 가능
- `override`: 제한적 Override 가능
- `edit`: 원본 수정 가능

System 자료의 기본 정책은 다음과 같습니다.

```text
일반 사용자: view/use/copy 제한적 허용
회사 관리자: view/use/copy/override 허용
Platform Admin: edit 허용
```

## Template 편집 권한

관련 PermissionPoint:

- `template.view`
- `template.use`
- `template.copy`
- `template.fork`
- `template.override`
- `template.create`
- `template.update`
- `template.delete`
- `template.publish`
- `template.approve`
- `template.system.edit`
- `template.system_resource.use`
- `template.system_resource.copy`
- `template.system_resource.override`

## Template 상태

Template은 상태를 가져야 합니다.

상태값:

- `draft`
- `review`
- `approved`
- `published`
- `rejected`
- `archived`
- `disabled`

사용자가 만든 Template은 바로 전체 회사에 적용하지 않습니다.

권장 흐름:

```text
Draft
→ Test
→ Review
→ Approval
→ Published
```

## Template Version 관리

Template은 반드시 Version을 가집니다.

필요한 이유:

- 잘못된 편집 후 Rollback
- 승인 당시 Template 보존
- System Template 업데이트 영향 분석
- 사용자 Custom Template과 원본 비교

주요 개념:

- `template_definition`
- `template_version`
- `parent_template_id`
- `base_template_version_id`
- `change_summary`

## Template Dependency

Template은 다른 자료에 의존할 수 있습니다.

의존 대상:

- Data Dictionary
- Custom Field
- Table Definition
- Code Set
- Macro
- API Action
- Document Template
- PermissionPoint
- UI Component

따라서 Template 저장/배포 전에 의존성 검사가 필요합니다.

검사 항목:

- 필요한 데이터가 존재하는가?
- 권한이 있는가?
- 비활성 자료를 참조하지 않는가?
- 순환 참조가 없는가?
- 위험 Macro를 포함하지 않는가?

## Template 실행 안전성

사용자가 만든 UI는 System에 영향을 줄 수 있으므로 실행 안전장치가 필요합니다.

원칙:

- DB 직접 접근 금지
- 허용된 API Action만 사용
- 권한 확인 후 실행
- Macro는 Sandbox에서 실행
- 위험 작업은 승인 필요
- 모든 실행은 Audit Log 기록

## Template Publish와 적용 범위

Template을 Published 상태로 만들 때 적용 범위를 선택합니다.

적용 범위 예:

- 내 개인 화면
- 특정 부서
- 특정 Role
- 특정 Head
- 특정 Project Type
- 회사 전체

적용 범위가 넓을수록 승인 절차가 필요합니다.

예:

```text
개인 Template → 본인 승인 없이 사용 가능
부서 Template → 부서 관리자 승인
회사 전체 Template → 회사 Admin 승인
System Template → Platform Admin 승인
```

## 중앙 Main Panel 호출 모델

Main Panel은 직접 Template 파일을 호출하는 것이 아니라 Template Registry를 통해 호출합니다.

```text
Head + WorkHierarchy + User Context
→ Template Resolution
→ Permission Check
→ Dependency Check
→ Main Panel Render
```

## 데이터 모델 후보

### TemplateDefinition

Template의 기본 정의입니다.

주요 필드:

- `id`
- `tenant_id`
- `template_scope`
- `template_type`
- `code`
- `name`
- `description`
- `owner_type`
- `owner_id`
- `status`
- `current_version_id`
- `base_template_id`
- `created_by`
- `created_at`
- `updated_at`

### TemplateVersion

Template의 Version입니다.

주요 필드:

- `id`
- `template_definition_id`
- `version`
- `layout_schema`
- `data_binding_schema`
- `action_schema`
- `permission_schema`
- `change_summary`
- `status`
- `created_by`
- `created_at`

### TemplateAccessPolicy

System 자료와 Template에 대한 접근 정책입니다.

주요 필드:

- `id`
- `tenant_id`
- `resource_type`
- `resource_id`
- `subject_type`
- `subject_id`
- `access_level`
- `condition_rule`
- `status`

### TemplateDependency

Template이 의존하는 자료입니다.

주요 필드:

- `id`
- `template_version_id`
- `dependency_type`
- `dependency_id`
- `usage_type`
- `required`

### TemplatePublishRequest

Template 배포 승인 요청입니다.

주요 필드:

- `id`
- `tenant_id`
- `template_definition_id`
- `template_version_id`
- `publish_scope`
- `target_type`
- `target_id`
- `status`
- `requested_by`
- `requested_at`
- `approved_by`
- `approved_at`

## MVP 반영 범위

첫 구현에서는 다음만 준비합니다.

- System Template과 Tenant Template 구분
- Template 복사
- Template Version
- Template Access Policy 기본 구조
- Template 권한 확인
- 개인/회사 범위 Publish 구분
- System Template 원본 수정 제한

Fork, Override 비교, 복잡한 Dependency 분석은 이후 단계에서 확장합니다.

## 결정 사항

중앙 Main Panel에 호출되는 Template은 소유권과 적용 범위를 가져야 합니다.

System Template은 직접 수정하지 않고 Copy, Fork, Override 방식으로 확장합니다.

사용자가 접근 가능한 System 자료와 수정/편집 권한은 미리 설정합니다.

