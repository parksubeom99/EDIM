# Decision: Hierarchy and Asset Separation

Date: 2026-05-08

## 결정

Hierarchy는 주소와 분류로만 사용하고, 실제 Data, Table, Drawing, Document, Macro, Code는 별도 엔티티에서 관리한다.

Hierarchy와 실제 데이터는 Link 또는 Binding으로 연결한다.

Hierarchy의 위치, 이름, 상태 변경은 반드시 추적한다.

## 이유

Hierarchy에 실제 데이터를 직접 저장하거나 강하게 종속시키면, Hierarchy 이동/변경 시 데이터 참조가 깨질 수 있다.

EDIM은 장기간 운영되는 SaaS이므로 과거 승인, 문서, 도면, 견적, Audit Log가 안정적으로 유지되어야 한다.

## 원칙

- 내부 참조는 `hierarchy_node_id`를 사용한다.
- `path`는 표시와 검색용 주소로 사용한다.
- 실제 데이터는 독립 엔티티로 관리한다.
- Hierarchy와 데이터는 `HierarchyAssetLink`로 연결한다.
- Hierarchy 변경은 `HierarchyPathHistory`와 `AuditLog`에 기록한다.
- 연결 데이터가 있는 Hierarchy는 삭제보다 비활성화를 우선한다.

