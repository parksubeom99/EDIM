# Decision: Main Shell Settings Are Managed As Templates

Date: 2026-05-10

## Decision

EDIM Main Shell의 전역 동작은 각각 별도 Template으로 관리한다.
Tenant Branding, 좌측 Hierarchy, 중앙 Main Panel 호출, 우측 Accordion, 권한/승인/이력 표시는 모두 Template Registry와 Version/Approval/History를 가진다.

## Reason

EDIM은 SaaS이며 회사, 부서, 담당자, 권한, 업무 상태에 따라 화면과 데이터 접근 방식이 달라진다.
이 규칙을 화면 코드에 직접 고정하면 CPQ, PLM, ERP, Drawing, AI/Macro 엔진을 붙일 때 변경 위험이 커진다.
따라서 Main Shell 단계에서 템플릿 기반 설정 구조를 먼저 확정한다.

## Confirmed Areas

- Tenant Branding: 회사별 로고와 색상은 Tenant Branding Template으로 관리한다.
- Left Hierarchy: Directory 형태 Tree의 추가/수정/이동/호출 정책은 Hierarchy Operation Template으로 관리한다.
- Center Main Panel: Head와 Hierarchy 선택에 따른 중앙 UI 호출은 Main Panel Call Rule Template으로 관리한다.
- Right Accordion: 우측 Sub Work Place 구성과 표시 순서는 Right Accordion Composition Template으로 관리한다.
- Permission / Approval / History: 권한점, 승인 조건, 이력 표시는 Permission Approval History Template으로 관리한다.

## Impact

- 시스템 기본 Template과 사용자 회사별 Override를 분리할 수 있다.
- 향후 CPQ, PLM, ERP, Drawing, Macro 엔진이 동일한 호출 규칙을 사용할 수 있다.
- Template 변경은 Draft, Review, Published, Deprecated 상태로 관리된다.
- Published 상태의 업무 자료와 실행 결과는 직접 수정하지 않고 새 Version과 승인 흐름을 사용한다.

## Prototype Update

The prototype screen was updated at:

- `prototype/edim-core-shell/index.html`
- `prototype/edim-core-shell/app.js`
- `prototype/edim-core-shell/styles.css`

