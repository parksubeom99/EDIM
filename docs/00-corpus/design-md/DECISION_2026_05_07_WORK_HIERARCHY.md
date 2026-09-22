# Decision: Unlimited Work Hierarchy

Date: 2026-05-07

## 결정

EDIM Head 하부의 세부 항목은 깊이 제한 없는 Tree 구조로 설계한다.

각 항목은 추가, 이동, 이름 변경, 삭제, 비활성화가 가능해야 한다.

## 이유

EDIM은 CPQ, PLM, ERP, Toolbox, AI, Document, Drawing 등 다양한 업무를 포함한다.

회사마다 업무 구조와 부서 구성이 다르므로 Head 하부 항목을 고정하면 확장성이 부족하다.

무제한 Tree 구조를 사용하면 회사별 업무 체계를 유연하게 구성할 수 있다.

## 원칙

- Head 아래 세부 항목은 DB 기반으로 관리한다.
- `parent_id`로 계층 구조를 만든다.
- 데이터가 연결된 항목은 삭제보다 비활성화를 우선한다.
- 권한은 항목 단위까지 확장 가능해야 한다.
- Main UI Template과 Sub Template은 WorkHierarchy 항목에 연결될 수 있어야 한다.

## 영향

EDIM Core Shell의 좌측 Work Panel은 WorkHierarchy Tree를 표시한다.

관리자 화면에는 WorkHierarchy를 편집하는 기능이 필요하다.

