# Decision: Left Hierarchy Binding

Date: 2026-05-08

## 결정

EDIM 좌측 패널의 Hierarchy는 Head에 직접 속한 항목과 공통으로 호출되는 항목을 분리한다.

Head는 여러 HierarchyDefinition을 Binding하여 좌측 패널을 구성한다.

## 이유

Head마다 필요한 업무 구조는 다르지만, Project, Document, Approval, File, History 같은 구조는 여러 Head에서 공통으로 사용된다.

모든 Head마다 같은 항목을 직접 만들면 중복과 관리 문제가 생긴다.

## 원칙

- Head 전용 Hierarchy는 직접 생성/편집할 수 있다.
- 공통 Hierarchy는 여러 Head에서 호출할 수 있다.
- 호출된 Hierarchy는 Head별로 일부 표시 조건을 Override할 수 있다.
- 데이터가 연결된 항목은 삭제보다 비활성화를 우선한다.
- Template 연결과 권한 설정은 Hierarchy 항목 단위로 가능해야 한다.

