# Decision: Hierarchy as Data Address

Date: 2026-05-08

## 결정

EDIM의 Hierarchy는 단순 메뉴가 아니라 DB Address 역할을 하는 Core 데이터 구조로 설계한다.

29~35페이지의 Sub Code, Product Code, Code Relationship, Arrangement Code 구조는 EDIM 데이터 저장과 호출의 핵심으로 본다.

## 이유

EDIM에서는 제품 선택, BOM 생성, 도면 호출, Macro 실행, 문서 생성, 견적 계산이 모두 코드와 Hierarchy를 기준으로 연결된다.

Hierarchy가 불안정하면 데이터 위치, 권한, Template 호출, EDIM Run이 모두 흔들린다.

## 원칙

- 모든 중요한 데이터는 Hierarchy Address를 가질 수 있어야 한다.
- CodeGroup은 HierarchyNode에 연결된다.
- CodeDefinition은 CodeGroup 아래에 저장된다.
- CodeRelationship은 BOM, 도면, 문서, Macro, Table 연결을 정의한다.
- Hierarchy 삭제는 제한하고, 비활성화를 우선한다.
- Hierarchy 이동과 변경은 Audit Log에 기록한다.

## 영향

Hierarchy 관리 기능은 EDIM Core에서 매우 높은 우선순위로 구현한다.

CPQ와 PLM은 이 Hierarchy Address와 Code Relationship 위에서 동작한다.

