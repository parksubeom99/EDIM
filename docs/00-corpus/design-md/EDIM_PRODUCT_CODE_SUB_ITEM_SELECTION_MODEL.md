# EDIM Product Code and Sub Item Selection Model

이 문서는 `EDIM Solution.pdf` 32페이지의 Product Code 화면을 기준으로, Product Code가 Sub Code를 호출하여 Sub Item을 만들고, Sub Code의 일부 또는 전체를 선택적으로 적용하는 구조를 정의합니다.

## 핵심 결정

Product Code는 Sub Code를 복사해서 만드는 것이 아닙니다.

Product Code는 Hierarchy와 Code Group에서 필요한 Sub Code를 호출하고, 그 Sub Code의 일부 또는 전체 정보를 선택적으로 적용하여 Sub Item을 구성합니다.

```text
Sub Code
→ 호출
→ 선택 적용
→ Sub Item
→ Product Code 구성
→ Code Relationship
→ BOM Run
```

## 32페이지의 의미

32페이지는 다음 작업을 보여줍니다.

- Product Code 등록
- Product Code가 참조할 Sub Code 호출
- Code Segment / Attribute 구성
- Product Code Hierarchy 위치 지정
- 관련 Data, Table, Drawing Upload/Link
- Sub Item List 구성
- Product Code와 Sub Code의 관계 형성

즉, 이 화면은 자동 BOM 생성을 위한 Product Code의 “구성 정의 화면”입니다.

## 필요한 핵심 기능

### 1. Sub Code 호출 기능

Product Code 작성자는 필요한 Sub Code를 검색하고 호출할 수 있어야 합니다.

검색 조건:

- Hierarchy 위치
- Code Group
- Code Type
- Material
- Specification
- Size
- Unit
- Supplier
- Drawing 여부
- Table 여부
- Macro 여부
- Published 상태
- 승인 상태

호출 대상은 기본적으로 Published Sub Code만 허용합니다.

Draft 또는 Review 상태 Sub Code는 권한 있는 사용자만 Test 목적으로 호출할 수 있습니다.

### 2. Sub Code 선택 적용 기능

Sub Code 전체를 사용할 수도 있고 일부 속성만 사용할 수도 있어야 합니다.

적용 방식:

- 전체 적용
- 일부 Attribute만 적용
- 수량만 적용
- Material 정보만 적용
- Drawing만 연결
- Table만 연결
- Macro만 연결
- Cost 정보만 연결
- Work Process만 연결

예:

```text
Sub Code A에서 Material, Unit, Drawing만 사용
Sub Code B에서 Specification과 Table만 사용
Sub Code C는 BOM Child로 전체 적용
```

### 3. Sub Item 생성

Sub Item은 Product Code 내부에서 사용되는 구성 항목입니다.

Sub Item은 하나의 Sub Code 전체를 의미할 수도 있고, 여러 Sub Code의 일부 정보를 조합한 항목일 수도 있습니다.

```text
Sub Code 1 + Sub Code 2 일부 속성
→ Sub Item
```

Sub Item 주요 필드:

- `id`
- `tenant_id`
- `product_code_id`
- `source_sub_code_id`
- `name`
- `description`
- `quantity`
- `unit`
- `selected_attributes`
- `override_attributes`
- `status`

### 4. Attribute Inheritance

Sub Item은 Sub Code의 Attribute를 상속할 수 있어야 합니다.

상속 방식:

- inherited: Sub Code 값 그대로 사용
- overridden: Product Code에서 값 수정
- ignored: 해당 속성 사용하지 않음
- calculated: Macro 또는 Formula로 계산

예:

```text
Material = inherited
Size = overridden
Weight = calculated
Remark = ignored
```

### 5. 선택 적용 추적

Sub Code의 어떤 항목을 Sub Item이 사용했는지 추적해야 합니다.

필요 이유:

- Sub Code 변경 시 영향 분석
- Product Code 안정성 확보
- BOM Run 재현
- 승인 당시 기준 확인

### 6. Product Code Segment Mapping

Product Code의 A/B/C/D/E/F Segment가 어떤 Sub Code Attribute와 연결되는지 설정할 수 있어야 합니다.

예:

```text
A = Fan Model
B = Fan Size
C = Material
D = Bearing Type
E = FF
F = Supplier / Option
```

각 Segment는 다음 중 하나를 참조할 수 있습니다.

- Sub Code Attribute
- 직접 입력값
- Code Set
- Formula
- Macro Result
- Table Lookup Result

### 7. 조건부 Sub Item 적용

Sub Item은 조건에 따라 포함되거나 제외될 수 있어야 합니다.

예:

```text
IF Fan Size >= 630 THEN Reinforce Frame 포함
IF Material = SUS THEN SUS Bolt Set 적용
IF FF = YES THEN Inlet Cone With FF 사용
```

초기 MVP에서는 조건 없는 적용부터 시작하고, 이후 Rule Engine으로 확장합니다.

### 8. Quantity Rule

Sub Item의 수량은 고정값 또는 계산값일 수 있습니다.

예:

- 고정 수량
- Product Size 기반 수량
- Arrangement 기반 수량
- Table Lookup 수량
- Macro 계산 수량

### 9. Preview / Compare

Sub Code를 적용하기 전에 Preview가 필요합니다.

표시 항목:

- 선택된 Sub Code
- 적용될 Attribute
- 무시되는 Attribute
- Override되는 Attribute
- 생성될 Sub Item
- BOM Run에 반영될 내용
- Validation 결과

### 10. Validation

검증 항목:

- 호출한 Sub Code가 Published 상태인가?
- 필수 Attribute가 누락되지 않았는가?
- 선택 적용된 속성이 Product Code Segment와 맞는가?
- Unit이 일치하는가?
- 같은 Sub Item이 중복되지 않았는가?
- 조건식이 올바른가?
- 수량이 유효한가?
- Sub Code Version이 고정되어 있는가?
- Product Code 승인 전에 모든 Sub Item이 검증되었는가?

## 우측 Panel 필요 기능

32페이지의 Product Code 화면에서 우측 Panel은 다음 기능을 가져야 합니다.

- Sub Code Search / Call
- Selected Sub Code Detail
- Attribute Selection
- Asset Upload / Link
- Drawing List
- Table List
- Macro List
- Product Code Segment Mapping
- Validation Result
- Usage / Impact
- History

## 데이터 모델 후보

### ProductCodeDefinition

Product Code 기본 정의입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `code`
- `name`
- `description`
- `status`
- `current_version_id`
- `created_by`
- `created_at`

### ProductCodeVersion

Product Code Version입니다.

주요 필드:

- `id`
- `tenant_id`
- `product_code_id`
- `version`
- `status`
- `approval_status`
- `published_at`
- `published_by`

### ProductSubItem

Product Code가 사용하는 Sub Item입니다.

주요 필드:

- `id`
- `tenant_id`
- `product_code_version_id`
- `source_sub_code_id`
- `source_sub_code_version_id`
- `name`
- `quantity`
- `unit`
- `condition_rule`
- `sort_order`
- `status`

### ProductSubItemAttributeMap

Sub Code Attribute가 Sub Item에 어떻게 적용되는지 정의합니다.

주요 필드:

- `id`
- `tenant_id`
- `product_sub_item_id`
- `source_attribute_key`
- `target_attribute_key`
- `apply_mode`
- `override_value`
- `formula`
- `status`

`apply_mode` 예:

- `inherit`
- `override`
- `ignore`
- `calculate`

### ProductCodeSegmentMap

Product Code Segment와 Sub Code/Attribute의 연결입니다.

주요 필드:

- `id`
- `tenant_id`
- `product_code_version_id`
- `segment_key`
- `source_type`
- `source_id`
- `attribute_key`
- `formula`
- `status`

## Sub Code 변경과의 관계

ProductSubItem은 반드시 `source_sub_code_version_id`를 저장합니다.

이유:

- Sub Code가 변경되어도 Product Code가 참조한 기준 Version을 유지하기 위함
- BOM Run Snapshot 재현
- 영향 분석

Sub Code의 새 Version을 Product Code에 반영하려면 다음 절차를 거칩니다.

```text
Sub Code New Version
→ Product Code Impact Analysis
→ Sub Item Update Preview
→ Review
→ Approval
→ Product Code New Version Published
```

## MVP 반영 범위

첫 구현에서는 다음 기능을 준비합니다.

- Product Code 등록
- Published Sub Code 검색/호출
- Sub Code 전체 적용
- Sub Code 일부 Attribute 선택 적용
- ProductSubItem 생성
- Product Code Segment Mapping 기본 구조
- 선택 적용 Preview
- Validation 기본 검사

조건부 적용, Quantity Formula, Macro 연계는 다음 단계에서 확장합니다.

## 결정 사항

Product Code는 Sub Code를 호출하여 Sub Item을 구성합니다.

Sub Item은 Sub Code 전체 또는 일부 Attribute를 선택적으로 사용할 수 있습니다.

모든 선택 적용은 Version과 Mapping으로 추적해야 합니다.

