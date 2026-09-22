# EDIM Hierarchy Address and Code Model

이 문서는 EDIM에서 Hierarchy가 단순 화면 메뉴가 아니라 DB Address 역할을 하는 핵심 구조임을 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 29~35페이지입니다.

## 핵심 결정

EDIM의 Hierarchy는 화면 탐색용 메뉴가 아닙니다.

Hierarchy는 데이터가 어디에 속하는지, 어떤 업무/제품/코드/문서/도면과 연결되는지 나타내는 `Data Address`입니다.

따라서 Hierarchy 관리는 EDIM에서 가장 중요한 Core 기능 중 하나입니다.

```text
Hierarchy = Data Address + Work Address + Template Address + Permission Address
```

## 29~35페이지의 핵심 의미

29~35페이지는 EDIM의 데이터 구조에서 매우 중요한 부분입니다.

주요 내용:

- Sub Code DB Registration
- Code Set-Up
- Material Code & Purchase Items Registration
- Product Code Registration
- Product Code Relationship
- Arrangement Code Registration
- Arrangement Drawing Control
- Sub Code
- Product Code
- Code Relationship
- Arrangement Code
- Arrangement Set-Up
- Drawing / DWG 연결
- Table 참조
- Variant / Tech / Material Table

이 내용은 단순한 설정 화면이 아니라 EDIM의 제품 데이터 저장 방식입니다.

## Hierarchy의 역할

Hierarchy는 다음 역할을 동시에 수행합니다.

### 1. 데이터 주소

데이터가 어느 업무/제품/부품/문서 영역에 속하는지 나타냅니다.

예:

```text
/plm/code-management/sub-code/fan/material
/plm/code-management/product-code/ahu/centrifugal/casing/double
/cpq/product-selection/ahu/arrangement
```

### 2. 코드 주소

Sub Code, Product Code, Arrangement Code가 어느 그룹에 속하는지 나타냅니다.

예:

```text
Fan > Centrifugal > Casing > Double
Material > Motor > AC > 3 Phase
AHU > Arrangement > Horizontal > Double Deck
```

### 3. Template 주소

선택된 Hierarchy에 따라 어떤 Main UI, Sub Template, Table, Macro, Document를 호출할지 결정합니다.

### 4. 권한 주소

사용자가 어떤 Head/Hierarchy/Code/Table/Document에 접근할 수 있는지 판단하는 기준입니다.

### 5. EDIM Run 주소

BOM Run, Drawing Run, Cost Run, Document Run이 어떤 데이터와 Template을 사용할지 찾는 기준입니다.

## 코드 구조의 기본 개념

EDIM Code는 제품 속성을 코드화하고, 이 코드가 BOM, 도면, 견적, 문서, 제조정보를 연결합니다.

주요 코드 유형:

- Sub Code
- Material Code
- Purchase Item Code
- Product Code
- Arrangement Code
- Document Code
- Drawing Code
- Work Process Code

## 29~35페이지 기준 데이터 흐름

```text
Sub Code Registration
→ Product Code Registration
→ Product Code Relationship
→ Arrangement Code Registration
→ Arrangement Set-Up
→ Drawing / Table / Macro 연결
→ EDIM Run
```

## 주요 엔티티 후보

### HierarchyDefinition

Hierarchy 묶음입니다.

예:

- PLM Code Management
- CPQ Product Selection
- Common Project
- Common Document

### HierarchyNode

실제 주소 항목입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_definition_id`
- `parent_id`
- `code`
- `name`
- `path`
- `node_type`
- `address_key`
- `sort_order`
- `status`
- `required_permission`

`node_type` 예:

- `work`
- `product_group`
- `sub_code_group`
- `material_group`
- `product_code_group`
- `arrangement_group`
- `document_group`
- `drawing_group`
- `table_group`
- `run_context`

### CodeGroup

코드 그룹입니다.

예:

- Fan
- Material
- Supplied Product
- Specification
- AHU
- Centrifugal
- Casing
- Single
- Double

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `code`
- `name`
- `description`
- `code_type`
- `status`

### CodeDefinition

Sub Code, Product Code, Arrangement Code 등의 실제 코드 정의입니다.

주요 필드:

- `id`
- `tenant_id`
- `code_group_id`
- `code_type`
- `code`
- `name`
- `description`
- `attributes`
- `status`
- `version`

`code_type` 예:

- `sub_code`
- `material_code`
- `purchase_item_code`
- `product_code`
- `arrangement_code`
- `document_code`
- `drawing_code`

### CodeAttribute

코드의 속성 정의입니다.

예:

- A: Fan Model
- B: Fan Size
- C: Material
- D: Bearing Type
- E: FF
- F: Supplier
- G: Price

주요 필드:

- `id`
- `tenant_id`
- `code_group_id`
- `attribute_key`
- `name`
- `description`
- `value_type`
- `unit`
- `sort_order`

### CodeRelationship

Product Code와 Sub Code, Material Code, Drawing, Table, Macro의 관계를 정의합니다.

주요 필드:

- `id`
- `tenant_id`
- `parent_code_id`
- `child_code_id`
- `relationship_type`
- `quantity`
- `condition_rule`
- `sort_order`
- `status`

`relationship_type` 예:

- `bom_child`
- `material`
- `drawing`
- `document`
- `macro`
- `table`
- `work_process`

### ArrangementDefinition

Arrangement Code와 도면/설계 기준을 연결합니다.

주요 필드:

- `id`
- `tenant_id`
- `arrangement_code_id`
- `name`
- `description`
- `drawing_file_id`
- `design_rule`
- `macro_id`
- `status`

## Hierarchy와 코드의 연결 원칙

모든 CodeGroup은 HierarchyNode에 연결됩니다.

```text
HierarchyNode
→ CodeGroup
→ CodeDefinition
→ CodeRelationship
```

이렇게 해야 데이터의 위치와 의미가 명확해집니다.

## Hierarchy Address 규칙

각 HierarchyNode는 고유한 Address를 가져야 합니다.

예:

```text
edim://tenant/{tenant_id}/plm/code-management/product-code/ahu/centrifugal/casing/double
```

또는 내부적으로:

```text
tenant_id + hierarchy_definition_id + path
```

Address는 다음 용도로 사용합니다.

- 데이터 조회
- Template 호출
- 권한 판정
- EDIM Run Context 결정
- Audit Log 위치 기록
- Document/Drawing 연결

## 관리 중요도

Hierarchy는 다음 이유로 가장 엄격히 관리해야 합니다.

- 데이터 저장 위치를 결정합니다.
- 코드 관계와 BOM 생성 기준을 결정합니다.
- 도면/문서/테이블/Macro 연결 기준이 됩니다.
- 권한과 승인 범위에 영향을 줍니다.
- 잘못 이동하거나 삭제하면 기존 데이터 참조가 깨질 수 있습니다.

## 변경 관리 원칙

HierarchyNode 변경 시 다음을 확인해야 합니다.

- 연결된 CodeGroup
- 연결된 CodeDefinition
- 연결된 Template
- 연결된 Macro
- 연결된 Document/Drawing
- 연결된 Approval Workflow
- 연결된 Audit Log
- 진행 중인 EDIM Run

데이터가 연결된 Node는 삭제보다 비활성화합니다.

이동이 필요한 경우 Address 변경 이력을 남겨야 합니다.

## MVP 반영 범위

첫 구현에서는 다음을 준비합니다.

- HierarchyNode에 `path`, `node_type`, `address_key` 추가
- CodeGroup과 HierarchyNode 연결
- Product Code / Sub Code / Arrangement Code 기본 등록
- CodeRelationship 기본 구조
- 삭제 대신 비활성화
- Hierarchy 변경 Audit Log

## 결정 사항

EDIM의 Hierarchy는 DB Address 역할을 한다.

29~35페이지의 Code Set-Up 구조는 EDIM 데이터 모델의 핵심이며, Hierarchy와 CodeGroup/CodeDefinition/CodeRelationship으로 관리한다.

