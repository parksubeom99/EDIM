# Decision: Approval and Report Engine

Date: 2026-05-07

## 결정

EDIM에는 공통 `Approval & Report Engine`을 둔다.

CPQ, PLM, ERP, EDIM Toolbox, AI/Macro, Document, Drawing은 각각 독립 승인 기능을 만들지 않고 이 공통 모듈을 사용한다.

## 이유

EDIM에서 승인 대상은 계속 증가한다.

예:

- 견적
- BOM
- 도면
- 승인도서
- 구매요청
- 발주
- 품질검사
- Macro
- Product Code
- 비표준 Option
- Template 변경

승인 기능을 각 모듈에 따로 만들면 중복과 불일치가 생긴다.

## 원칙

- 승인 절차는 코드에 고정하지 않는다.
- 권한 있는 사용자가 Workflow를 설정할 수 있어야 한다.
- 순차, 병렬, 조건부, 역할 기반, 대리 승인 구조를 지원할 수 있게 한다.
- 진행 중인 승인 요청은 당시 Workflow Version을 유지한다.
- 모든 결정과 변경 이력은 Audit Log로 남긴다.

## 초기 범위

초기에는 단일 승인과 순차 승인을 먼저 구현한다.

복잡한 조건부 승인과 병렬 승인은 구조만 준비하고 이후 단계에서 확장한다.

