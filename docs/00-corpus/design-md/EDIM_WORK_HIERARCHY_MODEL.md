# EDIM Work Hierarchy Model

이 문서는 EDIM Head 하부의 세부 항목 구조를 정의합니다.

## 핵심 결정

Head 하부의 세부 항목은 고정 메뉴가 아닙니다.

각 Head 아래에는 업무에 필요한 세부 항목을 제한 없이 추가할 수 있어야 합니다.

즉, EDIM의 업무 구조는 다음과 같은 무제한 Tree 구조입니다.

```text
Head
└─ Work Hierarchy Item
   └─ Work Hierarchy Item
      └─ Work Hierarchy Item
         └─ ...
```

## 예시

### CPQ

```text
CPQ
├─ Project
│  ├─ Project Registration
│  ├─ Customer Requirement
│  └─ Project Document
├─ Product Selection
│  ├─ AHU
│  │  ├─ Arrangement
│  │  ├─ Fan
│  │  └─ Document
│  └─ Fan
├─ BOM
├─ Quotation
│  ├─ PCR
│  └─ Final Quotation
└─ Approval Document
```

### PLM

```text
PLM
├─ Code Management
│  ├─ Sub Code
│  ├─ Product Code
│  ├─ Code Relationship
│  └─ Arrangement Code
├─ Drawing Management
│  ├─ Approval Drawing
│  ├─ Manufacturing Drawing
│  └─ Drawing Macro
├─ Product Management
└─ Work Process
```

### ERP

```text
ERP
├─ Sales
├─ Purchasing
│  ├─ Purchase Request
│  ├─ Supplier Quotation
│  └─ Purchase Order
├─ Material
│  ├─ Warehouse
│  ├─ Inventory
│  └─ Material Flow
├─ Manufacturing
│  ├─ Work Order
│  ├─ Process Management
│  └─ Production Schedule
└─ QC
```

## 관리 기능

각 세부 항목은 다음 기능을 가져야 합니다.

- 추가
- 이름 변경
- 설명 변경
- 상위 항목 변경
- 표시 순서 이동
- 삭제
- 비활성화
- 연결 Main UI Template 설정
- 연결 Sub Template 설정
- 연결 Toolbar 설정
- 필요 권한 설정

## 삭제와 비활성화

업무 데이터가 연결된 항목은 삭제하지 않고 비활성화하는 것을 원칙으로 합니다.

삭제 가능:

- 연결된 Project/Document/Macro/Template/Approval/Run 이력이 없는 항목

비활성화 권장:

- 연결된 업무 데이터가 있는 항목
- 과거 문서나 감사 로그에서 참조되는 항목
- Macro 또는 Template Binding에 사용된 항목

## 데이터 모델

### WorkHierarchy

Head 하부의 업무 항목입니다.

주요 필드:

- `id`
- `tenant_id`
- `head_id`
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
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### parent_id

`parent_id`를 사용해 무제한 계층 구조를 만듭니다.

최상위 항목은 `parent_id`가 없습니다.

### path

`path`는 빠른 조회와 표시를 위해 사용합니다.

예:

```text
/cpq/product-selection/ahu/arrangement
/plm/code-management/product-code
/erp/purchasing/purchase-order
```

### level

`level`은 화면 표시와 성능 최적화를 위해 사용합니다.

예:

```text
CPQ = Head
Product Selection = level 1
AHU = level 2
Arrangement = level 3
```

`level`은 제한을 의미하지 않습니다. UI 표시를 돕기 위한 값입니다.

## UI 표시 방식

좌측 Work Panel은 WorkHierarchy를 Tree로 표시합니다.

초기에는 다음 기능을 제공합니다.

- 펼치기/접기
- 항목 선택
- 권한 없는 항목 숨김
- 비활성화 항목 숨김
- 검색

관리자 모드에서는 다음 기능을 제공합니다.

- Drag & Drop 이동
- 새 항목 추가
- 이름 변경
- 비활성화
- Template 연결
- 권한 설정

## 권한

세부 항목에도 권한이 필요합니다.

관련 PermissionPoint:

- `work_hierarchy.view`
- `work_hierarchy.create`
- `work_hierarchy.update`
- `work_hierarchy.reorder`
- `work_hierarchy.move`
- `work_hierarchy.disable`
- `work_hierarchy.delete`
- `work_hierarchy.bind_template`

## 구현 주의사항

무제한 Tree 구조는 강력하지만, UI가 너무 복잡해질 수 있습니다.

따라서 데이터 구조는 무제한으로 허용하되, 화면에서는 다음을 고려합니다.

- 기본 표시 깊이는 2~3단계로 시작
- 깊은 항목은 검색과 펼치기로 접근
- 자주 쓰는 항목은 Toolbar 또는 Favorite으로 노출
- 관리 화면에서 전체 Tree를 편집

## MVP 반영 범위

첫 구현에서는 다음 기능만 만듭니다.

- Head별 WorkHierarchy Tree 조회
- WorkHierarchy 항목 추가
- 이름 변경
- 순서 이동
- 상위 항목 변경
- 비활성화
- 선택한 항목에 연결된 Main UI Template 호출

삭제 기능은 초기에는 제한적으로 제공하고, 연결 데이터 확인 후 허용합니다.

## 결정 사항

EDIM의 Head 하부 세부 항목은 깊이 제한 없는 Tree 구조로 설계합니다.

이 구조를 통해 회사별, 부서별, 업무별로 서로 다른 업무 체계를 구성할 수 있습니다.

