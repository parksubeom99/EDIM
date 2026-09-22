# EDIM Code Governance and Approval Model

이 문서는 EDIM의 모든 Code가 권한 있는 작성자에 의해 생성되고, 승인 절차를 거친 후 사용되도록 하는 Code Governance 구조를 정의합니다.

## 핵심 결정

EDIM의 모든 Code는 자동 BOM, 도면, 기술자료, 견적, 원가, 문서 생성에 영향을 줄 수 있습니다.

따라서 Code는 아무 사용자가 자유롭게 등록하거나 즉시 사용할 수 없습니다.

모든 Code는 다음 원칙을 따릅니다.

```text
권한 있는 작성자만 작성
→ Draft 생성
→ Validation
→ Review
→ Approval
→ Published
→ EDIM Run에서 사용
```

## 적용 대상 Code

적용 대상:

- Sub Code
- Raw Material Code
- Purchase Item Code
- Specification Code
- Product Code
- Arrangement Code
- Document Code
- Drawing Code
- Work Process Code
- BOM Code
- Macro-linked Code

## Code 상태

Code는 상태를 가져야 합니다.

상태값:

- `draft`
- `validated`
- `review_requested`
- `approved`
- `published`
- `rejected`
- `archived`
- `inactive`
- `obsolete`

EDIM Run에서 사용할 수 있는 기본 상태는 `published`입니다.

예외적으로 Test Run은 권한 있는 사용자만 Draft/Validated Code로 실행할 수 있습니다.

## 작성 권한

Code 작성은 권한이 있는 사용자만 가능합니다.

관련 PermissionPoint:

- `code.create`
- `code.update`
- `code.delete`
- `code.disable`
- `code.validate`
- `code.review.request`
- `code.approve`
- `code.publish`
- `code.archive`
- `code.test_run`

Code Type별 세부 권한도 필요합니다.

예:

- `sub_code.create`
- `product_code.create`
- `arrangement_code.create`
- `bom_code.publish`
- `material_code.update`

## 작성자와 책임자

Code는 작성자와 관리 책임자를 가져야 합니다.

주요 역할:

- Author: 최초 작성자
- Owner: 관리 책임자
- Reviewer: 검토자
- Approver: 승인자
- Publisher: Published 처리자

## Code Approval Workflow

Code Type마다 승인 절차가 다를 수 있습니다.

예:

```text
Sub Code
→ 작성자
→ 부서 Reviewer
→ Code 관리자 승인
→ Published
```

```text
Product Code
→ 작성자
→ Engineering Review
→ Manufacturing Review
→ Code 관리자 승인
→ Published
```

```text
Macro-linked Code
→ 작성자
→ Macro 검토
→ 안전성 검증
→ 승인
→ Published
```

승인 Workflow는 고정하지 않고 Approval & Report Engine으로 설정합니다.

## Code Validation

승인 전에 반드시 검증합니다.

검증 항목:

- 필수 필드 누락
- 중복 Code
- 유사 Sub Code 존재
- Attribute 누락
- Unit 불일치
- Hierarchy Address 누락
- 연결 Drawing/Table/Macro 누락
- 비활성 자료 참조
- 순환 Relationship
- 권한 없는 자료 참조
- Version 충돌

## Published Version

Published 된 Code는 안정적인 기준 데이터입니다.

운영 원칙:

- Published Code는 직접 수정하지 않습니다.
- 수정이 필요하면 새 Version/Revision을 만듭니다.
- 기존 Project와 BOM Run은 기존 Version을 유지합니다.
- 신규 Project 또는 지정 범위에 새 Version을 적용합니다.

## Code Usage Lock

Code가 Product Code, Relationship, BOM Run, Drawing, Document에서 사용되면 보호 상태가 됩니다.

보호 상태 Code는 다음을 제한합니다.

- 직접 삭제 금지
- 직접 Major Field 수정 금지
- Hierarchy 이동 시 영향 분석 필요
- 새 Version 또는 Change Request 필요

## Code Change Request

사용 중인 Code 변경은 Change Request로 처리합니다.

흐름:

```text
Change Request 생성
→ 변경 내용 작성
→ Impact Analysis
→ Review
→ Approval
→ New Version Publish
→ 적용 범위 선택
```

적용 범위:

- 신규 Project부터 적용
- 특정 날짜 이후 적용
- 특정 Product Code에만 적용
- 특정 Customer/Project Type에 적용
- 기존 Relationship 유지

## Code Snapshot

EDIM Run, 승인, 문서 생성 시 사용한 Code Version을 Snapshot으로 저장합니다.

필요한 이유:

- 과거 BOM 재현
- 승인 당시 기준 확인
- 견적/도면/문서 이력 보존
- 변경 후 문제 추적

## 데이터 모델 후보

### CodeDefinition

Code 기본 정보입니다.

주요 필드:

- `id`
- `tenant_id`
- `stable_key`
- `code_type`
- `code`
- `name`
- `description`
- `status`
- `current_version_id`
- `owner_user_id`
- `created_by`
- `created_at`
- `updated_at`

### CodeVersion

Code Version입니다.

주요 필드:

- `id`
- `tenant_id`
- `code_definition_id`
- `version`
- `data`
- `status`
- `validation_status`
- `approval_status`
- `published_at`
- `published_by`

### CodeGovernancePolicy

Code Type별 관리 정책입니다.

주요 필드:

- `id`
- `tenant_id`
- `code_type`
- `required_author_permission`
- `required_approval_workflow_id`
- `allow_draft_test_run`
- `require_duplicate_check`
- `require_impact_analysis`
- `status`

### CodeChangeRequest

Code 변경 요청입니다.

주요 필드:

- `id`
- `tenant_id`
- `code_definition_id`
- `from_version_id`
- `to_version_id`
- `change_type`
- `reason`
- `impact_summary`
- `status`
- `requested_by`
- `requested_at`

## EDIM Run 제한

EDIM Run은 기본적으로 Published Code만 사용합니다.

Run별 제한:

- BOM Run: Published Product Code / Sub Code / Relationship
- Drawing Run: Approved Drawing / Macro / Parameter
- Cost Run: Published Cost Table
- Document Run: Published Document Template

Test Run:

- 권한 있는 사용자만 실행
- 결과는 공식 Project 자료로 사용 불가
- 명확히 Test 표시

## Audit Log

기록 대상:

- Code 생성
- Code 수정
- Validation 실행
- Review 요청
- Approval / Reject
- Publish
- Archive / Inactive
- Change Request
- Version 생성
- EDIM Run 사용

## MVP 반영 범위

첫 구현에서는 다음을 준비합니다.

- Code 상태값
- 작성 권한 확인
- Draft / Published 구분
- Published Code 수정 제한
- Validation 기본 검사
- Approval 요청 연결
- EDIM Run에서 Published만 사용
- Audit Log

다음 단계에서 Code Type별 세부 Workflow, Change Request, Snapshot, Impact Analysis를 확장합니다.

## 결정 사항

EDIM의 모든 Code는 권한 있는 작성자와 승인 절차를 거쳐야 공식 사용 가능합니다.

Published Code만 EDIM Run과 Product Code / BOM Code / Drawing / Document 생성에 사용합니다.

