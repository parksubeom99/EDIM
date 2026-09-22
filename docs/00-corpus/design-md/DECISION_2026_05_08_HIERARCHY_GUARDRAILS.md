# Decision: Hierarchy Guardrails

Date: 2026-05-08

## Status

Accepted

## Decision

EDIM의 Hierarchy는 실제 데이터를 저장하는 구조가 아니라 Data Address와 사용자 탐색 구조로 사용한다.

Hierarchy는 다음 역할을 가진다.

```text
Data Address
User Navigation
Template Calling Point
Permission Scope
EDIM Run Context
```

실제 Code, Table, Drawing, Document, Macro, File, Workflow, Template은 별도 Entity로 관리하고, Hierarchy와는 `HierarchyAssetLink`로 연결한다.

## Key Rules

- `path`는 표시와 검색용이며, 실제 연결 키가 아니다.
- 실제 연결은 `hierarchy_node_id`, `stable_key`, `address_key`, `asset_id`를 사용한다.
- Hierarchy와 BOM Relationship은 분리한다.
- 자동 BOM은 Hierarchy Tree가 아니라 `CodeRelationship` 기준으로 생성한다.
- 연결 자료가 있는 HierarchyNode는 삭제하지 않고 비활성화하거나 이관한다.
- Hierarchy 이동, 이름 변경, 구조 변경은 영향 분석과 Audit Log를 거친다.
- Shared Hierarchy 변경은 연결된 Head, Template, Permission, Asset, EDIM Run 범위를 확인한 후 처리한다.
- 운영 자료가 연결된 Node 변경은 승인 절차를 거칠 수 있어야 한다.

## Rationale

EDIM의 Hierarchy는 사용자가 자료를 쉽게 찾고 업무 화면을 호출하기 위한 핵심 주소 체계이다.

하지만 Hierarchy를 실제 데이터 저장소나 BOM 구조로 사용하면 다음 문제가 발생한다.

- 위치 변경 시 Code / Drawing / Document 연결이 깨질 수 있음
- Product Code와 Sub Code Relationship 추적이 어려워짐
- 과거 승인, 견적, BOM Run 결과 재현이 어려워짐
- Shared Hierarchy 변경이 여러 Head에 예기치 않은 영향을 줄 수 있음
- 권한과 Template 호출 구조가 복잡하게 꼬일 수 있음

따라서 Hierarchy는 주소로 제한하고, 실제 데이터와 BOM 관계는 별도 모델로 관리한다.

## Consequences

이 결정에 따라 EDIM의 기본 구조는 다음처럼 유지한다.

```text
HierarchyNode
→ HierarchyAssetLink
→ Asset Entity

Product Code / Sub Code
→ CodeRelationship
→ BOM Run / Part List Running Test
```

향후 구현 시 Hierarchy 변경 기능에는 다음 안전장치가 필요하다.

- Impact Analysis
- Delete Restriction
- Path History
- Alias / Redirect
- Audit Log
- Permission Check
- Approval Workflow

## Related Documents

- `EDIM_HIERARCHY_ADDRESS_CODE_MODEL.md`
- `EDIM_HIERARCHY_ASSET_LINK_MODEL.md`
- `EDIM_LEFT_HIERARCHY_BINDING_MODEL.md`
- `EDIM_HIERARCHY_VISUAL_ASSET_MAP_MODEL.md`
- `EDIM_CODE_GOVERNANCE_APPROVAL_MODEL.md`
