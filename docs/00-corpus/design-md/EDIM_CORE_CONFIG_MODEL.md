# EDIM Core Configuration Model

이 문서는 EDIM Core Shell을 구성하기 위한 설정 데이터 모델 초안입니다.

## 기본 방향

EDIM의 Head, Hierarchy, Template, Toolbar는 코드에 고정하지 않습니다.

개발자 또는 Platform Admin이 설정 데이터로 관리할 수 있어야 합니다.

초기에는 개발자가 관리하는 설정 화면으로 시작하고, 이후 회사 관리자 또는 권한 있는 사용자가 직접 설정할 수 있도록 확장합니다.

## Head

상단 업무 Head입니다.

예:

- Sales
- Tech
- CPQ
- PLM
- ERP
- Purchasing
- Material
- Product
- QC
- Finance
- HR
- Company Info
- EDIM Toolbox

주요 필드:

- `id`
- `tenant_id`
- `code`
- `name`
- `description`
- `icon`
- `color`
- `sort_order`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

상태값:

- `active`
- `inactive`
- `draft`
- `archived`

## Head 관리 규칙

### 추가

새 Head를 추가하면 다음 기본 설정을 함께 만들 수 있어야 합니다.

- 기본 Hierarchy
- 기본 Main UI Template
- 기본 Sub Template
- 기본 Toolbar
- 기본 권한

### 이동

Head 이동은 `sort_order` 변경으로 처리합니다.

업무 데이터는 이동하지 않습니다.

### 삭제

Head 삭제는 신중해야 합니다.

연결 데이터가 있으면 실제 삭제 대신 `inactive` 또는 `archived` 상태로 전환합니다.

연결 확인 대상:

- Work Hierarchy
- UI Template Binding
- Toolbar Item
- Macro
- Document Template
- Approval Workflow
- Project 업무 이력
- Audit Log

## WorkHierarchy

Head별 좌측 업무 계층입니다.

주요 필드:

- `id`
- `tenant_id`
- `head_id`
- `parent_id`
- `code`
- `name`
- `description`
- `sort_order`
- `status`
- `required_permission`

## UiTemplate

중앙 Main UI 또는 우측 Sub Template입니다.

주요 필드:

- `id`
- `tenant_id`
- `template_type`
- `code`
- `name`
- `description`
- `schema`
- `layout`
- `status`
- `version`

Template 유형:

- `main_ui`
- `sub_ui`
- `toolbar`
- `document`
- `print_form`
- `macro`
- `chart`
- `table`

## TemplateBinding

Head, Hierarchy, Main UI, Sub Template의 연결 정보입니다.

주요 필드:

- `id`
- `tenant_id`
- `head_id`
- `hierarchy_id`
- `main_template_id`
- `sub_template_id`
- `toolbar_id`
- `context_rule`
- `sort_order`
- `status`

## ToolbarItem

Head별 업무 바로가기입니다.

주요 필드:

- `id`
- `tenant_id`
- `head_id`
- `code`
- `name`
- `icon`
- `sort_order`
- `target_hierarchy_id`
- `target_main_template_id`
- `target_sub_template_id`
- `required_permission`
- `status`

## Permission

Head와 Template은 권한에 따라 보이거나 숨겨져야 합니다.

권한 확인 단위:

- Head 접근 권한
- Hierarchy 접근 권한
- Template 보기 권한
- Template 수정 권한
- EDIM Run 실행 권한
- 승인 권한
- 설정 변경 권한

## MVP 반영 범위

첫 구현에서는 다음만 만듭니다.

- Head 목록 조회
- Head 추가
- Head 이름 변경
- Head 표시 순서 이동
- Head 비활성화
- Head 선택 시 좌측 Hierarchy 변경
- Hierarchy 선택 시 중앙 Main UI 변경
- 중앙 선택 항목에 따라 우측 Sub Template 변경

실제 사용자 제작 UI는 이후 단계에서 확장합니다.

