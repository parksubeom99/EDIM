# EDIM Developer Configuration Tree Model

Date: 2026-05-09

## Purpose

EDIM Developer(ED)의 좌측 패널은 단순 작업 목록이 아니라, 시스템 전체 설정을 관리하는 Configuration Directory Tree로 구성한다.

이 구조는 컴퓨터의 Directory 관리 방식처럼 부모 항목 아래에 하위 항목을 계속 추가할 수 있어야 한다. CPQ, PLM, ERP, BOM, Drawing, Macro, Approval 등 엔진이 늘어나더라도 ED의 설정 항목이 동일한 방식으로 확장되도록 한다.

## Core Structure

- ED 좌측 패널은 parent_id 기반의 Tree 구조를 가진다.
- 각 항목은 Folder 또는 Setting Node가 될 수 있다.
- 깊이 제한을 두지 않고 필요 시 계속 하위 항목을 추가한다.
- 선택된 항목의 상세 설정 화면은 중앙 패널에 호출된다.
- 우측 패널에는 선택된 설정 항목과 관련된 Template, Asset, History, Approval 정보를 호출한다.

## Initial Directory Groups

- Platform Structure
- Permission / Template
- Engine / Adapter
- Operations / Release

각 그룹 아래에는 다음과 같은 전역 설정 항목이 연결된다.

- Core Engine Registry
- Global System Settings
- Module / Head Registry
- Permission Point Catalog
- Template Schema Manager
- Rule / Macro Engine
- CAD / Drawing Adapter
- SaaS Tenant Operations
- Release / Audit Control

## Operation Rules

- `+`는 선택된 ED 설정 항목 아래에 하위 항목을 추가한다.
- 접기/펼치기 기능으로 설정 그룹을 Directory처럼 관리한다.
- 동일 부모 안에서 항목 이동이 가능해야 한다.
- Folder를 이동할 때 하위 항목도 함께 이동되어야 한다.
- Folder를 비활성화할 때 하위 설정도 함께 비활성화하는 것이 기본이다.
- 삭제는 Asset, Template, Permission, Engine 연결 상태를 먼저 검사한 뒤 처리한다.
- 연결 자료가 있는 경우 실제 삭제 대신 비활성화한다.

## Distinction From Data Hierarchy

ED Configuration Tree와 일반 업무 Hierarchy는 목적이 다르다.

- Data Hierarchy: Code, 도면, Table, 문서, BOM 자료를 찾기 위한 업무 주소 역할
- ED Configuration Tree: EDIM 전체의 Head, Template, Permission, Engine, Adapter, Release 설정을 관리하는 시스템 설정 주소 역할

두 구조 모두 Tree 형태를 사용하지만, ED Configuration Tree는 사용자가 생산한 업무 Data의 저장 주소가 아니라 시스템 설정의 관리 주소이다.

## Guardrails

- 모든 ED 설정 항목은 stable id를 가져야 한다.
- 표시 이름이나 위치가 바뀌어도 내부 연결은 stable id로 추적한다.
- ED 설정 변경은 Audit History에 기록한다.
- 고위험 설정 변경은 Approval Workflow를 통해 승인 후 적용한다.
- Tenant별 설정 Override가 가능한 항목과 Developer Only 항목을 구분한다.

