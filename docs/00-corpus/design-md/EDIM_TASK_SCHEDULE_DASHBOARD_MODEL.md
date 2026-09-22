# EDIM Task, Schedule, and Dashboard Model

이 문서는 EDIM 좌측 패널 하단에 표시할 사용자 일정, 해야 할 일, 지연 업무, ERP 후속 업무 알림, Dashboard 구조를 정의합니다.

## 핵심 결정

좌측 패널 하단에는 Hierarchy 아래에 사용자의 업무 실행 상태를 보여주는 Template을 호출합니다.

이 영역은 단순 일정표가 아니라 `Task Inbox / Schedule / Follow-up Work` 영역입니다.

ERP, CPQ, PLM, Approval, EDIM Run에서 발생하는 업무를 모아 사용자에게 알려줍니다.

```text
Left Panel
├─ Work Hierarchy
└─ Task / Schedule / To-do Template
```

## 필요한 이유

EDIM에서는 업무가 단계적으로 넘어갑니다.

예:

```text
영업 견적 완료
→ 기술 검토 요청
→ 설계 도면 작성
→ 구매 요청
→ 자재 입고
→ 생산 지시
→ 품질 검사
→ 출고
→ 설치 / A/S
```

전 단계가 완료되면 후속 담당자에게 자동으로 해야 할 일이 생성되어야 합니다.

또한 지연된 일, 승인 대기, EDIM Run 실패, 프로젝트 진행 상황을 한눈에 볼 수 있어야 합니다.

## 좌측 하단 Template 후보

좌측 하단에는 다음 Template을 호출할 수 있습니다.

- My Tasks
- My Schedule
- Pending Approval
- Delayed Tasks
- Follow-up Tasks
- EDIM Run Status
- Project Alerts
- Recent Activity
- Favorite Work
- Mentions / Comments

초기에는 `My Tasks`, `My Schedule`, `Delayed Tasks`, `Pending Approval`을 우선합니다.

## Task 유형

EDIM에서 생성될 수 있는 Task 유형:

- Approval Task
- Review Task
- Report Task
- Design Task
- Purchase Request Task
- Material Check Task
- Manufacturing Task
- QC Task
- Document Task
- Drawing Task
- EDIM Run Check Task
- Customer Response Task
- A/S Task
- Maintenance Task

## ERP 단계별 후속 Task 예시

### Sales

- 고객 요구사항 등록
- 견적 작성
- 견적 검토 요청
- 고객 승인 확인
- 수주 전환

### Tech / Engineering

- 기술 검토
- 제품 선정 확인
- 승인도 작성
- 제작도면 검토
- 비표준 Option 검토

### Purchasing

- 구매 요청 확인
- 공급처 견적 요청
- 발주 처리
- 납기 확인

### Material

- 재고 확인
- 입고 확인
- 자재 출고
- 부족 자재 알림

### Manufacturing

- 작업지시 확인
- 공정 시작
- 공정 완료
- 생산 지연 보고

### QC

- 수입 검사
- 공정 검사
- 완제품 검사
- 불량/하자 처리

### Delivery / A/S

- 출고 요청
- 납품 확인
- 설치 일정
- 시운전 요청
- 유지보수 처리

## 자동 Task 생성 조건

Task는 사용자가 직접 만들 수도 있고, 시스템이 자동으로 만들 수도 있습니다.

자동 생성 조건 예:

- 전 단계 업무 완료
- 승인 요청 생성
- 승인 반려
- 납기 임박
- 일정 지연
- EDIM Run 완료
- EDIM Run 실패
- BOM 변경
- 도면 Revision 변경
- 구매 요청 생성
- 자재 부족 발생
- 품질 검사 필요
- 고객 응답 필요

## Task 상태

Task 상태:

- `new`
- `assigned`
- `in_progress`
- `waiting`
- `completed`
- `rejected`
- `cancelled`
- `delayed`
- `overdue`

## Task 우선순위

우선순위:

- `low`
- `normal`
- `high`
- `urgent`
- `critical`

## 주요 엔티티 후보

### TaskItem

사용자가 해야 할 업무입니다.

주요 필드:

- `id`
- `tenant_id`
- `project_id`
- `task_type`
- `title`
- `description`
- `status`
- `priority`
- `source_type`
- `source_id`
- `target_type`
- `target_id`
- `assigned_to`
- `assigned_department_id`
- `due_at`
- `started_at`
- `completed_at`
- `created_by`
- `created_at`

### TaskDependency

업무 선후 관계입니다.

주요 필드:

- `id`
- `tenant_id`
- `predecessor_task_id`
- `successor_task_id`
- `dependency_type`
- `status`

`dependency_type` 예:

- `finish_to_start`
- `start_to_start`
- `finish_to_finish`

### TaskRule

업무 자동 생성 규칙입니다.

주요 필드:

- `id`
- `tenant_id`
- `code`
- `name`
- `trigger_type`
- `condition_rule`
- `action_rule`
- `target_role_id`
- `target_department_id`
- `status`

### ScheduleEvent

일정입니다.

주요 필드:

- `id`
- `tenant_id`
- `project_id`
- `title`
- `description`
- `event_type`
- `start_at`
- `end_at`
- `owner_user_id`
- `related_task_id`
- `status`

### DashboardWidget

Dashboard에 표시할 위젯입니다.

주요 필드:

- `id`
- `tenant_id`
- `widget_type`
- `title`
- `data_source`
- `filter_rule`
- `display_rule`
- `required_permission`
- `sort_order`
- `status`

## Dashboard 표현 항목

Dashboard에서는 다음을 표현할 수 있어야 합니다.

### 전체 Project 현황

- 진행 중 Project 수
- 지연 Project 수
- 완료 Project 수
- 단계별 Project 수
- 고객별 Project 수

### 담당 업무 현황

- 내 업무 전체
- 오늘 마감
- 지연 업무
- 승인 대기
- 검토 대기
- 완료 업무

### 부서별 업무 현황

- Sales 진행 현황
- Tech 검토 현황
- Purchasing 발주 현황
- Material 입출고 현황
- Manufacturing 생산 현황
- QC 검사 현황

### EDIM Run 현황

- BOM Run 완료/실패
- Drawing Run 완료/실패
- Cost Run 완료/실패
- Document Run 완료/실패

### 승인 현황

- 승인 대기
- 반려
- 지연 승인
- 완료 승인

## 좌측 하단 UI 원칙

- Hierarchy보다 작고 간결하게 표시합니다.
- 사용자가 오늘 해야 할 일을 먼저 보여줍니다.
- 지연 업무는 눈에 띄게 표시합니다.
- Task를 클릭하면 중앙 Main UI 또는 우측 Detail Panel이 해당 업무로 이동합니다.
- 권한 없는 Task는 표시하지 않습니다.
- Project, Department, Role 기준 필터가 가능해야 합니다.

## Template 호출 방식

좌측 하단도 Template으로 관리합니다.

Head별로 다른 Task Template을 호출할 수 있습니다.

예:

```text
CPQ Head
→ My Quote Tasks
→ Pending Customer Approval
→ Document Tasks
```

```text
ERP Head
→ My ERP Tasks
→ Purchase Follow-up
→ Material Delay
→ QC Waiting
```

```text
PLM Head
→ Drawing Review Tasks
→ Revision Tasks
→ Macro Approval Tasks
```

## 권한

관련 PermissionPoint:

- `task.view`
- `task.create`
- `task.assign`
- `task.update`
- `task.complete`
- `task.rule.manage`
- `schedule.view`
- `schedule.manage`
- `dashboard.view`
- `dashboard.configure`

## MVP 반영 범위

첫 구현에서는 다음을 준비합니다.

- My Tasks
- Pending Approval
- Delayed Tasks
- Basic Schedule
- Task 클릭 시 관련 화면 이동
- Dashboard용 기본 집계

자동 Task Rule은 구조만 준비하고, 초기에는 승인/업무 완료 이벤트 중심으로 시작합니다.

## 결정 사항

좌측 패널 하단에는 사용자 일정, 해야 할 일, 지연 업무, 승인 대기 등을 표시하는 Task/Schedule Template 영역을 둡니다.

ERP 업무 흐름에서 전 단계 완료 시 후속 담당자에게 자동 Task를 생성할 수 있도록 TaskRule 구조를 준비합니다.

Dashboard에서는 전체 Project와 담당 업무 진행 상황을 함께 표시합니다.

