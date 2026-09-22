# EDIM Current Summary - 2026-05-10

## 현재 확정 방향

- EDIM은 SaaS 기반 Multi-Tenant 구조로 설계한다.
- 회사별 로고와 색상은 Tenant Branding으로 관리한다.
- 사용자는 Login 후 Tenant, 부서, 담당자, 권한, 승인 상태에 따라 접근한다.
- Head는 단순 상단 메뉴가 아니라 하위 항목을 가질 수 있는 Tree 구조로 관리한다.
- Head 선택에 따라 좌측 Hierarchy, 중앙 Main Panel, 우측 Accordion Panel Template을 호출한다.
- EDIM Developer는 전체 Platform 설정을 담당하는 개발자 전용 Head로 둔다.

## Main Shell 구조

- 상단: Tenant Logo, Head Navigation, Head 관리 진입.
- 좌측: Head별 Hierarchy 또는 EDIM Developer 작업 Tree.
- 중앙: 선택된 Head 또는 Tree 항목에 대응하는 Main Template.
- 우측: Design Tool, 자료, 승인, 이력, 설정 등 Accordion Template.
- 하단/좌측 보조: Task, Schedule, Workflow Handoff, 지연 업무 표시.

## EDIM Developer 구조

- EDIM Developer의 좌측 판넬은 Windows Directory 방식의 다단계 Tree로 구성한다.
- 개발자는 좌측 Tree에서 작업 종류를 선택하고, 중앙 판넬에서 해당 설정 Template을 편집한다.
- 주요 Group:
  - Platform Structure
  - Permission / Template
  - Engine / Adapter
  - Operations / Release
- `Head Tree Management`를 추가하여 Head 자체를 Tree 방식으로 관리한다.

## Head Tree Management 결정

- Head도 Hierarchy와 같은 Tree 원칙으로 추가, 수정, 이동, 비활성화, 삭제 검사를 처리한다.
- 좌측 EDIM Developer Tree에서 `Head Tree Management`를 선택하면 중앙에 관리 Template이 나타난다.
- Head 세부 설정은 선택된 Tree 항목마다 1:1 Template을 호출하는 방향으로 정한다.
- 세부 Template 예:
  - Head Structure Template
  - Head Display Order Template
  - Head Template Binding Template
  - Head Permission Template
  - Head Approval History Template
  - Head Impact Analysis Template
- Drag and Drop, 우클릭 메뉴, 이름/비고 입력, 중복 검토, 영향 분석은 실제 엔진 구현 단계에서 작동 기능으로 확장한다.

## 직접 확인 위치

- Prototype: `C:\A Eurus\Nova Solution\EDIM\Project\Prototype\edim-core-shell\index.html`
- 화면 경로: `Login / Tenant 승인 확인` -> `EDIM Developer` -> `Platform Structure` -> `Head Tree Management`
- 확인 항목:
  - Head Tree Preview
  - Windows Tree Edit Commands
  - Head Change Guardrail
  - Head Template Binding Matrix
  - Head Detail Template Rule

## 현재 Prototype 반영 상태

- EDIM Developer 좌측 Tree에 `Head Tree Management`와 하위 세부 설정 항목을 추가했다.
- 선택된 Tree 항목에 따라 중앙 Main Template이 바뀌도록 연결했다.
- Head Tree 관리 화면에서 Windows Tree 방식 편집 명령, Binding Matrix, 1:1 Detail Template Rule을 확인할 수 있다.
- `Head Tree Management` 중앙 판넬을 `현재 Head Tree` -> `선택 Node의 설정 항목 Tree` -> `세부 설정 Template` 구조로 확장했다.
- 중앙 Head Tree는 좌측 EDIM Developer Tree를 복제하지 않고, 전체 Head 목록과 선택된 Head의 하위 구조만 보여주는 Workbench로 정리했다.
- 기본 정보, Panel Binding, 권한, 승인, Data/File 연결은 Prototype 저장 방식으로 저장할 수 있다.
- 실제 Drag and Drop / 우클릭 메뉴 / 정식 DB 저장 엔진은 다음 구현 단계에서 만든다.
