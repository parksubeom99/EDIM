# EDIM Head Tree Workflow Prototype - 2026-05-10

## 결정 내용

EDIM Developer의 `Head Tree Management`는 다음의 3단계 작업 흐름으로 확정한다.

1. 좌측 EDIM Developer Tree에서 `Head Tree Management`를 선택한다.
2. 중앙 판넬 왼쪽에 현재 Head Tree를 Windows Tree 방식으로 표시한다.
3. 중앙 Head Tree에서 Head 또는 하위 Node를 선택하면, 중앙 판넬 가운데에 해당 Node의 설정 항목 Tree를 표시한다.
4. 설정 항목을 선택하면 중앙 판넬 오른쪽에 세부 설정 Template을 표시하고 저장할 수 있게 한다.

## Main Shell 원칙과의 관계

- 좌측 판넬: EDIM Developer의 작업 Directory 역할.
- 중앙 판넬: 실제 진행할 작업 내용과 설정 Template 표시.
- 우측 판넬: 선택 Hierarchy 또는 설정 항목의 보조 정보, 승인, 이력, 자료 표시.

이 구조는 Main Shell의 기본 원칙인 `좌측 주소 Tree`, `중앙 업무 실행`, `우측 세부 작업`과 일치한다.

## Prototype 반영

현재 Prototype에는 다음 기능을 반영했다.

- `Head Tree Management` 선택 시 중앙에 Head Tree Workbench 표시.
- Head Tree Workbench는 좌측 EDIM Developer Tree를 복제하지 않는다.
- Workbench의 첫 영역은 전체 Head 목록과 선택된 Head의 하위 구조만 보여준다.
- 선택된 Head 또는 하위 Node에 대해 접기/펼치기, 선택, 위/아래 이동 흐름을 가진다.
- 선택된 Head 또는 하위 Node에 대해 설정 항목 Tree를 표시한다.
- 설정 항목:
  - Head 기본 정보
  - Tree 구조 / 이동
  - 표시 순서 / 노출
  - 좌/중/우 Panel Binding
  - 권한
  - 승인 / 이력
  - 영향 분석
  - Data / File 연결
- 기본 정보, Panel Binding, 권한, 승인 정보, Asset Link는 Prototype 저장 방식으로 저장 가능하다.

## 향후 실제 구현 시 주의사항

- 현재 저장은 Browser `localStorage` 기반 JSON이므로 실제 SaaS DB가 아니다.
- 실제 구현에서는 PostgreSQL의 HeadTree, HeadTreeNode, HeadTreeSetting, PanelBinding, Permission, ApprovalHistory, AuditLog Table로 분리해야 한다.
- Head Tree 위치 변경은 `stable_id`를 유지하고 `path_history`에 old/new path를 저장해야 한다.
- Published 전에는 Draft 상태로만 편집하고, 승인 후 실제 업무 화면에 반영해야 한다.
- Drag and Drop과 우클릭 메뉴는 다음 단계에서 실제 동작으로 확장한다.
