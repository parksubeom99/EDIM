# Decision: Product Code Sub Item Selection

Date: 2026-05-08

## 결정

Product Code는 Sub Code를 호출하여 Sub Item을 만든다.

Sub Item은 Sub Code의 전체 또는 일부 Attribute를 선택적으로 사용할 수 있다.

선택 적용 내역은 ProductSubItem과 ProductSubItemAttributeMap으로 추적한다.

## 이유

32페이지의 Product Code는 Sub Code를 단순 복사하는 구조가 아니라, 필요한 기준 데이터를 호출하고 조합하여 Product Code를 구성하는 화면이다.

Sub Code의 일부만 사용하거나 Override하는 경우가 있으므로 적용 내역을 명확히 저장해야 한다.

## 원칙

- Product Code는 Published Sub Code를 기본 호출한다.
- Sub Item은 source Sub Code Version을 기록한다.
- Attribute 적용 방식은 inherit/override/ignore/calculate로 구분한다.
- Sub Code 변경 시 Product Code 영향 분석을 수행한다.
- 조건부 적용과 Macro 계산은 이후 Rule Engine으로 확장한다.

