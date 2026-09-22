# Decision: Hierarchy Visual Asset Map

Date: 2026-05-08

## 결정

EDIM에는 Hierarchy 각 위치에 연결된 Code, Table, Drawing, Document, Macro, File을 시각적으로 표시하는 `Hierarchy Visual Asset Map` 기능을 둔다.

## 이유

Hierarchy는 EDIM의 Data Address 역할을 한다.

사용자는 각 위치에 어떤 데이터와 자료가 연결되어 있는지 빠르게 식별해야 하며, 자동 BOM과 Code Relationship을 이해하려면 시각화가 중요하다.

## 원칙

- 초기에는 Tree Badge와 Asset Summary를 제공한다.
- 우측 Panel에서 선택된 Node의 연결 자료를 표시한다.
- 누락/오류/승인 상태를 Badge로 표시한다.
- 권한이 없는 자료는 상세를 숨긴다.
- 이후 Relationship Graph, Thumbnail, Heatmap으로 확장한다.

