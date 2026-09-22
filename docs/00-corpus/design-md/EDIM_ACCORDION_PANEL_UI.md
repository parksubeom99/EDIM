# EDIM Accordion Panel UI

이 문서는 EDIM Core Shell의 좌측/우측 패널을 Accordion 방식으로 처리하는 UI 구조를 정의합니다.

## 핵심 개념

Head 또는 WorkHierarchy 항목을 선택하면 해당 항목에 연결된 Template들이 좌측과 우측 패널에 나타납니다.

이때 Template이 많아질 수 있으므로 모든 영역을 펼친 형태로 보여주지 않고 Accordion 방식으로 표시합니다.

```text
Head 선택
→ WorkHierarchy 선택
→ 연결된 Template Group 조회
→ Accordion Panel 구성
→ 필요한 Panel만 펼쳐서 작업
```

## 적용 영역

### Left Work Panel

좌측은 업무 탐색과 작업 Template 선택에 사용합니다.

Accordion Group 예:

- Work Hierarchy
- Favorite Work
- Recent Work
- Project Folder
- Document Folder
- Setup Tools

### Right Sub Template Panel

우측은 선택된 작업의 세부 정보와 보조 도구를 표시합니다.

Accordion Group 예:

- Detail Information
- Sub Item List
- Approval
- Comment / History
- Macro
- Table
- Chart
- Drawing
- Document
- Cost
- Validation Result

## Accordion Item

각 Accordion Item은 하나의 Template 또는 기능에 연결됩니다.

주요 속성:

- 제목
- 설명
- 연결 Template
- 기본 펼침 여부
- 표시 순서
- 최소 높이
- 최대 높이
- 권한 조건
- 표시 조건
- 상태

## 표시 조건

Accordion Item은 항상 보이는 것이 아니라 조건에 따라 표시됩니다.

조건 예:

- 선택된 Head
- 선택된 WorkHierarchy
- 선택된 Project
- 선택된 Item
- 선택된 Document
- 사용자의 Role
- PermissionPoint
- Approval 상태
- EDIM Run 상태

예:

```text
CPQ > Quotation 선택
→ 우측 Accordion:
   - Quote Detail
   - Cost Table
   - Margin
   - Approval
   - Document
   - History
```

```text
PLM > Drawing Management 선택
→ 우측 Accordion:
   - Drawing Detail
   - Macro
   - Dimension Table
   - Approval
   - Revision History
```

## 사용자 상태 저장

사용자가 어떤 Accordion을 열어두었는지 저장합니다.

필요한 이유:

- 반복 작업 시 사용자가 선호하는 화면 상태를 유지합니다.
- 사용자가 다시 로그인해도 마지막 작업 환경을 복원할 수 있습니다.

저장 대상:

- 열린 Accordion Group
- 닫힌 Accordion Group
- Panel Width
- 마지막 선택 Template
- Pin 여부

주요 엔티티 후보:

- `user_panel_states`
- `workspace_states`

## Pin 기능

자주 사용하는 Sub Template은 Pin으로 고정할 수 있게 합니다.

예:

- Cost Table 고정
- Approval History 고정
- Drawing Preview 고정
- Macro Log 고정

## UI 원칙

- 기본 화면은 복잡하지 않게 시작합니다.
- 권한 없는 항목은 보이지 않습니다.
- 비활성 Template은 보이지 않습니다.
- 위험 작업은 Accordion 안에서도 별도 확인 단계를 둡니다.
- 중요한 알림이나 승인 대기 항목은 접혀 있어도 Badge로 표시합니다.

## MVP 반영 범위

첫 구현에서는 다음 기능만 만듭니다.

- 좌측 Accordion Group 표시
- 우측 Accordion Group 표시
- 펼치기/접기
- Template 연결
- 권한 없는 항목 숨김
- 기본 Open 상태 설정

사용자별 상태 저장, Pin, Drag & Drop 순서 변경은 이후 단계에서 확장합니다.

## 결정 사항

EDIM Core Shell의 좌측과 우측 패널은 Accordion 방식으로 구성합니다.

Accordion 구성은 Head와 WorkHierarchy에 연결된 Template 설정에 따라 동적으로 바뀝니다.

