# EDIM Arrangement Setup and Drawing View Model

이 문서는 EDIM에서 Arrangement Set-up, 용도별 도면 위치 설정, Design Tool 기능 설정, 2D 3각법과 3D View를 함께 사용하는 구조를 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 35~36페이지와 37~39페이지입니다.

## 핵심 결정

Arrangement Set-up은 단순한 배치 설정이 아닙니다.

Arrangement Set-up은 제품 선택 이후 생성될 도면, 조립도, 승인도, 제작도, 기술자료, EDIM Run의 기준을 정하는 핵심 설정입니다.

```text
Arrangement Code
→ Drawing View Layout
→ Component Position Rule
→ Dimension Relationship
→ Design Tool Binding
→ Macro / Validation
→ 2D / 3D Output
```

## Arrangement Set-up의 역할

Arrangement Set-up에서 관리해야 할 항목:

- 용도별 도면 위치 설정
- Component 배치 기준
- 기준점 / 기준면 / 중심선 설정
- 2D View 구성
- 3D View 구성
- 조립 순서
- 치수 관계
- Design Tool 연결
- Macro 연결
- Validation Rule 연결
- 출력 형식 설정

## 용도별 도면 구분

도면은 목적에 따라 처리 방식이 달라져야 합니다.

도면 용도:

- Approval Drawing
- Manufacturing Drawing
- Assembly Drawing
- Technical Document Drawing
- Digital Twin View
- Installation / Maintenance Guide

각 용도별로 필요한 정확도와 출력 형식이 다릅니다.

예:

```text
Manufacturing Drawing
→ 원본 CAD와 높은 일치성 필요
→ 치수, 공차, Revision 엄격 관리

Assembly Drawing
→ 조립 위치, 순서, 주의사항 중심
→ Web View, PDF, SVG, glTF 가능

Digital Twin View
→ 시각화, 상태, 센서, QR, 위치 정보 중심
→ 3D / WebGL / glTF 중심
```

## 2D 3각법 View

작업 편의를 위해 2D 3각법 View를 지원하는 것이 좋습니다.

기본 View:

- Front View
- Top View
- Right View
- Left View
- Section View
- Detail View

필요 기능:

- View별 Component 표시/숨김
- View별 치수 표시
- View별 주석 표시
- 기준선/중심선 표시
- View 간 치수 동기화
- View Scale 설정
- 출력 용지 위치 설정

## 3D View

3D View는 조립 검토와 Digital Twin, 설치/정비 안내에 매우 유용합니다.

필요 기능:

- ISO View
- Rotate / Pan / Zoom
- Component 선택
- Component Highlight
- Exploded View
- Assembly Sequence View
- Interference Check
- Section Cut
- Measurement
- Material / Color 표시
- QR / Sensor / Status Overlay

## 2D와 3D의 관계

2D와 3D는 별도 화면처럼 보이더라도 같은 Parameter Set을 공유해야 합니다.

```text
Arrangement Parameter
→ 2D Drawing View
→ 3D Assembly View
→ Digital Twin View
```

중요 원칙:

- 2D 치수와 3D 위치가 같은 데이터에서 계산되어야 합니다.
- 3D에서 Component 위치를 변경하면 2D View에 반영될 수 있어야 합니다.
- 2D에서 치수 Parameter를 변경하면 3D View가 갱신될 수 있어야 합니다.
- 모든 변경은 Macro / Command / Audit Log로 추적합니다.

## Arrangement View Layout

도면 용도별 View 배치를 저장합니다.

주요 필드 후보:

- `id`
- `tenant_id`
- `arrangement_definition_id`
- `drawing_purpose`
- `view_type`
- `position_x`
- `position_y`
- `width`
- `height`
- `scale`
- `display_rule`
- `status`

`view_type` 예:

- `front`
- `top`
- `right`
- `left`
- `section`
- `detail`
- `iso_3d`
- `exploded_3d`

## Arrangement Design Tool Binding

Arrangement 목적별로 필요한 Design Tool을 연결합니다.

예:

- Key Dimension Tool
- Detail Dimension Tool
- Component Placement Tool
- Design Verification Tool
- Assembly Sequence Tool
- QC / Material / Manufacturing Note Tool
- Macro Run Tool
- Validation Tool

주요 필드 후보:

- `id`
- `tenant_id`
- `arrangement_definition_id`
- `drawing_purpose`
- `tool_type`
- `template_id`
- `macro_id`
- `required_permission`
- `sort_order`
- `status`

## Component Position Rule

기초도면 또는 Component의 위치를 결정합니다.

필요 항목:

- 기준점
- 기준면
- 중심선
- 회전 방향
- 좌우 방향
- 거리
- 간격
- 정렬 방식
- 대칭 조건
- View별 표시 조건

## Workflow

Arrangement Set-up 작업 흐름:

```text
1. Arrangement Code 선택
2. Drawing Purpose 선택
3. 2D / 3D View Layout 설정
4. Component 호출
5. Component Position Rule 설정
6. Dimension Relationship 설정
7. Design Tool / Macro 연결
8. Validation 실행
9. Preview 확인
10. Publish / Approval
```

## EDIM Toolbar

37페이지처럼 Arrangement와 Drawing Set-up에는 상단 Toolbar가 필요합니다.

추천 Toolbar:

- Select
- Move
- Rotate
- Align
- Zoom / Pan / Fit
- Front / Top / Right / ISO
- Section
- Detail
- Measure
- Dimension
- Component Call
- Parameter Edit
- Macro Run
- Validate
- 2D / 3D Toggle
- Export
- Revision
- Approval Request

## FreeCAD / CAD Adapter와의 관계

EDIM 화면 안에 전체 CAD 프로그램을 그대로 Embed하는 것은 초기에는 비추천합니다.

추천 방식:

```text
EDIM Arrangement Workbench
→ Web 기반 2D/3D View와 설정 UI 제공
→ CAD Adapter / Worker가 원본 CAD 수정 및 Export 수행
```

FreeCAD는 다음 역할에 적합합니다.

- 백엔드 CAD Worker
- STEP/DXF 처리
- Parameter 기반 모델 Rebuild
- Export 생성

EDIM UI는 CAD 전체 기능보다 Arrangement Set-up과 Design Tool 중심으로 구성합니다.

## Validation

검증 항목:

- 필수 View 누락
- Component 위치 누락
- 치수 관계 누락
- 2D/3D Parameter 불일치
- Macro 미승인
- 도면 용도와 출력 형식 불일치
- 제조용 도면의 원본 CAD 연결 누락
- Digital Twin용 3D 모델 누락

## MVP 반영 범위

첫 구현에서는 다음을 준비합니다.

- Arrangement Definition
- Drawing Purpose 구분
- 2D View Layout 설정
- 3D Preview 자리
- Component Position Rule 기본 구조
- Design Tool Binding
- Macro Binding
- Validation 기본 구조

FreeCAD, SolidWorks, AutoCAD 원본 수정은 이후 CAD Adapter 단계에서 확장합니다.

## 결정 사항

Arrangement Set-up에는 2D 3각법과 3D View를 함께 사용할 수 있는 구조를 둡니다.

도면 용도별로 View Layout, Component 위치, Design Tool, Macro, Validation을 설정할 수 있어야 합니다.

