# Decision: BOM Code Center Panel

Date: 2026-05-08

## 결정

EDIM 중앙 Main Panel의 첫 핵심 업무 화면으로 BOM CODE를 집중 설계한다.

BOM CODE는 Product Code, Sub Code, Material, Drawing, Table, Macro, Work Process를 연결하여 자동 BOM을 생성하는 RCCS의 중심이다.

## 이유

EDIM의 핵심 가치는 CTO/ETO 제품 선택 후 자동 BOM, 도면, 기술자료, 견적, 승인자료를 생성하는 것이다.

그 첫 출발점은 Product Code와 Code Relationship을 기반으로 BOM을 자동 생성하는 BOM CODE 구조다.

## 원칙

- BOM CODE는 중앙 Main Panel에서 관리한다.
- 좌측 Hierarchy는 주소와 호출 기준으로 사용한다.
- 우측 Panel은 선택된 Code/Relationship/Run Line의 상세와 연결 자료를 표시한다.
- AI는 Relationship과 Rule을 제안하지만, 승인 후 적용한다.
- BOM Run은 Published Version을 기준으로 실행한다.

