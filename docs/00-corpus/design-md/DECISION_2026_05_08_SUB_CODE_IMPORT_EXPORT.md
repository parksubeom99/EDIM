# Decision: Sub Code Import and Export Safety

Date: 2026-05-08

## 결정

Sub Code는 Excel로 Export/Import할 수 있게 한다.

단, Import된 데이터는 즉시 DB에 반영하지 않고 Import Staging, 비교, 영향 분석, 검토, 승인 후 적용한다.

## 이유

Sub Code는 Product Code, Part Relationship, BOM Run, Drawing, Table, Macro, Cost의 기준 데이터다.

기존 등록 데이터가 덮어써지거나 잘못 변경되면 EDIM 전체 자동 BOM 구조에 큰 혼란이 생길 수 있다.

## 원칙

- Export 파일에는 stable_key와 checksum을 포함한다.
- Import 시 기존 데이터와 대조한다.
- 신규/변경/중복/오류를 분류한다.
- Product Code와 연결된 Sub Code는 직접 덮어쓰지 않는다.
- Major Change는 새 Version 또는 Change Request로 처리한다.
- 모든 Import와 적용 결과는 Audit Log에 남긴다.

