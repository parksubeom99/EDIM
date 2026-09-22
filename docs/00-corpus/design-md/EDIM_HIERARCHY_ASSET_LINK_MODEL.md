# EDIM Hierarchy Asset Link Model

이 문서는 Hierarchy와 실제 데이터, 테이블, 도면, 문서, Macro를 연결하는 방식을 정의합니다.

## 핵심 결정

Hierarchy는 실제 데이터를 저장하지 않습니다.

Hierarchy는 주소, 분류, 호출 기준으로만 사용합니다.

실제 데이터는 별도 엔티티에서 관리하고, Hierarchy와 실제 데이터는 Link 또는 Binding으로 연결합니다.

```text
HierarchyNode
→ HierarchyAssetLink
→ Data / Table / Drawing / Document / Macro / Code
```

## 이유

Hierarchy에 실제 데이터를 직접 종속시키면 다음 문제가 생깁니다.

- Hierarchy 이동 시 데이터 위치가 흔들림
- 하나의 자료를 여러 Hierarchy에서 재사용하기 어려움
- 도면/문서/테이블 Revision 관리가 어려움
- 권한 관리가 복잡해짐
- 과거 승인/문서 이력이 깨질 위험이 있음

따라서 Hierarchy는 주소 역할만 하고, 데이터는 독립적으로 관리합니다.

## 기본 구조

```text
HierarchyNode
  id
  current_path
  node_type
  status

HierarchyAssetLink
  hierarchy_node_id
  asset_type
  asset_id
  usage_type
  status

Asset Entity
  CodeDefinition
  TableDefinition
  DrawingRecord
  DocumentRecord
  MacroDefinition
  FileAsset
```

## HierarchyNode

주소와 분류를 담당합니다.

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
- `status`
- `created_at`
- `updated_at`

## HierarchyAssetLink

Hierarchy와 실제 데이터의 연결 정보입니다.

주요 필드:

- `id`
- `tenant_id`
- `hierarchy_node_id`
- `asset_type`
- `asset_id`
- `usage_type`
- `sort_order`
- `is_primary`
- `status`
- `created_by`
- `created_at`

`asset_type` 예:

- `code_definition`
- `table_definition`
- `drawing_record`
- `document_record`
- `macro_definition`
- `file_asset`
- `workflow_definition`
- `template_definition`

`usage_type` 예:

- `primary`
- `reference`
- `source`
- `output`
- `preview`
- `approval_target`
- `run_input`
- `run_output`

## HierarchyPathHistory

Hierarchy 주소 변경 이력입니다.

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
- `changed_by`
- `changed_at`

`change_type` 예:

- `rename`
- `move`
- `reorder`
- `disable`
- `restore`

## Redirect / Alias

과거 주소로 접근했을 때 새 주소를 찾을 수 있도록 Alias 구조를 둡니다.

주요 필드:

- `id`
- `tenant_id`
- `old_path`
- `new_hierarchy_node_id`
- `status`
- `created_at`

필요한 이유:

- 과거 문서 링크
- 승인 이력
- Audit Log
- 외부 공유 링크
- 사용자 북마크

## 변경 추적 원칙

Hierarchy 변경 시 반드시 다음을 기록합니다.

- 변경 전 Path
- 변경 후 Path
- 변경 전 Parent
- 변경 후 Parent
- 변경자
- 변경 시간
- 변경 이유
- 영향받는 Link 수
- 영향받는 Template / Macro / Document / Drawing 수

## 삭제 원칙

HierarchyNode에 연결된 Asset이 있으면 삭제하지 않습니다.

기본 원칙:

- 연결 Asset 없음: 삭제 가능
- 연결 Asset 있음: 비활성화
- 과거 승인/문서/Audit Log 참조 있음: 삭제 금지

## EDIM Run과의 관계

EDIM Run은 Hierarchy Path 문자열만 믿지 않습니다.

EDIM Run은 `hierarchy_node_id`와 `HierarchyAssetLink`를 기준으로 필요한 Code, Table, Drawing, Macro, Document를 찾습니다.

이렇게 해야 Path가 변경되어도 EDIM Run 결과가 안정적으로 유지됩니다.

## 권한과의 관계

권한 판정은 두 단계로 처리합니다.

1. 사용자가 HierarchyNode에 접근 가능한가?
2. 연결된 Asset에 접근 가능한가?

예:

```text
사용자는 PLM Hierarchy를 볼 수 있다.
하지만 특정 DrawingRecord는 보안 등급 때문에 볼 수 없다.
```

## MVP 반영 범위

첫 구현에서는 다음을 준비합니다.

- HierarchyNode와 Asset 분리
- HierarchyAssetLink
- HierarchyPathHistory
- 삭제 대신 비활성화
- Hierarchy 변경 Audit Log

Redirect/Alias와 영향 범위 상세 분석은 이후 단계에서 확장합니다.

## 결정 사항

Hierarchy는 주소로만 사용합니다.

DB 실제 데이터는 별도 엔티티에서 관리합니다.

Hierarchy와 데이터는 Link/Binding으로 연결합니다.

Hierarchy 위치, 이름, 상태 변경은 반드시 추적합니다.

