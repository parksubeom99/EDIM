# EDIM Assembly Drawing Engine Model

이 문서는 EDIM에서 기초도면을 호출하여 조립도면을 생성하고, 조립 조건, 순서, 주의사항, 치수관계, Design Tool, Macro, AI 편집 기능을 적용하는 구조를 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 37~39페이지, 59페이지입니다.

## 핵심 결정

조립도면은 모든 경우에 원본 CAD 파일과 동일할 필요는 없습니다.

EDIM은 기초도면과 부품 데이터를 호출하여 조립 형상을 만들고, 필요한 경우에만 원본 CAD 또는 제조용 도면을 수정/Export합니다.

```text
Base Drawing / Component
→ Assembly Definition
→ Assembly Rule / Sequence / Caution
→ Dimension Relationship
→ Macro / AI Assist
→ Assembly Drawing / View / Export
```

## 핵심 원칙

AI가 원본 도면을 직접 임의로 수정하지 않습니다.

AI는 다음 역할을 합니다.

- 조립 조건 제안
- 치수 관계 제안
- Macro 초안 생성
- 누락 조건 탐지
- 도면 일부 Sketch/Edit 제안
- 오류 원인 설명

실제 도면 수정과 Export는 검증된 Drawing Engine 또는 CAD Adapter가 수행합니다.

## 조립도면 생성 흐름

```text
1. Product / Arrangement Code 선택
2. Code Relationship에서 Sub Item / Drawing 호출
3. 기초도면 또는 Component Asset 로드
4. Assembly Definition 적용
5. 조립 조건, 순서, 주의사항 적용
6. Dimension Relationship 계산
7. Macro 실행
8. Assembly View 생성
9. Validation 실행
10. PDF / SVG / DXF / DWG / STEP / glTF 등 Export
11. 승인/Revision 저장
```

## 기초도면 호출 방식

기초도면은 Hierarchy에 직접 저장하지 않고 `HierarchyAssetLink`로 연결합니다.

```text
HierarchyNode
→ HierarchyAssetLink
→ DrawingRecord / DrawingComponent / FileAsset
```

기초도면 유형:

- 2D DWG/DXF
- 3D STEP/IGES
- SolidWorks Part/Assembly
- FreeCAD Document
- SVG/PDF Preview
- glTF/GLB Viewer Model
- EDIM Native Sketch

## Assembly Definition

조립도면을 만들기 위한 정의입니다.

주요 필드:

- `id`
- `tenant_id`
- `code`
- `name`
- `product_code_id`
- `arrangement_code_id`
- `base_drawing_id`
- `status`
- `version`

## Assembly Component

조립에 포함되는 부품 또는 기초도면입니다.

주요 필드:

- `id`
- `tenant_id`
- `assembly_definition_id`
- `component_code_id`
- `drawing_record_id`
- `quantity`
- `position_rule`
- `orientation_rule`
- `scale_rule`
- `sort_order`

## Assembly Constraint

부품 사이의 조립 조건입니다.

예:

- 기준점
- 중심선 정렬
- 면 접촉
- 거리 유지
- 방향 고정
- 간격
- 축 정렬
- 회전 각도
- 좌/우 대칭

주요 필드:

- `id`
- `tenant_id`
- `assembly_definition_id`
- `constraint_type`
- `source_component_id`
- `target_component_id`
- `parameter_rule`
- `status`

## Assembly Sequence

조립 순서입니다.

37페이지와 59페이지의 조립순서, 주의사항, QC/Material/Manufacturing 정보를 이 구조로 관리합니다.

주요 필드:

- `id`
- `tenant_id`
- `assembly_definition_id`
- `step_no`
- `title`
- `description`
- `required_tool`
- `caution`
- `qc_check`
- `material_check`
- `manufacturing_note`
- `image_file_id`

## Dimension Relationship

치수 관계입니다.

도면의 Key Dimension, Detail Dimension, Arrangement Dimension이 어떤 데이터와 연결되는지 정의합니다.

주요 필드:

- `id`
- `tenant_id`
- `assembly_definition_id`
- `dimension_key`
- `dimension_name`
- `source_type`
- `source_id`
- `formula`
- `unit`
- `min_value`
- `max_value`
- `validation_rule`

예:

```text
shaft_length = casing_width + bearing_width_left + bearing_width_right + clearance
```

## Drawing Macro

도면 계산 또는 편집을 수행하는 Macro입니다.

역할:

- 치수 계산
- Component 위치 계산
- 조립 조건 적용
- 도면 요소 생성
- 도면 요소 수정
- 검증 실행

Macro는 반드시 Version과 Approval 상태를 가져야 합니다.

## AI Drawing Assist

AI 기능은 다음 범위에서 사용합니다.

### 1. Macro 생성 보조

사용자의 자연어 설명을 Macro 초안으로 변환합니다.

예:

```text
Impeller 폭과 Casing 폭을 기준으로 Shaft 길이를 계산해줘.
```

### 2. 치수 관계 추론

기존 Table, Drawing, Code Relationship을 참조하여 치수 관계를 제안합니다.

### 3. 조립 순서 초안 작성

부품 관계를 보고 조립 순서와 주의사항 초안을 작성합니다.

### 4. 도면 일부 Sketch/Edit

AI가 직접 원본 CAD를 수정하는 것이 아니라, EDIM Drawing Command를 생성합니다.

예:

```text
create_line
create_dimension
move_component
align_center
set_parameter
add_note
```

### 5. 오류 설명

Macro 실패, 치수 범위 초과, 누락 조건을 사람이 이해할 수 있게 설명합니다.

## Drawing Command Layer

AI와 사용자가 도면을 편집할 때는 원본 파일을 직접 수정하지 않고 Command Layer를 사용합니다.

예:

- `create_component`
- `place_component`
- `move_component`
- `rotate_component`
- `align_component`
- `set_dimension`
- `create_dimension`
- `create_note`
- `create_section_view`
- `update_parameter`
- `run_validation`

Command는 검증 후 CAD Adapter 또는 EDIM Native Drawing Engine이 실행합니다.

## EDIM Drawing Workbench

37페이지처럼 상단에 CAD 기능을 모은 Toolbar가 필요합니다.

기본 Toolbar 후보:

- Select
- Move
- Rotate
- Zoom
- Pan
- Fit
- View: Top / Front / Side / ISO
- Measure
- Dimension
- Layer
- Grid / Snap
- Call Sub Drawing
- Parameter Edit
- Macro Run
- Validation
- Export
- Revision
- Approval Request

EDIM Workbench는 완전한 CAD 프로그램이 아니라 EDIM 업무에 필요한 Drawing Control 화면입니다.

## CAD Adapter와 Viewer의 역할 분리

### Viewer / Workbench

사용자가 보고, 선택하고, 치수 확인하고, Macro를 실행하는 화면입니다.

가능 기술:

- Web Canvas
- SVG
- Three.js
- WebGL
- glTF Viewer

### CAD Adapter / Worker

원본 CAD 파일을 수정하고 Export하는 백엔드 작업자입니다.

가능 대상:

- FreeCAD
- AutoCAD/DWG Adapter
- SolidWorks API
- Inventor API
- DXF/STEP Parser

## 2D와 3D 처리

### 2D

적합 대상:

- 승인도
- 조립 설명도
- 제작용 2D 도면
- 치수표

### 3D

적합 대상:

- 조립 검토
- 간섭 확인
- Digital Twin
- AR/XR
- 설치/정비 가이드

3D는 CAD 원본과 시각화 모델을 분리합니다.

```text
CAD 원본 = 제조 기준
glTF/Three.js 모델 = 시각화 / Digital Twin / 현장 확인
```

## Validation

조립도면 생성 후 검증이 필요합니다.

검증 항목:

- 필수 Component 누락
- 치수 범위 초과
- Constraint 충돌
- 조립 순서 누락
- 주의사항 누락
- Macro 오류
- 도면 파일 누락
- Revision 불일치
- 승인되지 않은 Macro 사용
- 제조용 도면 필요 여부 확인

## Output 유형

조립 결과는 목적에 따라 다른 형식으로 내보냅니다.

- PDF: 승인/공유
- SVG: Web 조립도
- DXF/DWG: 2D 제작/편집
- STEP: 3D 교환
- glTF/GLB: Web 3D / Digital Twin
- Native CAD: 원본 CAD 계열 유지가 필요한 경우

## MVP 반영 범위

첫 구현에서는 다음 구조를 준비합니다.

- Assembly Definition
- Assembly Component
- Assembly Sequence
- Dimension Relationship
- Drawing Macro 기본 구조
- Drawing Command Layer
- Validation 기본 구조
- Web Preview 중심 조립도

CAD 원본 직접 수정과 SolidWorks/AutoCAD API 연계는 이후 Adapter 단계에서 확장합니다.

## 결정 사항

조립도면은 기초도면과 Component를 호출하여 생성합니다.

조립 조건, 순서, 주의사항, 치수 관계는 데이터로 관리합니다.

AI는 Macro와 Drawing Command를 제안하고, 검증된 엔진이 실제 수정/Export를 수행합니다.

