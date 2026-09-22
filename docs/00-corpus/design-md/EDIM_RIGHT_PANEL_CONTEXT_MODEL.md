# EDIM Right Panel Context Model

이 문서는 EDIM Core Shell의 우측 패널이 어떤 기준으로 Template을 호출하는지 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 59~61페이지입니다.

## 핵심 결정

우측 패널은 고정된 정보창이 아닙니다.

상단 Head와 좌측 WorkHierarchy에서 선택된 항목, 그리고 중앙 Main UI에서 선택된 업무 대상에 따라 필요한 Sub Template을 호출합니다.

```text
Selected Head
→ Selected WorkHierarchy
→ Selected Main UI Template
→ Selected Entity / Row / Code / Document
→ Right Panel Template 호출
```

## 59~61페이지에서 확인되는 우측 패널 역할

59~61페이지에는 EDIM 우측 패널 또는 Sub Work Place에 들어갈 수 있는 성격의 정보가 많이 포함되어 있습니다.

주요 유형:

- Design Tool
- Coding List
- Table Management
- Data Upload
- Design Dimension
- Key Dimension
- Detail Dimension
- Arrangement Component
- Design Verification Macro
- Data Priority
- Assembling Sequence
- QC / Material / Manufacturing 관련 정보
- Code Relationship
- Sub Item List
- Document Code
- Drawing List
- BOM / Quotation / PCR / Drawing / Document
- EDIM Run Result
- Cost Calculation Result
- Technical Data Result

따라서 우측 패널은 단순 Detail 영역이 아니라, 선택된 업무의 보조 작업 공간입니다.

## Right Panel Accordion Group 후보

우측 패널은 Accordion 방식으로 구성합니다.

기본 Group 후보:

- Detail Information
- Design Tool
- Code Relationship
- Sub Item List
- BOM Result
- Cost / Price
- Quotation / PCR
- Drawing
- Document
- Technical Data
- Macro / Coding
- Table Management
- Approval
- Validation Result
- History / Audit Log

## Head별 우측 패널 예시

### CPQ

CPQ에서 제품 선택, 견적, 문서 작업을 할 때 우측 패널 후보:

- Product Detail
- Option / Specification
- Sub Item List
- BOM Preview
- Cost Table
- Quotation / PCR
- Document
- Approval
- History

### PLM

PLM에서 Code, Drawing, Design 작업을 할 때 우측 패널 후보:

- Code Detail
- Code Relationship
- Child Component
- Drawing Preview
- Design Tool
- Key Dimension
- Detail Dimension
- Macro / Coding
- Revision History
- Approval

### ERP

ERP에서 구매, 자재, 생산, 품질 작업을 할 때 우측 패널 후보:

- Request Detail
- Supplier / Price
- Material Flow
- Work Process
- Manufacturing Cost
- Quality Check
- Approval
- Related Documents
- History

### EDIM Toolbox

EDIM Toolbox에서 UI, Macro, Template을 설정할 때 우측 패널 후보:

- Template Properties
- Data Binding
- Action Binding
- Macro / Coding
- Flowchart
- Preview
- Permission
- Publish History

## Template 호출 기준

우측 패널 Template은 다음 조건을 조합하여 호출합니다.

- `head_id`
- `work_hierarchy_id`
- `main_template_id`
- `selected_entity_type`
- `selected_entity_id`
- `selected_row_id`
- `document_type`
- `approval_status`
- `run_status`
- `permission_point`

예:

```text
Head = PLM
WorkHierarchy = Code Management > Code Relationship
Main UI = Product Code Relationship
Selected Entity = Product Code

Right Panel:
- Code Detail
- Child Component
- Sub Item List
- Drawing
- Macro / Coding
- Approval
```

```text
Head = CPQ
WorkHierarchy = Quotation
Main UI = Quotation / PCR
Selected Entity = Quote

Right Panel:
- Quote Detail
- Cost Table
- Margin
- PCR
- Approval
- Document
- History
```

## 데이터 모델 후보

### RightPanelTemplateBinding

우측 패널에 어떤 Template을 표시할지 결정하는 연결 정보입니다.

주요 필드:

- `id`
- `tenant_id`
- `head_id`
- `work_hierarchy_id`
- `main_template_id`
- `entity_type`
- `template_id`
- `accordion_group`
- `sort_order`
- `default_open`
- `display_condition`
- `required_permission`
- `status`

### RightPanelState

사용자별 우측 패널 상태입니다.

주요 필드:

- `id`
- `tenant_id`
- `user_account_id`
- `workspace_state_id`
- `panel_width`
- `open_groups`
- `pinned_templates`
- `last_selected_template_id`
- `updated_at`

## UI 동작 원칙

- Head 선택 시 우측 패널 후보가 변경됩니다.
- WorkHierarchy 선택 시 우측 패널 구성이 더 구체화됩니다.
- 중앙 Main UI에서 행, 코드, 문서, 도면, 견적 등을 선택하면 우측 패널 내용이 해당 대상 기준으로 바뀝니다.
- 권한이 없는 Template은 표시하지 않습니다.
- 필요한 작업이 있으면 Accordion 제목에 Badge를 표시합니다.
- EDIM Run 결과, 승인 대기, 오류가 있는 항목은 접혀 있어도 상태를 표시합니다.

## MVP 반영 범위

첫 구현에서는 다음만 구현합니다.

- Head/WorkHierarchy에 따른 우측 Accordion Template 표시
- 중앙 선택 항목에 따른 Detail Panel 변경
- 기본 펼침 상태
- 권한 없는 항목 숨김

이후 확장:

- 사용자별 Panel 상태 저장
- Pin 기능
- Badge/알림
- Drag & Drop 순서 변경
- 조건부 표시 규칙 편집

## 결정 사항

우측 패널은 59~61페이지와 같은 작업 보조 정보, Code Relationship, Sub Item, Design Tool, EDIM Run 결과, Document/Approval 정보를 표시하는 Context Panel로 설계합니다.

호출 기준은 Head, WorkHierarchy, Main UI, 선택된 업무 대상입니다.

