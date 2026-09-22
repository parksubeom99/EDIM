# EDIM Left Hierarchy Binding Model

이 문서는 EDIM Core Shell의 좌측 패널 Hierarchy를 Head에 연결하고 재사용하는 구조를 정의합니다.

## 핵심 결정

좌측 패널의 Hierarchy는 Head마다 달라질 수 있습니다.

동시에 여러 Head에서 공통으로 사용하는 Hierarchy도 존재할 수 있습니다.

따라서 Hierarchy는 다음 두 가지 방식으로 구분합니다.

```text
1. Direct Hierarchy
   Head 항목을 선택해서 직접 만들고 편집하는 Hierarchy

2. Referenced Hierarchy
   이미 만들어진 공통 Hierarchy를 Head에 호출/연결해서 사용하는 Hierarchy
```

## 왜 분리해야 하는가

Head 아래에 모든 Hierarchy를 직접 만들면 중복이 많아집니다.

예:

- Project
- Document
- Approval
- File Folder
- Recent Work
- Favorite Work
- Setup

이런 구조는 CPQ, PLM, ERP, EDIM Toolbox에서 공통으로 사용할 수 있습니다.

반대로 CPQ Selection, PLM Code Management, ERP Purchasing처럼 특정 Head에만 필요한 구조도 있습니다.

따라서 공통 구조는 재사용하고, Head 전용 구조는 직접 편집할 수 있게 분리합니다.

## Hierarchy 사용 방식

### 1. Head-Owned Hierarchy

특정 Head에 직접 속한 Hierarchy입니다.

예:

```text
CPQ
├─ Product Selection
├─ BOM
├─ Quotation
└─ Document
```

특징:

- 해당 Head에서 직접 추가/수정/삭제/이동 가능
- 다른 Head에 영향 없음
- Head 전용 업무에 적합

### 2. Shared Hierarchy

여러 Head에서 공통으로 호출할 수 있는 Hierarchy입니다.

예:

```text
Common Project
├─ Project Folder
├─ Project Document
├─ Approval
└─ History
```

특징:

- 하나의 공통 Hierarchy를 여러 Head에서 호출
- 원본을 수정하면 연결된 Head에 반영 가능
- 공통 업무 구조에 적합

### 3. Copied Hierarchy

공통 Hierarchy를 복사해서 Head 전용으로 바꾼 구조입니다.

특징:

- 처음에는 공통 구조를 복사
- 복사 후에는 독립적으로 편집
- 원본 변경이 반영되지 않음

이 방식은 “기본 구조는 가져오되, 특정 Head에서 많이 바꿔야 하는 경우”에 적합합니다.

### 4. Referenced With Override

공통 Hierarchy를 호출하되 Head별로 일부 표시 조건만 다르게 설정하는 방식입니다.

예:

- 이름만 다르게 표시
- 특정 항목 숨김
- 순서 변경
- 기본 Open/Close 상태 변경
- 연결 Template만 다르게 설정

## 추천 방식

EDIM에서는 다음 네 가지 모드를 지원하는 것이 좋습니다.

```text
owned      = Head에서 직접 생성/편집
shared     = 공통 Hierarchy 원본
referenced = 공통 Hierarchy를 호출
copied     = 공통 Hierarchy를 복사 후 독립 편집
```

좌측 패널은 선택된 Head에 대해 다음을 조합해서 표시합니다.

```text
Head-Owned Hierarchy
+ Referenced Shared Hierarchy
+ User Favorite / Recent Work
```

## 데이터 모델 후보

### HierarchyDefinition

Hierarchy 묶음의 원본 정의입니다.

주요 필드:

- `id`
- `tenant_id`
- `code`
- `name`
- `description`
- `hierarchy_scope`
- `status`
- `version`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

`hierarchy_scope` 예:

- `head_owned`
- `shared`
- `system`

### HierarchyNode

Hierarchy의 실제 항목입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_definition_id`
- `parent_id`
- `code`
- `name`
- `description`
- `path`
- `level`
- `sort_order`
- `status`
- `default_main_template_id`
- `default_sub_template_id`
- `required_permission`

### HeadHierarchyBinding

Head와 HierarchyDefinition의 연결 정보입니다.

주요 필드:

- `id`
- `tenant_id`
- `head_id`
- `hierarchy_definition_id`
- `binding_mode`
- `mount_parent_node_id`
- `sort_order`
- `default_open`
- `display_condition`
- `required_permission`
- `status`

`binding_mode` 예:

- `owned`
- `referenced`
- `copied`

### HierarchyNodeOverride

Referenced Hierarchy를 Head별로 다르게 표시하기 위한 Override입니다.

주요 필드:

- `id`
- `tenant_id`
- `head_hierarchy_binding_id`
- `hierarchy_node_id`
- `display_name`
- `sort_order`
- `hidden`
- `disabled`
- `default_open`
- `main_template_id`
- `sub_template_id`
- `required_permission`

## UI 관리 방식

관리자는 Head를 선택한 후 좌측 Hierarchy를 관리합니다.

관리 화면에서 선택 가능한 동작:

- 새 Hierarchy 직접 만들기
- 공통 Hierarchy 호출
- 공통 Hierarchy 복사
- 호출된 Hierarchy의 표시 조건 편집
- 항목 추가
- 항목 이름 변경
- 항목 이동
- 항목 비활성화
- Template 연결
- 권한 설정

## 호출 관계 설정

Head마다 어떤 Hierarchy를 호출할지 미리 설정할 수 있어야 합니다.

예:

```text
Head: CPQ
Called Hierarchy:
- Common Project
- Common Approval
- CPQ Product Selection
- CPQ Quotation
```

```text
Head: PLM
Called Hierarchy:
- Common Project
- Common Document
- PLM Code Management
- PLM Drawing Management
```

## 편집 권한 구분

직접 만든 Hierarchy와 호출된 Hierarchy는 편집 권한이 다릅니다.

### Direct / Owned

- 항목 추가 가능
- 항목 삭제 가능
- 상위 항목 변경 가능
- Template 연결 변경 가능

### Referenced

- 원본 항목 직접 삭제 불가
- Head별 숨김/표시 가능
- Head별 순서 Override 가능
- Head별 Template Override 가능

### Shared 원본

- 공통 Hierarchy 관리자만 수정 가능
- 수정 시 연결된 Head에 영향 가능
- 변경 전 영향 범위 확인 필요

## MVP 반영 범위

첫 구현에서는 다음 기능만 만듭니다.

- Head별 Hierarchy 조회
- Head-Owned Hierarchy 직접 생성
- Shared Hierarchy 생성
- Head에 Shared Hierarchy 연결
- 연결된 Hierarchy 표시
- 항목 추가/수정/이동/비활성화

Override, 복사, 영향 범위 분석은 이후 단계에서 확장합니다.

## 결정 사항

좌측 패널 Hierarchy는 직접 생성하는 구조와 공통 Hierarchy를 호출하는 구조를 분리합니다.

Head는 여러 HierarchyDefinition을 Binding해서 좌측 패널을 구성합니다.

