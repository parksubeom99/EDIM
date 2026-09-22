# EDIM Panel Component DB And Panel Template Builder

Date: 2026-05-10

## Purpose

EDIM Main Shell의 좌측, 중앙, 우측 Panel은 Head와 Head 하위 항목에 따라 달라진다.

이를 직관적으로 관리하기 위해 먼저 Panel Component DB를 만들고, EDIM Developer에서 Head 하위 항목을 선택한 뒤 좌/중/우 Panel 부품을 조합하여 Panel Template을 저장한다.

## Core Idea

Template을 완성한 뒤 연결하는 방식이 아니라, 다음 순서로 진행한다.

1. 좌/중/우 Panel을 구성하는 공통 Component를 DB에 등록
2. Head와 Head 하위 항목을 선택
3. Left Panel Component 조합 선택
4. Center Main Component 선택
5. Right Panel Component 조합 선택
6. 권한, 편집 정책, 상태, 비고 저장
7. 실제 UI Template 구현은 이후 Component ID에 연결

## Prototype Scope

현재 Prototype에서는 EDIM Developer > Permission / Template > Panel Template Builder에 다음 기능을 추가했다.

- Panel Component DB 표시
- Head 선택
- Head 하위 항목 / Hierarchy Node 선택
- Left Panel Component 다중 선택
- Center Component 단일 선택
- Right Panel Component 다중 선택
- Template 이름, 상태, 권한, 편집 정책, 비고 입력
- Template Preview 표시
- Head 하위 항목별 Template Registry Summary 표시
- LocalStorage 기반 저장

## Panel Component DB

현재 기본 Component 영역은 다음과 같다.

### Left Panel

- Hierarchy Tree
- Search / Filter
- Asset Badge
- Task / Schedule

### Center Panel

- BOM Code Workspace
- Sub Code Registry
- Product Code Builder
- Relationship Runner
- Drawing Setup Workspace
- ERP Dashboard
- Developer Console

### Right Panel

- Design Tool
- Coding List
- Table
- Relationship
- BOM
- Drawing
- EDIM Run
- Approval / History

## Future DB Tables

실제 구현에서는 다음 DB 구조로 확장한다.

### panel_component_registry

- component_id
- area: Left / Center / Right
- component_name
- purpose
- status
- risk
- system_owner
- version

### panel_template_registry

- template_id
- template_name
- target_head_id
- target_node_id
- status
- required_permission
- edit_policy
- remark
- version
- updated_at

### panel_template_component

- template_id
- component_id
- area
- display_order
- config_json

### panel_template_history

- history_id
- template_id
- changed_by
- change_type
- before_json
- after_json
- changed_at

## Guardrails

- Head 자체뿐 아니라 Head 하위 항목별로 Panel Template을 가질 수 있어야 한다.
- Panel Template은 Planned, Draft, Review, Published, Deprecated 상태를 가져야 한다.
- Published Template 변경은 승인과 Audit을 거쳐야 한다.
- Template 이름이나 위치가 바뀌어도 내부 연결은 template_id와 component_id로 추적한다.
- Tenant Custom Template은 System Template을 직접 수정하지 않고 Fork / Override 방식으로 만든다.

