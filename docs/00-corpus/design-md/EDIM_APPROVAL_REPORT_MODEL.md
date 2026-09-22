# EDIM Approval and Report Model

이 문서는 EDIM의 보고, 검토, 승인, 반려, 재상신, 이력 관리를 위한 공통 모듈을 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 54페이지이며, 전자결재, BPM, ERP, PLM에서 일반적으로 사용하는 승인 패턴을 EDIM에 맞게 확장하는 것을 목표로 합니다.

## 핵심 결정

보고/승인은 CPQ, PLM, ERP 각각에 흩어져 있으면 안 됩니다.

EDIM Core의 공통 모듈로 `Approval & Report Engine`을 만들고, CPQ, PLM, ERP, EDIM Toolbox, AI/Macro, Document, Drawing이 모두 이 모듈을 사용합니다.

```text
CPQ Quotation
PLM Drawing
ERP Purchase Request
EDIM Macro
Document Template
Product Code
Non-standard Option
→ Approval & Report Engine
```

## 사용자 설정 원칙

승인 절차는 개발자가 코드로 고정하지 않습니다.

권한을 가진 사용자가 승인 방식을 선택하고 설정할 수 있어야 합니다.

예:

- 회사 관리자
- 부서 관리자
- EDIM Platform Admin
- Approval Workflow 관리자

설정 가능한 항목:

- 승인 대상
- 승인 단계
- 승인자 지정 방식
- 순차/병렬/조건부 승인 방식
- 반려 시 처리 방식
- 재상신 방식
- 대리 승인
- 기한/지연 알림
- 보안 등급
- 문서 번호 규칙
- 변경 시 재승인 조건

## 지원해야 할 승인 방식

### 1. 단일 승인

한 명의 승인자가 승인하면 완료됩니다.

예:

- 간단한 내부 보고
- 소액 구매 요청

### 2. 순차 승인

정해진 순서대로 승인합니다.

```text
작성자 → 팀장 → 부서장 → 임원
```

예:

- 견적 승인
- 구매 요청
- 제작 의뢰

### 3. 병렬 승인

여러 승인자가 동시에 검토합니다.

완료 조건은 설정으로 정합니다.

- 전원 승인
- N명 이상 승인
- 특정 필수 승인자 포함

예:

- 설계, 생산, 품질 동시 검토
- 다부서 기술 검토

### 4. 조건부 승인

데이터 조건에 따라 승인 경로가 달라집니다.

조건 예:

- 견적 금액
- 할인율
- 마진율
- 비표준 Option 포함 여부
- 도면 변경 등급
- 보안 등급
- 고객 등급
- 프로젝트 유형

예:

```text
견적 금액 < 1,000만원 → 팀장 승인
견적 금액 >= 1,000만원 → 팀장 + 부서장 승인
비표준 Option 포함 → 기술 검토 추가
마진율 기준 미달 → 경영 승인 추가
```

### 5. 역할 기반 승인

개인 이름이 아니라 Role 또는 Department 기준으로 승인자를 지정합니다.

예:

- Sales Manager
- Engineering Approver
- QC Approver
- Purchasing Manager

담당자가 바뀌어도 Workflow를 수정하지 않아도 됩니다.

### 6. 프로젝트/부서 기반 승인

Project owner, Department manager, 담당 Engineer처럼 업무 데이터에서 승인자를 동적으로 찾습니다.

예:

- 프로젝트 담당자
- 프로젝트 PM
- 해당 부서장
- 품목 담당 설계자

### 7. 대리 승인

휴가, 출장, 퇴사, 장기 부재 시 대리 승인자를 지정합니다.

대리 승인 이력은 반드시 남깁니다.

### 8. 위임과 참조

승인자가 다른 사람에게 검토를 위임하거나, 참조자를 추가할 수 있습니다.

예:

- 법무 검토 요청
- 외부 협력사 의견 요청
- 고객 승인자 참조

### 9. 반려 / 보완 요청 / 재상신

반려 방식도 설정 가능해야 합니다.

- 작성자에게 반려
- 이전 단계로 반려
- 특정 단계로 반려
- 보완 요청 후 같은 단계에서 재검토

### 10. 변경 시 재승인

승인 완료 후 중요한 데이터가 바뀌면 재승인이 필요할 수 있습니다.

재승인 조건 예:

- 견적 금액 변경
- BOM Line 변경
- 도면 Revision 변경
- Macro 변경
- 문서 Template 변경
- 보안 등급 변경

## 주요 엔티티

### ApprovalWorkflowDefinition

승인 절차의 정의입니다.

주요 필드:

- `id`
- `tenant_id`
- `code`
- `name`
- `description`
- `target_type`
- `status`
- `version`
- `created_by`
- `created_at`
- `updated_at`

### ApprovalWorkflowVersion

Workflow의 버전입니다.

이미 진행 중인 승인 요청은 당시 버전 기준으로 유지되어야 합니다.

주요 필드:

- `id`
- `workflow_definition_id`
- `version`
- `definition`
- `status`
- `published_by`
- `published_at`

### ApprovalStep

승인 단계입니다.

주요 필드:

- `id`
- `workflow_version_id`
- `step_code`
- `name`
- `step_type`
- `sort_order`
- `assignment_policy`
- `completion_policy`
- `condition_rule`
- `timeout_rule`

`step_type` 예:

- `review`
- `approval`
- `report`
- `reference`
- `system_check`

`completion_policy` 예:

- `single`
- `all`
- `any`
- `quorum`
- `required_plus_any`

### ApprovalRequest

실제 승인 요청입니다.

주요 필드:

- `id`
- `tenant_id`
- `workflow_version_id`
- `target_type`
- `target_id`
- `title`
- `description`
- `doc_no`
- `version`
- `security_grade`
- `status`
- `requested_by`
- `requested_at`
- `completed_at`

`target_type` 예:

- `quotation`
- `bom`
- `drawing`
- `document`
- `macro`
- `product_code`
- `purchase_request`
- `quality_check`
- `project_stage`

### ApprovalTask

각 승인자에게 배정되는 작업입니다.

주요 필드:

- `id`
- `approval_request_id`
- `step_id`
- `assignee_type`
- `assignee_id`
- `status`
- `due_at`
- `delegated_from`
- `completed_by`
- `completed_at`

### ApprovalDecision

승인자의 결정 이력입니다.

주요 필드:

- `id`
- `approval_task_id`
- `decision`
- `comment`
- `created_by`
- `created_at`

`decision` 예:

- `approve`
- `reject`
- `return`
- `request_change`
- `delegate`
- `hold`

### Report

보고 문서 또는 보고 이벤트입니다.

주요 필드:

- `id`
- `tenant_id`
- `target_type`
- `target_id`
- `report_type`
- `title`
- `content`
- `status`
- `created_by`
- `created_at`

## 54페이지 반영 항목

54페이지 기준으로 다음 항목을 승인 요청과 보고서에 포함합니다.

- Person
- Date
- Released Status
- Approver
- App. Date
- Version
- DOC No.
- Progress
- Title
- Density
- Management Grade
- Name
- Remarks
- Status
- Authorization Settings
- Security Solution

이 항목들은 업무 종류에 따라 기본 필드 또는 Custom Field로 확장할 수 있습니다.

## 권한

관련 PermissionPoint:

- `approval.workflow.view`
- `approval.workflow.create`
- `approval.workflow.update`
- `approval.workflow.publish`
- `approval.request.create`
- `approval.request.cancel`
- `approval.task.view`
- `approval.task.approve`
- `approval.task.reject`
- `approval.task.delegate`
- `approval.report.create`
- `approval.security.manage`

## MVP 반영 범위

첫 구현에서는 다음 기능만 만듭니다.

- Workflow Definition 등록
- 단일 승인
- 순차 승인
- 승인 요청 생성
- 승인/반려
- 의견 입력
- 승인 이력 저장
- 대상 객체 상태 변경

이후 단계에서 병렬 승인, 조건부 승인, 대리 승인, 재승인, 보안 등급, 지연 알림을 확장합니다.

## 결정 사항

EDIM의 승인/보고 기능은 확장 가능한 공통 Workflow 모듈로 설계합니다.

권한 있는 사용자가 승인 방식을 선택하고 설정할 수 있어야 합니다.

