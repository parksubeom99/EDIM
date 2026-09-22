# Decision: Code Governance and Approval

Date: 2026-05-08

## 결정

EDIM의 모든 Code는 권한 있는 작성자가 생성하고, 검증과 승인 절차를 거친 후 Published 상태가 되어야 공식 사용 가능하다.

EDIM Run은 기본적으로 Published Code만 사용한다.

## 이유

Code는 자동 BOM, 도면, 기술자료, 견적, 원가, 문서 생성의 기준 데이터다.

승인되지 않은 Code가 사용되면 Product Code, Part Relationship, BOM Run, Drawing, Macro 전체에 오류가 전파될 수 있다.

## 원칙

- Code 작성 권한을 분리한다.
- Code Type별 승인 Workflow를 설정할 수 있게 한다.
- Published Code는 직접 수정하지 않는다.
- 변경은 새 Version 또는 Change Request로 처리한다.
- EDIM Run은 Published Version을 기준으로 실행한다.
- 모든 Code 변경과 승인 이력은 Audit Log에 남긴다.

