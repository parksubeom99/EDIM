# Decision: Main Shell Structure First

Date: 2026-05-10

## Decision

EDIM 개발은 Main Shell 구조를 먼저 확정한다.

Main Shell은 상단 Head, 좌측 Hierarchy/Task, 중앙 Main UI, 우측 Sub Work Place Accordion으로 고정한다.

## Reason

EDIM은 CPQ, PLM, ERP, BOM, Drawing, Approval, AI Macro가 모두 연결되는 큰 SaaS 시스템이다. 각 업무 엔진을 먼저 만들면 화면 구조와 권한, Template 호출 방식이 뒤에서 충돌할 수 있다.

따라서 공통 Shell을 먼저 확정하고, 이후 기능은 Head와 Template Binding을 통해 붙인다.

## Confirmed Rules

- Header는 Tenant, Head, 권한, 사용자 상태를 보여준다.
- Head는 EDIM Developer에서 추가, 이동, 삭제, 비활성화한다.
- 좌측 Panel은 Head별 Hierarchy와 업무 Template을 호출한다.
- 중앙 Panel은 실제 업무 UI를 호출한다.
- 우측 Panel은 보조 작업 Accordion을 호출한다.
- Hierarchy는 주소이고 Data는 별도 DB/File Storage에서 관리한다.
- 모든 연결은 이름이나 위치가 아니라 Stable ID로 추적한다.
- System Template은 직접 수정하지 않고 Fork/Override 방식으로 변경한다.
- 권한과 승인 조건은 모든 편집/실행 Action에 연결한다.

## Output

Main Shell 구조도:

`C:\A Eurus\Nova Solution\EDIM\Project\Prototype\edim-core-shell\edim-main-shell-structure.html`

Main Shell 상세 문서:

`C:\A Eurus\Nova Solution\EDIM\Project\Document\docs\EDIM_MAIN_SHELL_STRUCTURE.md`

