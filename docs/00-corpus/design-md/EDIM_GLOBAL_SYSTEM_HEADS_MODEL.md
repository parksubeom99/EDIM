# EDIM Global and System Heads Model

이 문서는 EDIM의 Head 중 프로그램 전체에 영향을 미치거나 관리에 필요한 Head를 정의합니다.

## 핵심 결정

Head는 CPQ, PLM, ERP 같은 업무 Head만 포함하지 않습니다.

EDIM 전체 운영, 설정, 보안, 권한, Template, Hierarchy, 승인, 파일, 알림, Run Job을 관리하기 위한 System/Admin Head도 필요합니다.

Head 선택 시 해당 Head와 관계를 맺어 놓은 Template이 좌측, 중앙, 우측에 호출됩니다.

```text
Head 선택
→ Left Hierarchy / Task Template 호출
→ Center Main UI Template 호출
→ Right Sub Template 호출
```

## Head 분류

### 1. Business Head

실제 업무 수행을 위한 Head입니다.

예:

- CPQ
- PLM
- ERP
- Sales
- Tech
- Purchasing
- Material
- Manufacturing
- QC
- A/S
- Finance
- HR

### 2. System / Admin Head

EDIM 전체 설정과 관리를 위한 Head입니다.

예:

- System Setup
- Company Info
- User & Permission
- Head / Hierarchy Management
- Template Registry
- Data Dictionary
- Approval Workflow
- File / Document / Drawing Management
- Task / Schedule / Dashboard
- EDIM Run Monitor
- Audit / History
- Notification
- Integration
- Security
- Tenant Branding
- AI / Macro Admin

## 추천 초기 Head 구성

초기 EDIM Core에서는 너무 많은 Head를 한 번에 노출하지 않습니다.

초기 기본 Head:

- CPQ
- PLM
- ERP
- EDIM Toolbox
- Company Info
- System Setup

`System Setup` 안에서 다음 항목을 Hierarchy로 관리합니다.

```text
System Setup
├─ User & Permission
├─ Tenant Branding
├─ Head Management
├─ Hierarchy Management
├─ Template Registry
├─ Data Dictionary
├─ Approval Workflow
├─ File / Document / Drawing
├─ Task / Schedule / Dashboard
├─ EDIM Run Monitor
├─ Audit / History
├─ Notification
├─ Integration
├─ Security
└─ AI / Macro Admin
```

이후 특정 관리 기능이 커지면 독립 Head로 분리할 수 있습니다.

예:

```text
System Setup > Approval Workflow
```

가 커지면:

```text
Approval
```

이라는 별도 Head로 승격할 수 있습니다.

## Head에 추가해야 할 전체 관리 기능

### User & Permission

관리 대상:

- 사용자 계정
- 회사별 Membership
- 부서
- Role
- PermissionPoint
- PermissionGrant
- 초대/승인/정지

### Tenant Branding

관리 대상:

- 회사명
- 로고
- 작은 로고
- 문서용 로고
- 대표 색상
- 회사 주소/전화번호/이메일

### Head Management

관리 대상:

- Head 추가
- Head 이름 변경
- Head 이동
- Head 비활성화
- Head별 기본 Template 연결
- Head별 권한

### Hierarchy Management

관리 대상:

- Head-Owned Hierarchy
- Shared Hierarchy
- Hierarchy Binding
- Hierarchy Address
- HierarchyAssetLink
- Path 변경 이력

### Template Registry

관리 대상:

- Main UI Template
- Sub UI Template
- Accordion Panel Template
- Toolbar Template
- Document Template
- Print Form Template
- Table Template
- Chart Template
- Macro Template
- Template Version

### Data Dictionary

관리 대상:

- Custom Field
- Custom Table
- Code Set
- Code Value
- Unit
- Attribute
- Validation Rule

### Approval Workflow

관리 대상:

- Workflow Definition
- Workflow Version
- Approval Step
- 승인자 지정 방식
- 조건부 승인
- 반려/재상신 규칙
- 보안 등급

### File / Document / Drawing Management

관리 대상:

- FileAsset
- DocumentRecord
- DrawingRecord
- Revision
- Preview
- Folder
- 접근 권한

### Task / Schedule / Dashboard

관리 대상:

- Task Rule
- Task Inbox Template
- Schedule Event
- Dashboard Widget
- 지연 업무 규칙
- 후속 업무 자동 생성 규칙

### EDIM Run Monitor

관리 대상:

- BOM Run
- Drawing Run
- Cost Run
- Pricing Run
- Document Run
- Macro Run
- Run Job Log
- 실패/재시도

### Audit / History

관리 대상:

- Audit Log
- Entity History
- Change Snapshot
- Activity Log
- 변경 전후 비교

### Notification

관리 대상:

- 알림 규칙
- 이메일/앱 알림
- 승인 요청 알림
- 지연 업무 알림
- EDIM Run 결과 알림

### Integration

관리 대상:

- ERP 외부 연계
- CAD/도면 연계
- API
- Webhook
- File Import/Export
- Excel 연계

### Security

관리 대상:

- 보안 등급
- 문서 접근 권한
- IP 제한
- 세션 정책
- 2FA
- 데이터 보존 정책

### AI / Macro Admin

관리 대상:

- AI 학습자료
- Macro 생성 권한
- Macro 승인
- Macro 실행 권한
- Prompt Template
- AI 사용 로그

## Template 호출 원칙

모든 Head는 좌측, 중앙, 우측 Template Binding을 가집니다.

예:

```text
Head: System Setup
Left: System Setup Hierarchy
Center: Selected Setup Main UI
Right: Setting Detail / Permission / History
```

```text
Head: CPQ
Left: CPQ Hierarchy + My Quote Tasks
Center: Product Selection / Quotation / Document UI
Right: Cost / BOM / Approval / History
```

## 권한 원칙

System/Admin Head는 일반 사용자에게 숨깁니다.

관리 기능은 다음 권한으로 제어합니다.

- `system.setup.view`
- `system.setup.manage`
- `user.manage`
- `permission.manage`
- `head.manage`
- `hierarchy.manage`
- `template.manage`
- `approval.workflow.manage`
- `audit.view`
- `security.manage`

## MVP 반영 범위

첫 구현에서는 다음 Head를 준비합니다.

- CPQ
- PLM
- ERP
- EDIM Toolbox
- Company Info
- System Setup

`System Setup`에는 다음 항목만 우선 포함합니다.

- User & Permission
- Tenant Branding
- Head Management
- Hierarchy Management
- Template Registry
- Audit / History

나머지는 구조만 열어두고 이후 단계에서 추가합니다.

## 결정 사항

EDIM Head는 업무 Head와 System/Admin Head로 구분합니다.

프로그램 전체에 영향을 주는 설정과 관리 기능은 `System Setup` Head 아래에 우선 배치하고, 기능이 커지면 독립 Head로 분리할 수 있게 합니다.

