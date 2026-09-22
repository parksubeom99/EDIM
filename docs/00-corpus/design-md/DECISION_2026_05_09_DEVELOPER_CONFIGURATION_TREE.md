# Decision: EDIM Developer Uses Directory-Style Configuration Tree

Date: 2026-05-09

## Decision

EDIM Developer(ED)의 좌측 패널은 단순 목록이 아니라 컴퓨터 Directory와 같은 Tree 구조로 구성한다.

선택된 설정 항목 아래에 하위 항목을 계속 추가할 수 있으며, 각 항목을 선택하면 중앙 패널에서 해당 설정 화면을 호출한다.

## Reason

ED는 Head, Hierarchy 관계, Template, Permission, Engine, Adapter, Release 등 프로그램 전체에 영향을 주는 설정을 관리한다. 단순 목록으로 만들면 항목이 늘어날수록 관리가 어려워지고, CPQ/PLM/ERP 엔진이 추가될 때 구조가 쉽게 무너진다.

따라서 ED 설정 자체도 Hierarchy처럼 parent/child 구조로 관리한다.

## Prototype Update

- ED 좌측 패널을 parent/child 기반 Configuration Tree로 변경
- Platform Structure, Permission / Template, Engine / Adapter, Operations / Release 기본 Folder 추가
- 선택 항목 아래에 하위 설정을 계속 추가할 수 있도록 `+` 동작 변경
- Tree 깊이 제한 제거
- Folder 접기/펼치기 기능 추가
- 동일 부모 내 이동 시 하위 항목을 함께 이동하도록 처리
- 비활성화/삭제 검사 시 하위 항목도 함께 보호하도록 처리

## Open Items

- Folder 전용 중앙 Overview 화면
- 설정 항목별 권한 Point 상세화
- 설정 변경 승인 Workflow 연결
- 설정 변경 Audit History 화면
- Tenant Override 가능 항목과 Developer Only 항목 구분 UI

