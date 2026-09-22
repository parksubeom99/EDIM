# EDIM Core UI Skeleton

이 문서는 EDIM의 기본 화면 골격을 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 55페이지입니다.

## 핵심 개념

EDIM의 기본 화면은 CPQ, PLM, ERP를 각각 따로 만든 화면이 아니라, 모든 업무 모듈이 공통으로 사용하는 `EDIM Core Work Shell`입니다.

사용자는 상단 Head에서 업무 영역을 선택하고, 선택된 Head 조건에 따라 좌측 Hierarchy와 업무 Template이 바뀌며, 중앙에는 Main UI가 호출되고, 우측에는 선택된 Head 또는 Main UI에 연결된 Sub Template이 호출됩니다.

## 기본 화면 구성

```text
┌────────────────────────────────────────────────────────────────────┐
│ Header / Head                                                       │
│ 회사, 프로젝트, 모듈, 업무 Head, 사용자, 권한, 알림, 검색           │
├──────────────────────┬───────────────────────────────┬─────────────┤
│ Left Work Panel       │ Main Work Place                │ Right Panel │
│ Hierarchy             │ Head에 따라 호출되는 Main UI    │ Sub Template│
│ User Work Template    │ 업무 입력/조회/실행 중심 영역   │ Detail/Tool │
├──────────────────────┴───────────────────────────────┴─────────────┤
│ Optional Footer / Status / Run Result / Log                         │
└────────────────────────────────────────────────────────────────────┘
```

## 1. Header / Head

상단 Head는 현재 사용자가 어떤 업무 맥락에서 작업하는지를 결정합니다.

Head는 고정 메뉴가 아닙니다.

개발자 또는 Platform Admin이 Head를 추가, 이동, 삭제, 비활성화할 수 있어야 합니다. 따라서 Head는 코드에 하드코딩하지 않고 DB 또는 설정 데이터로 관리합니다.

Head의 예:

- Sales
- Tech
- Purchasing
- Material
- Product
- QC
- A/S
- Finance
- HR
- Company Info
- CPQ
- PLM
- EDIM Toolbox

Head는 단순 메뉴가 아니라 화면 전체를 바꾸는 조건입니다.

Head 선택 결과:

- 좌측 Hierarchy 변경
- 좌측 User Work Template 목록 변경
- 중앙 Main UI 호출
- 우측 Sub Template 후보 변경
- 사용자 권한에 따른 표시 항목 제한
- EDIM Run 가능 기능 제한

### Head 관리 기능

Head는 다음 관리 기능을 가져야 합니다.

- Head 추가
- Head 이름 변경
- Head 표시 순서 이동
- Head 삭제 또는 비활성화
- Head별 아이콘/색상/표시명 설정
- Head별 권한 설정
- Head별 기본 Hierarchy 설정
- Head별 기본 Main UI Template 설정
- Head별 기본 Sub Template 설정
- Head별 Toolbar 설정

삭제는 실제 삭제와 비활성화를 구분합니다.

이미 업무 데이터, Template, Macro, Approval, Document와 연결된 Head는 즉시 삭제하지 않고 `inactive` 상태로 전환하는 것이 안전합니다.

### Head 이동

Head 이동은 상단 표시 순서를 바꾸는 기능입니다.

예:

```text
Sales → CPQ → PLM → Purchasing → Material → Product → QC
```

Head 이동 시 기존 업무 데이터는 변경하지 않습니다.

변경되는 것은 다음 항목입니다.

- 상단 표시 순서
- 사용자의 기본 진입 위치
- Toolbar 표시 우선순위

### Head 삭제/비활성화 규칙

Head 삭제는 다음 규칙을 따릅니다.

- 연결 데이터가 없는 Head는 삭제 가능
- 연결 데이터가 있는 Head는 비활성화 권장
- 비활성화된 Head는 일반 사용자에게 숨김
- 관리자 화면에서는 이력 확인 가능
- 기존 Project, Document, Approval, Macro의 참조는 유지

이 원칙은 장기 운영 중 데이터 손상을 막기 위한 것입니다.

## 2. Left Work Panel

좌측은 선택된 Head 조건에 따라 업무 구조를 보여주는 영역입니다.

역할:

- Work Hierarchy 표시
- 사용자가 접근 가능한 업무 Template 목록 표시
- Project, Product, Code, Document, DWG 등 작업 대상 탐색
- 권한에 따라 메뉴와 작업 항목 표시/숨김

예:

- CPQ Head 선택 시: Project, Selection, Arrangement, BOM, Quotation, Document
- PLM Head 선택 시: Code, Product Management, Drawing Management, Work Process, Design
- ERP Head 선택 시: Sales, Purchasing, Material, Manufacturing, Quality, Cost
- EDIM Toolbox 선택 시: UI Design, Macro, Template, Chart, Toolbar

## 3. Main Work Place

중앙은 실제 업무를 수행하는 Main UI 영역입니다.

역할:

- Head와 좌측 Template 선택에 따라 Main UI Form 호출
- 프로젝트 등록, 제품 선택, 코드 관리, BOM Run, 견적, 도면관리 등 핵심 업무 수행
- EDIM Run 실행 버튼과 결과 표시
- 선택된 작업의 주요 데이터 입력 및 검토

Main UI는 고정 화면이 아니라 `UI Template`으로 관리되어야 합니다.

즉, CPQ Selection 화면, PLM Code Relationship 화면, ERP Purchase Request 화면은 모두 같은 Core Shell 안에서 서로 다른 Main UI Template으로 호출됩니다.

## 4. Right Sub Template Panel

우측은 선택된 Head 또는 Main UI의 세부 작업을 보조하는 영역입니다.

역할:

- Sub Template 호출
- Detail Data 표시
- Macro, Table, Chart, Document, Drawing, Approval, Comment 등 보조 기능 제공
- 선택된 Main UI 항목에 따라 세부 작업 창 변경

예:

- CPQ Selection에서 선택 제품의 Sub Item List 표시
- BOM 화면에서 BOM Line Detail 표시
- Drawing 화면에서 도면 속성, Macro, 치수 계산 표시
- Quotation 화면에서 Cost Table, Supplier Price, Margin 설정 표시
- Approval 화면에서 승인 이력, 의견, 첨부 문서 표시

## 5. EDIM Toolbar

55페이지의 구조에서는 사용자의 권한과 선택된 업무에 따라 Toolbar가 달라집니다.

Toolbar의 예:

- 고객관리
- Project 관리
- 견적검토
- 견적
- 수주
- 승인도서
- 고객승인
- 제작의뢰
- 출고요청
- 납품관리
- 기성청구
- 시운전요청

Toolbar는 단순 버튼 목록이 아니라 `업무 흐름 바로가기`입니다.

각 Toolbar 항목은 다음 정보를 가져야 합니다.

- 연결 Head
- 연결 Hierarchy
- 연결 Main UI Template
- 연결 Sub Template
- 필요 권한
- 실행 가능한 Macro 또는 EDIM Run

## 6. Template 개념

EDIM의 핵심은 화면을 코드로 고정하지 않고 Template으로 호출하는 것입니다.

Template 종류:

- Main UI Template
- Sub UI Template
- Toolbar Template
- Document Template
- Print Form Template
- Macro Template
- Chart Template
- Table Template

이 구조가 있어야 사용자가 CPQ, PLM, ERP 업무 화면을 회사 상황에 맞게 조정할 수 있습니다.

## 7. 초기 구현 방향

첫 구현에서는 완전한 사용자 제작 UI까지 만들지 않습니다.

초기 목표:

1. 고정된 EDIM Core Shell을 만든다.
2. Head 선택에 따라 좌측 Hierarchy가 바뀌게 한다.
3. 좌측 Template 선택에 따라 중앙 Main UI가 바뀌게 한다.
4. 중앙에서 선택한 항목에 따라 우측 Sub Template이 바뀌게 한다.
5. 이 구조 위에 CPQ 첫 화면을 붙인다.

초기 Head 후보:

- CPQ
- PLM
- ERP
- EDIM Toolbox
- Company Info

초기 Main UI 후보:

- Project Registration
- CPQ Selection
- Code Management
- BOM Relationship
- Quotation / PCR

## 8. 데이터 모델에 필요한 개념

이 UI 골격을 지원하려면 다음 데이터가 필요합니다.

- `heads`: 상단 업무 Head 정의
- `work_hierarchies`: Head별 업무 계층
- `ui_templates`: Main/Sub UI Template 정의
- `toolbar_items`: Head별 Toolbar 항목
- `template_bindings`: Head, Hierarchy, Main UI, Sub Template 연결
- `user_permissions`: 사용자별 접근 권한
- `workspace_state`: 사용자가 마지막으로 열었던 작업 상태

## 9. 결정 사항

EDIM의 첫 개발 목표는 개별 CPQ 화면이 아니라 `EDIM Core Work Shell`입니다.

CPQ, PLM, ERP는 이 Core Shell 안에 붙는 업무 모듈로 구현합니다.
