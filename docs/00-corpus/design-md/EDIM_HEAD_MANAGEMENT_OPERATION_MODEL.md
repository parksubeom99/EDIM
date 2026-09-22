# EDIM Head Management Operation Model

Date: 2026-05-09

이 문서는 EDIM Main에서 Head 자체 관리와 선택된 Head 하위 항목 편집을 구분하는 작동 방식을 정의합니다.

## 핵심 결정

Head 자체의 추가, 삭제, 이동, 이름 변경, 비활성화는 모두 `Head 관리` 영역에 모읍니다.

좌측 Panel의 편집 기능은 선택된 Head 아래의 Hierarchy 또는 Work Type 항목을 편집하는 용도로 제한합니다.

```text
Head 관리 = Head 자체 관리
Left Panel 편집 = 선택된 Head 아래 항목 관리
```

## Head 관리에서 처리하는 기능

Head 자체 관리 기능:

- Head 추가
- Head 이름 수정
- Head 왼쪽 / 오른쪽 이동
- Head 비활성화 / 활성화
- Head 삭제 검사
- Head Type 설정
- Head 기본 Left / Main / Right Template 설정
- Head 표시 순서 설정
- Head 접근 Permission 설정

Head 삭제는 실제 운영 자료가 연결되어 있으면 삭제하지 않고 비활성화합니다.

## Left Panel에서 처리하는 기능

선택된 Head 아래 항목 편집 기능:

- Hierarchy / Work Type 항목 추가
- 항목 이름 수정
- 항목 위 / 아래 이동
- 항목 활성화 / 비활성화
- Binding Mode 변경
- Main Template 연결
- Right Template 연결
- Permission 연결
- Asset Link 설정

좌측 Panel의 `+` 버튼은 Head를 추가하는 기능이 아니라 선택된 Head 아래 항목을 추가하는 기능입니다.

## EDIM Developer의 예외 구조

`EDIM Developer` Head에서는 좌측 Panel이 일반 업무 Data Hierarchy가 아니라 개발자 작업 종류를 표시합니다.

예:

```text
Core Engine Registry
Module / Head Registry
Permission Point Catalog
Template Schema Manager
Rule / Macro Engine
CAD / Drawing Adapter
SaaS Tenant Operations
Release / Audit Control
```

하지만 작동 원칙은 동일합니다.

```text
Head 관리 = EDIM Developer Head 자체 관리
Left Panel = EDIM Developer 아래 작업 종류 관리
Center Panel = 선택한 작업 종류의 설정 화면
```

## UI 원칙

상단 Head는 박스형 버튼이 아니라 텍스트 탭으로 표시합니다.

Head 관리 패널은 기본적으로 접혀 있고, 필요할 때만 열어 Head 자체를 관리합니다.

이렇게 해야 Main 화면의 판독성을 유지하면서도 Head 자체 설정과 Head 내부 항목 편집이 혼동되지 않습니다.

## 결정 사항

EDIM에서는 Head 자체 관리와 Head 하위 항목 관리를 분리합니다.

Head 자체 추가/삭제/이동/비활성화는 `Head 관리`에 모으고, 선택된 Head 아래의 Hierarchy 또는 작업 종류 추가/수정/이동은 좌측 Panel에서 수행합니다.
