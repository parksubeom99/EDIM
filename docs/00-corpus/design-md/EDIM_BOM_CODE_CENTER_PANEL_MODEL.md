# EDIM BOM Code Center Panel Model

이 문서는 EDIM 중앙 Main Panel에 설치될 `BOM CODE` 화면과 자동 BOM 생성 구조를 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 29~35페이지이며, EDIM의 RCCS(Code Relationship)와 자동 BOM 생성의 핵심 화면입니다.

## 핵심 결정

BOM CODE는 단순 BOM List 화면이 아닙니다.

BOM CODE는 제품 선택, Code Relationship, Sub Item, Material, Drawing, Table, Macro, Work Process를 연결하여 자동 BOM을 생성하는 중심 구조입니다.

```text
Product / Arrangement Selection
→ Product Code
→ Code Relationship
→ Sub Code / Material Code / Purchase Item
→ BOM Code Run
→ BOM / Part List / Cost / Drawing / Document
```

## 중앙 Panel의 역할

BOM CODE 중앙 Panel은 사용자가 Code Relationship과 BOM 생성 조건을 설정하고 검토하는 Main UI입니다.

주요 역할:

- Product Code 조회/선택
- Sub Code 등록/호출
- Material Code 연결
- Purchase Item 연결
- Arrangement Code 연결
- Code Relationship 설정
- BOM Run Test
- BOM 생성 결과 확인
- 조건부 BOM 규칙 설정
- 관련 Drawing / Table / Macro 연결 상태 확인

## BOM CODE 화면 기본 구성

```text
┌──────────────────────────────────────────────────────────────┐
│ BOM CODE Header                                               │
│ Product Group / Product Code / Arrangement / Status / Version │
├──────────────────────────────────────────────────────────────┤
│ Code Structure Area                                           │
│ Product Code 속성, Code Segment, Option, Attribute             │
├──────────────────────────────────────────────────────────────┤
│ Relationship Builder                                          │
│ Parent Code → Child Code / Sub Item / Material / Drawing       │
├──────────────────────────────────────────────────────────────┤
│ BOM Run Preview                                               │
│ 생성될 BOM / Part List / Quantity / Condition / Source         │
├──────────────────────────────────────────────────────────────┤
│ Action Area                                                   │
│ Save / Validate / BOM Run Test / Request Approval / Publish    │
└──────────────────────────────────────────────────────────────┘
```

## 중앙 Panel 주요 영역

### 1. BOM CODE Header

현재 작업 중인 Code Context를 표시합니다.

표시 항목:

- Tenant
- Head
- Hierarchy Address
- Product Group
- Product Code
- Arrangement Code
- Version
- Status
- Approval Status
- Last Updated

### 2. Code Structure Area

제품 Code의 구성 요소를 표시합니다.

예:

```text
KAD - [A] [B] [C] [D] [E] [F]

A: Fan Model
B: Fan Size
C: Material
D: Bearing Type
E: FF
F: Supplier / Option
```

필요 기능:

- Code Segment 정의
- Attribute 정의
- Option Value 정의
- 필수/선택 여부
- 조합 가능 조건
- 표시명 설정
- 단위 설정

### 3. Relationship Builder

Product Code와 Child Code의 관계를 설정합니다.

관계 유형:

- BOM Child
- Sub Item
- Material
- Purchase Item
- Drawing
- Document
- Table
- Macro
- Work Process
- QC Check

각 관계는 조건을 가질 수 있습니다.

예:

```text
IF Fan Size >= 630 THEN Reinforce Frame 추가
IF Material = SUS THEN SUS Bolt Set 사용
IF FF = YES THEN Inlet Cone With FF 사용
```

### 4. BOM Run Preview

BOM Run 전에 생성될 결과를 미리 보여줍니다.

표시 항목:

- No.
- Parent Code
- Child Code
- Item Name
- Quantity
- Unit
- Source Relationship
- Condition Result
- Material
- Drawing Link
- Macro Link
- Cost Source
- Validation Status

### 5. Validation Summary

BOM CODE 저장 또는 BOM Run 전에 검증합니다.

검증 항목:

- Product Code Segment 누락
- Child Code 누락
- Quantity 누락
- 조건식 오류
- 순환 참조
- 비활성 Code 참조
- 미승인 Macro 참조
- Drawing / Table 누락
- 단위 불일치
- 중복 Child Code
- Version 불일치

### 6. Action Area

주요 Action:

- Save Draft
- Validate
- BOM Run Test
- Compare Result
- Request Approval
- Publish
- Archive
- Export

## 우측 Panel과의 관계

BOM CODE 중앙 Panel에서 선택한 항목에 따라 우측 Panel이 변경됩니다.

예:

```text
Product Code 선택
→ 우측: Code Detail, Attribute, History
```

```text
Child Code 선택
→ 우측: Sub Item Detail, Drawing, Material, Table
```

```text
BOM Run Preview Line 선택
→ 우측: Source Rule, Calculation, Validation, Cost
```

## 좌측 Hierarchy와의 관계

BOM CODE는 Hierarchy Address 아래에서 호출됩니다.

예:

```text
PLM
└─ Code Management
   ├─ Sub Code
   ├─ Product Code
   ├─ Code Relationship
   └─ Arrangement Code
```

또는:

```text
CPQ
└─ Product Selection
   └─ BOM Code
```

Hierarchy는 주소로만 사용하고 실제 Code, Table, Drawing, Macro는 별도 엔티티에서 관리합니다.

## 데이터 모델 후보

### BomCodeDefinition

BOM CODE의 중심 정의입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `product_code_id`
- `arrangement_code_id`
- `code`
- `name`
- `description`
- `status`
- `version`
- `approval_status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### BomCodeSegment

BOM CODE를 구성하는 Segment입니다.

주요 필드:

- `id`
- `tenant_id`
- `bom_code_definition_id`
- `segment_key`
- `name`
- `description`
- `value_type`
- `required`
- `sort_order`
- `status`

### BomCodeRelationship

Parent Code와 Child Code 관계입니다.

주요 필드:

- `id`
- `tenant_id`
- `bom_code_definition_id`
- `parent_code_id`
- `child_code_id`
- `relationship_type`
- `quantity`
- `unit`
- `condition_rule`
- `sort_order`
- `status`

### BomCodeRun

BOM CODE 실행 이력입니다.

주요 필드:

- `id`
- `tenant_id`
- `project_id`
- `bom_code_definition_id`
- `input_context`
- `status`
- `started_by`
- `started_at`
- `completed_at`
- `error_message`

### BomCodeRunLine

BOM CODE 실행 결과 Line입니다.

주요 필드:

- `id`
- `tenant_id`
- `bom_code_run_id`
- `parent_code_id`
- `child_code_id`
- `item_name`
- `quantity`
- `unit`
- `source_relationship_id`
- `condition_result`
- `validation_status`
- `sort_order`

## Rule / Condition 처리

BOM CODE는 조건부 관계가 핵심입니다.

조건은 문자열로만 저장하지 말고 구조화된 Rule로 관리하는 것이 좋습니다.

예:

```json
{
  "if": {
    "and": [
      { "field": "fan_size", "op": ">=", "value": 630 },
      { "field": "material", "op": "=", "value": "GI" }
    ]
  },
  "then": {
    "include_child_code": "REINFORCE_FRAME"
  }
}
```

## BOM CODE와 AI/Macro

AI는 다음 역할을 합니다.

- Code Relationship 초안 제안
- 조건식 생성 보조
- 누락 Child Code 탐지
- 중복/순환 관계 탐지
- BOM Run 오류 설명
- 기존 BOM을 분석하여 규칙 후보 제안

단, AI가 제안한 관계와 Macro는 검토/승인 후 적용합니다.

## 승인과 Version

BOM CODE는 자동 BOM 생성에 직접 영향을 주므로 승인과 Version이 필요합니다.

상태 흐름:

```text
Draft
→ Validate
→ Review
→ Approved
→ Published
→ Archived
```

Project에서 BOM Run을 실행할 때는 Published Version을 기본 사용합니다.

## EDIM Run과의 관계

BOM CODE는 EDIM Run의 첫 번째 핵심 실행 대상입니다.

```text
BOM Code Run
→ BOM / Part List 생성
→ Drawing Run 입력
→ Cost Run 입력
→ Document Run 입력
```

## MVP 반영 범위

첫 구현에서는 다음 기능을 준비합니다.

- Product Code 목록
- Code Segment 표시
- Parent / Child Relationship 설정
- Quantity 설정
- 조건 없는 BOM Run Test
- BOM Run Preview
- Validation 기본 검사
- Draft / Published 상태

다음 단계에서 조건부 Rule, Macro, Drawing/Table 연결, Cost 연결을 확장합니다.

## 결정 사항

BOM CODE는 중앙 Main Panel의 핵심 업무 화면으로 설계합니다.

BOM CODE는 Product Code, Sub Code, Material, Drawing, Table, Macro, Work Process를 연결하여 자동 BOM을 생성하는 RCCS의 중심입니다.

