# EDIM Core Foundation Modules

이 문서는 CPQ, PLM, ERP를 붙이기 전에 EDIM Core에 반드시 준비해야 할 공통 기반 모듈을 정의합니다.

## 핵심 방향

EDIM은 단순 업무 화면의 묶음이 아니라, 모든 업무 모듈이 공통으로 사용하는 플랫폼입니다.

따라서 CPQ, PLM, ERP를 본격 구현하기 전에 다음 기반 모듈을 먼저 설계하고 단계적으로 구현합니다.

```text
EDIM Core Shell
├─ Workspace Context
├─ Template Registry
├─ Work Hierarchy
├─ Permission
├─ Tenant Branding
├─ Approval & Report
├─ File / Document / Drawing
├─ Data Dictionary / Custom Field
├─ Audit Log / History
├─ Notification / Task Inbox
├─ EDIM Run Job Engine
└─ Accordion Panel UI
```

## 1. Workspace Context

사용자의 현재 작업 위치와 업무 상태를 관리합니다.

필요한 이유:

- 사용자가 어느 회사, 프로젝트, Head, Hierarchy, Template에서 작업 중인지 알아야 합니다.
- 다시 로그인했을 때 마지막 작업 위치로 돌아갈 수 있어야 합니다.
- 여러 프로젝트와 여러 회사에 속한 사용자의 혼동을 막아야 합니다.

관리 대상:

- Current Tenant
- Current Project
- Current Head
- Current WorkHierarchy
- Current Main UI Template
- Current Sub Template
- Open Panels
- Last Workspace State

주요 엔티티 후보:

- `workspace_sessions`
- `workspace_states`
- `recent_workspaces`
- `favorite_work_items`

## 2. Template Registry

EDIM의 모든 Template을 등록하고 버전 관리합니다.

Template 종류:

- Main UI Template
- Sub UI Template
- Toolbar Template
- Document Template
- Print Form Template
- Macro Template
- Chart Template
- Table Template
- Accordion Panel Template

필요 기능:

- Template 등록
- Draft / Published / Archived 상태 관리
- Version 관리
- Rollback
- Template 복사
- Template 권한
- Template 사용 이력

주요 엔티티 후보:

- `template_definitions`
- `template_versions`
- `template_bindings`
- `template_publish_logs`

## 3. Data Dictionary / Custom Field

회사별 필드, 테이블, 코드값, 단위, 속성값을 관리합니다.

필요한 이유:

- EDIM은 사용자 자율 커스터마이징을 목표로 합니다.
- 회사마다 필요한 필드와 데이터 항목이 다릅니다.
- CPQ, PLM, ERP에서 사용하는 데이터 정의를 공통으로 관리해야 합니다.

관리 대상:

- Custom Field
- Custom Table
- Code Set
- Unit
- Property
- Attribute
- Option Value
- Validation Rule

주요 엔티티 후보:

- `data_dictionaries`
- `custom_field_definitions`
- `custom_field_values`
- `code_sets`
- `code_values`
- `unit_definitions`
- `validation_rules`

## 4. File / Document / Drawing Management

파일, 문서, 도면, 첨부자료를 공통 관리합니다.

필요한 이유:

- EDIM은 도면, 승인도서, 기술자료, 견적서, 첨부파일을 모두 다룹니다.
- 파일은 Project, Code, BOM, Quote, Approval, Macro와 연결될 수 있습니다.
- 문서와 도면은 버전과 승인 상태가 중요합니다.

관리 대상:

- File Asset
- Folder
- Document
- Drawing
- Preview
- Revision
- Permission
- Download History

주요 엔티티 후보:

- `file_assets`
- `file_links`
- `document_records`
- `drawing_records`
- `document_versions`
- `drawing_versions`
- `file_access_logs`

## 5. Audit Log / History

중요한 변경 이력을 모두 기록합니다.

필요한 이유:

- SaaS와 제조 업무에서는 추적성이 중요합니다.
- 누가 언제 어떤 데이터를 변경했는지 남겨야 합니다.
- 승인, 견적, 도면, Macro, Template 변경은 반드시 이력이 필요합니다.

기록 대상:

- Login
- Permission 변경
- Head / Hierarchy 변경
- Template 변경
- Macro 변경
- Approval 결정
- EDIM Run 실행
- BOM 변경
- Quote 변경
- Drawing 변경
- Document 생성/수정/삭제

주요 엔티티 후보:

- `audit_logs`
- `entity_histories`
- `change_snapshots`
- `activity_logs`

## 6. Notification / Task Inbox

사용자가 처리해야 할 업무와 알림을 관리합니다.

필요한 이유:

- 승인 요청, 반려, EDIM Run 완료, 지연 업무를 사용자에게 알려야 합니다.
- 54페이지의 보고/승인 구조와 직접 연결됩니다.
- 사용자는 EDIM에 들어왔을 때 “내가 해야 할 일”을 바로 봐야 합니다.

관리 대상:

- Approval Task
- Report Task
- Review Task
- EDIM Run Result
- Due Date
- Delayed Task
- Mention / Comment
- System Notice

주요 엔티티 후보:

- `notifications`
- `task_inbox_items`
- `task_assignments`
- `notification_preferences`

## 7. EDIM Run Job Engine

BOM, 도면, 원가, 견적, 문서 생성 작업을 실행하고 상태를 관리합니다.

필요한 이유:

- EDIM Run은 시간이 걸릴 수 있습니다.
- 실패, 재시도, 로그, 결과 파일 저장이 필요합니다.
- 사용자는 실행 결과와 진행 상태를 확인해야 합니다.

Run 종류:

- BOM Run
- Cost Run
- Pricing Run
- Drawing Run
- Document Run
- Technical Data Run
- Macro Run

작업 상태:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`
- `retrying`

주요 엔티티 후보:

- `run_jobs`
- `run_job_steps`
- `run_job_logs`
- `run_job_results`
- `run_job_files`

## 8. Accordion Panel UI

좌측과 우측 패널은 선택된 Head/Hierarchy 항목에 설정된 Template을 Accordion 방식으로 표시합니다.

필요한 이유:

- EDIM은 한 화면에 많은 정보와 보조 기능이 필요합니다.
- 모든 Sub Template을 한 번에 펼치면 화면이 복잡해집니다.
- Accordion 방식은 사용자가 필요한 영역만 열어 작업할 수 있게 합니다.

적용 위치:

- Left Work Panel
- Right Sub Template Panel
- Detail / Tool Panel
- Report / Approval Panel
- Macro / Table / Chart Panel

기본 동작:

- Template Group별 접기/펼치기
- 기본 Open Panel 설정
- 사용자별 마지막 Open 상태 저장
- 권한 없는 Panel 숨김
- 비활성 Template 숨김
- Head/Hierarchy 선택 시 Accordion 구성이 변경됨

주요 엔티티 후보:

- `accordion_groups`
- `accordion_items`
- `accordion_template_bindings`
- `user_panel_states`

## MVP 우선순위

1차 구현에 포함할 최소 범위:

1. Workspace Context
2. Head / WorkHierarchy
3. Template Registry 기본 구조
4. Permission 기본 구조
5. Tenant Branding
6. Accordion Panel UI
7. Audit Log 기본 구조

2차 구현:

1. Approval & Report
2. Task Inbox
3. File / Document / Drawing
4. EDIM Run Job Engine

3차 구현:

1. Data Dictionary / Custom Field
2. Advanced Template Versioning
3. Advanced Permission Scope
4. Advanced Approval Workflow
5. Macro / AI Run Engine

## 개발 순서

```text
1. Login / Tenant / Membership
2. EDIM Core Shell
3. Tenant Branding
4. Head Management
5. WorkHierarchy Tree
6. Template Registry
7. Accordion Panels
8. Permission Check
9. Workspace Context 저장
10. 첫 CPQ 화면 연결
```

## 결정 사항

EDIM은 CPQ부터 직접 만들지 않고, 먼저 공통 기반 모듈을 준비합니다.

그 위에 CPQ를 첫 번째 업무 모듈로 연결합니다.

