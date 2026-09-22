# EDIM Developer Work Type Operation Model

Date: 2026-05-09

이 문서는 `EDIM Developer` Head에서 좌측 Panel의 항목 추가와 중앙 Panel 호출 방식을 정의합니다.

## 핵심 결정

`EDIM Developer` Head의 좌측 Panel은 일반 업무 Data Hierarchy가 아니라 EDIM 개발자 작업 종류를 표시합니다.

따라서 좌측 Panel의 `+` 버튼은 EDIM Developer Head 아래에 새로운 개발자 작업 항목을 추가하는 기능입니다.

```text
EDIM Developer
├─ Core Engine Registry
├─ Module / Head Registry
├─ Permission Point Catalog
├─ Template Schema Manager
├─ Rule / Macro Engine
├─ CAD / Drawing Adapter
├─ SaaS Tenant Operations
├─ Release / Audit Control
└─ New Developer Work
```

## 작동 방식

EDIM Developer에서 작업 항목을 선택하면 중앙 Panel은 해당 작업 항목의 설정 화면을 표시합니다.

```text
Left Panel 선택
→ Developer Work Type 확인
→ Center Panel 설정 화면 호출
→ Right Panel 상세 / 권한 / 영향 분석 표시
```

기본 등록된 작업 항목은 각각 전용 설정 화면을 가질 수 있습니다.

새로 추가된 작업 항목은 초기에는 Custom Developer Work 화면으로 표시하고, 이후 Template Schema 또는 Developer Console 설정을 통해 전용 화면으로 확장할 수 있습니다.

## 추가 항목의 기본값

EDIM Developer에서 새 작업 항목을 추가하면 다음 기본 설정을 가집니다.

- `node_type`: `admin`
- `binding`: `Head-Owned`
- `asset_link`: `Template`
- `main_template`: `System Setup Template`
- `right_template`: `Asset Summary Accordion`
- `required_permission`: `system.admin`
- `status`: `active`

## 일반 Head와의 차이

일반 Head의 좌측 Panel:

```text
업무 Hierarchy / Data Address / Template 호출 위치
```

EDIM Developer의 좌측 Panel:

```text
EDIM 플랫폼 개발자 작업 종류 / 전역 설정 통로
```

즉, 겉보기는 Tree처럼 동작하지만 의미는 다릅니다.

## 결정 사항

EDIM Developer Head 아래에는 Hierarchy처럼 작업 항목을 추가할 수 있어야 합니다.

이 항목들은 EDIM 플랫폼 기능을 관장하는 개발자 작업 종류이며, 선택 시 중앙 Panel에서 해당 설정 화면을 호출합니다.
