# EDIM Hierarchy Visual Asset Map Model

이 문서는 Hierarchy의 각 위치에 어떤 Code, Table, Drawing, Document, Macro, File이 연결되어 있는지 이미지화하여 사용자가 쉽게 식별할 수 있는 기능을 정의합니다.

## 핵심 결정

Hierarchy는 EDIM의 Data Address입니다.

따라서 사용자는 각 Hierarchy 위치에 무엇이 저장/연결되어 있는지 한눈에 볼 수 있어야 합니다.

이를 위해 `Hierarchy Visual Asset Map` 또는 `Hierarchy Asset Navigator` 기능을 둡니다.

```text
Hierarchy Node
→ 연결된 Code / Table / Drawing / Document / Macro / File
→ Icon / Badge / Preview / Relationship Map으로 시각화
```

## 목적

사용자가 다음을 빠르게 식별하도록 돕습니다.

- 이 위치에 어떤 Code가 있는가?
- 연결된 도면이 있는가?
- 연결된 Table이 있는가?
- Macro가 있는가?
- 승인된 자료인가?
- Draft 자료인가?
- 누락된 필수 자료가 있는가?
- Product Code와 Sub Code 관계가 어떻게 연결되어 있는가?
- BOM Run에 필요한 자료가 모두 준비되었는가?

## 표시 방식 후보

### 1. Tree + Badge

좌측 Hierarchy Tree에 작은 Icon/Badge를 표시합니다.

예:

```text
PLM
└─ Code Management
   └─ Product Code
      └─ AHU
         └─ Casing  [Code 12] [DWG 3] [Table 2] [Macro 1]
```

Badge 예:

- `C`: Code
- `T`: Table
- `D`: Drawing
- `M`: Macro
- `Doc`: Document
- `!`: 누락/오류
- `A`: 승인됨
- `Draft`: 초안

### 2. Asset Card View

선택된 Hierarchy Node의 연결 자료를 Card 형태로 보여줍니다.

Card 예:

```text
[Product Code] KDCR 3-13
[Drawing] KDCR-3-13.dwg
[Table] Variant Table
[Macro] Shaft Length Macro
[Document] Technical Data
```

### 3. Relationship Graph

Product Code, Sub Code, Drawing, Table, Macro의 관계를 Graph로 보여줍니다.

예:

```text
Product Code
→ Sub Code
→ Material Code
→ Drawing
→ Macro
→ Table
```

이 방식은 Code Relationship과 자동 BOM 생성 구조를 이해하는 데 유용합니다.

### 4. Heatmap / Completion Map

Hierarchy 각 위치의 준비 상태를 색상으로 표시합니다.

예:

- 초록: 필수 자료 완비
- 노랑: 일부 누락
- 빨강: 오류 또는 승인 필요
- 회색: 비활성

### 5. Preview Thumbnail

도면, 이미지, 문서가 연결된 경우 작은 Preview를 보여줍니다.

예:

- Drawing thumbnail
- PDF preview
- 3D model thumbnail
- Table preview

## Visual Asset Map에 표시할 정보

Hierarchy Node별 표시 항목:

- Node 이름
- Node Type
- Current Path
- 연결된 Code 수
- 연결된 Table 수
- 연결된 Drawing 수
- 연결된 Document 수
- 연결된 Macro 수
- 연결된 File 수
- 승인 상태
- Version 상태
- Validation 상태
- 마지막 변경일
- 담당자
- 보안 등급

## 우측 Panel과의 관계

사용자가 Hierarchy Node를 선택하면 우측 Panel에 해당 Node의 Asset Map이 표시될 수 있습니다.

우측 Accordion 후보:

- Asset Summary
- Code List
- Drawing List
- Table List
- Macro List
- Document List
- Relationship Graph
- Validation Result
- History

## 중앙 Panel과의 관계

중앙 Main Panel에서는 선택된 Node의 상세 관리 화면을 표시할 수 있습니다.

예:

- Code Management
- BOM Code Relationship
- Drawing Setup
- Table Management
- Macro Management
- Asset Upload

## 데이터 모델 후보

### HierarchyAssetSummary

실시간 계산하거나 캐시로 저장할 수 있는 Summary입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `code_count`
- `table_count`
- `drawing_count`
- `document_count`
- `macro_count`
- `file_count`
- `missing_required_count`
- `validation_status`
- `approval_status`
- `last_changed_at`

### HierarchyVisualConfig

Hierarchy별 시각화 설정입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_definition_id`
- `view_mode`
- `show_badges`
- `show_thumbnails`
- `show_validation`
- `show_approval_status`
- `default_expand_level`
- `status`

`view_mode` 예:

- `tree_badge`
- `card`
- `graph`
- `heatmap`

## Validation 표시

Visual Map은 누락과 오류를 보여줘야 합니다.

검증 예:

- Product Code는 있으나 Child Code 없음
- Drawing이 필요하지만 없음
- Macro가 있으나 승인되지 않음
- Table이 비활성 상태
- Code Relationship 순환 참조
- Published Version 없음
- BOM Run 필수 자료 누락

## 권한

사용자는 자신이 볼 수 있는 자료만 시각화해야 합니다.

예:

```text
Drawing Count는 보이지만, 보안 등급 때문에 Drawing File은 열람 불가
```

관련 PermissionPoint:

- `hierarchy.asset_map.view`
- `hierarchy.asset_map.configure`
- `hierarchy.asset_summary.view`
- `asset.preview.view`
- `relationship.graph.view`

## MVP 반영 범위

첫 구현에서는 다음만 준비합니다.

- Hierarchy Tree Badge
- 선택 Node의 Asset Summary
- Code / Drawing / Table / Macro Count
- 누락/오류 Badge
- 우측 Panel의 Asset List

이후 확장:

- Relationship Graph
- Thumbnail Preview
- Heatmap
- Validation 상세
- Dashboard 연계

## 결정 사항

Hierarchy 각 위치에 어떤 Code와 자료가 연결되어 있는지 사용자가 시각적으로 식별할 수 있도록 Visual Asset Map 기능을 둡니다.

초기에는 Tree Badge와 Asset Summary 중심으로 시작하고, 이후 Relationship Graph와 Preview로 확장합니다.

