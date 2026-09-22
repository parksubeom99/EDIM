# EDIM Hierarchy Guardrails Review

Date: 2026-05-08

이 문서는 EDIM의 Hierarchy 구조가 Data 저장 주소와 사용자 탐색 구조로 사용될 때 모순이 없는지 검토하고, 반드시 지켜야 할 설계 원칙을 정리합니다.

## 핵심 결론

현재 설계한 Hierarchy 방향은 타당합니다.

다만 Hierarchy가 메뉴, 폴더, 실제 DB 저장소, BOM 구조로 혼합되면 이후 Sub Code, Product Code, Relationship, 도면, 문서, 승인 이력에서 큰 혼란이 발생할 수 있습니다.

따라서 EDIM의 Hierarchy는 다음 역할로 제한합니다.

```text
Hierarchy = Data Address + User Navigation + Template Calling Point + Permission Scope
```

실제 데이터는 Hierarchy 안에 저장하지 않고 별도 Entity로 관리합니다.

```text
HierarchyNode
→ HierarchyAssetLink
→ Code / Table / Drawing / Document / Macro / File / Workflow / Template
```

## 현재 설계에서 좋은 점

현재 구조는 다음 점에서 안정적입니다.

- Hierarchy를 단순 메뉴가 아니라 Data Address로 정의했습니다.
- 실제 Data, Code, Table, Drawing, Document, Macro를 별도 Entity로 분리했습니다.
- Hierarchy와 실제 자료는 `HierarchyAssetLink`로 연결합니다.
- Head별 직접 Hierarchy와 공통 Shared Hierarchy를 구분했습니다.
- Hierarchy 위치 변경은 `HierarchyPathHistory`와 `AuditLog`로 추적합니다.
- 과거 주소 보호를 위해 Alias / Redirect 구조를 고려했습니다.
- 사용자가 자료를 쉽게 찾도록 Visual Asset Map, Badge, Preview 구조를 준비했습니다.

## 반드시 지켜야 할 원칙

### 1. Path는 표시용이고 영구 연결 키가 아니다

`/PLM/Code Management/Sub Code/Fan` 같은 Path는 사용자가 보기 좋고 검색하기 쉬운 주소입니다.

그러나 실제 DB 연결은 Path에 의존하면 안 됩니다.

실제 연결에는 다음 값을 사용합니다.

- `hierarchy_node_id`
- `hierarchy_definition_id`
- `stable_key`
- `address_key`
- 대상 Asset의 고유 `asset_id`

이렇게 해야 이름 변경, 위치 이동, Head 재배치가 발생해도 Code, Drawing, Table, Macro, Approval, EDIM Run 이력이 깨지지 않습니다.

### 2. Hierarchy는 실제 데이터를 저장하지 않는다

Hierarchy는 다음을 저장하지 않습니다.

- Sub Code 본문
- Product Code 본문
- Drawing 원본 파일
- Table 실제 데이터
- Macro Script
- Approval 문서 본문
- BOM Run 결과

Hierarchy는 해당 자료가 어느 업무 주소에 연결되어 있는지만 관리합니다.

### 3. Hierarchy와 BOM Relationship은 별도 구조다

Hierarchy Tree와 BOM Relationship은 비슷하게 보일 수 있지만 같은 구조가 아닙니다.

```text
Hierarchy = 사용자가 찾고 관리하기 쉬운 주소 구조
CodeRelationship = 실제 모자 관계와 BOM 생성 구조
```

자동 BOM, Part List Running Test, Product Code Relationship은 Hierarchy Tree가 아니라 `CodeRelationship`을 기준으로 실행해야 합니다.

Hierarchy는 CodeRelationship을 찾는 출발점이 될 수 있지만, BOM 생성의 직접 기준이 되어서는 안 됩니다.

### 4. 삭제보다 비활성화가 기본이다

HierarchyNode에 다음 중 하나라도 연결되어 있으면 삭제하지 않습니다.

- Code
- Table
- Drawing
- Document
- Macro
- Template
- Approval Workflow
- EDIM Run History
- Audit Log
- Project / Quotation / BOM / Drawing Output

기본 정책:

```text
연결 자료 없음 → 삭제 가능
연결 자료 있음 → 비활성화 또는 숨김
운영 이력 있음 → 삭제 금지
```

필요하면 대체 Node로 이관하고 Redirect를 생성합니다.

### 5. 이동과 이름 변경은 영향 분석 후 처리한다

Hierarchy가 DB Address 역할을 하므로 이동과 이름 변경은 단순 UI 작업이 아닙니다.

변경 전 반드시 다음 영향을 확인합니다.

- 연결된 Code 수
- 연결된 Table / Drawing / Document / Macro 수
- 연결된 Template 수
- 연결된 Permission 수
- 연결된 Approval Workflow 수
- 진행 중인 EDIM Run 여부
- Published Code 사용 여부
- 다른 Head에서 참조 중인지 여부

운영 자료가 연결된 경우 변경 요청과 승인 절차를 거칩니다.

### 6. Shared Hierarchy 변경은 더 엄격하게 관리한다

Shared Hierarchy는 여러 Head에서 동시에 호출될 수 있습니다.

예:

```text
Common Project
→ CPQ에서 사용
→ PLM에서 사용
→ ERP에서 사용
→ Dashboard에서 사용
```

따라서 Shared Hierarchy 수정 전에는 영향받는 Head, Template, Permission, Asset, EDIM Run 범위를 보여줘야 합니다.

### 7. 사용자 탐색 기능은 Tree만으로 부족하다

EDIM의 자료가 많아지면 Tree만으로는 찾기 어렵습니다.

따라서 다음 기능을 함께 준비합니다.

- 검색
- 필터
- 즐겨찾기
- 최근 사용 위치
- 담당 업무 위치
- Asset Badge
- 승인 상태 표시
- 누락 자료 표시
- Related Asset 보기
- Relationship Graph 보기

이 기능들은 Hierarchy를 사용자 친화적인 Data Address로 만들기 위해 필요합니다.

## 권장 데이터 모델 보완

### HierarchyNode

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_definition_id`
- `parent_id`
- `code`
- `name`
- `current_path`
- `node_type`
- `address_key`
- `stable_key`
- `sort_order`
- `status`
- `security_level`
- `owner_user_id`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### HierarchyAssetLink

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `asset_type`
- `asset_id`
- `usage_type`
- `is_primary`
- `sort_order`
- `status`
- `linked_by`
- `linked_at`

### HierarchyPathHistory

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `old_parent_id`
- `new_parent_id`
- `old_path`
- `new_path`
- `change_type`
- `reason`
- `impact_summary`
- `changed_by`
- `changed_at`

### HierarchyChangeRequest

운영 자료가 연결된 Hierarchy 변경을 위한 요청입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `change_type`
- `requested_change`
- `reason`
- `impact_summary`
- `approval_workflow_id`
- `status`
- `requested_by`
- `requested_at`
- `approved_by`
- `approved_at`

## 검증 규칙

Hierarchy 변경 전 검증해야 할 항목:

- 같은 Parent 아래 중복 Code / Name 여부
- 순환 구조 발생 여부
- 최대 표시 깊이 초과 여부
- 연결 Asset 존재 여부
- Published Code 연결 여부
- 진행 중인 Run 존재 여부
- 다른 Head의 참조 여부
- 권한 상속 변경 여부
- Template 호출 경로 변경 여부
- Redirect 생성 필요 여부

## MVP 반영 범위

첫 구현에서는 다음을 반영합니다.

- HierarchyNode와 실제 Asset 분리
- Path와 Stable ID 분리
- HierarchyAssetLink
- 연결 자료가 있는 Node 삭제 제한
- 이동 / 이름 변경 Audit Log
- 기본 Asset Badge
- 선택 Node의 Asset Summary

다음 단계에서 확장합니다.

- HierarchyChangeRequest
- 영향 분석 화면
- Shared Hierarchy 영향 범위 표시
- Alias / Redirect 자동 생성
- Relationship Graph
- Hierarchy 변경 승인 Workflow

## 최종 원칙

EDIM에서 Hierarchy는 사용자가 데이터를 쉽게 찾고 업무를 호출하기 위한 주소 체계입니다.

하지만 실제 데이터 저장, BOM 생성 관계, 승인 이력, Run 결과는 Hierarchy 내부가 아니라 별도 Entity와 Relationship으로 관리합니다.

```text
Hierarchy = Address
Asset Entity = Data
HierarchyAssetLink = Connection
CodeRelationship = BOM / Part Relationship
AuditLog + PathHistory = Change Tracking
Approval = Controlled Change
```

이 원칙을 지키면 Hierarchy를 자유롭게 확장하면서도 Sub Code, Product Code, Drawing, Document, BOM Run 이력을 안전하게 유지할 수 있습니다.
