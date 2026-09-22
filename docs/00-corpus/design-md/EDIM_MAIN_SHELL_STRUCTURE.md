# EDIM Main Shell Structure

Date: 2026-05-10

## Decision Summary

EDIM의 Main Shell은 Page 55를 기준으로 고정한다.

Main Shell 자체는 프로그램의 공통 골격이며, CPQ, PLM, ERP, BOM, Drawing, Approval, AI Macro 등 업무 변화는 Head와 Template Binding으로 처리한다.

## Fixed Layout

Main Shell은 다음 4개 구역으로 구성한다.

- 상단 Head 영역
- 좌측 Hierarchy / Work Template / Task 영역
- 중앙 Main UI 영역
- 우측 Sub Work Place Accordion 영역

이 구조는 모든 Head에서 유지한다. Head가 바뀌어도 화면의 기본 위치는 바뀌지 않고, 각 구역에 호출되는 Template만 바뀐다.

## Header

상단 Header에는 다음 항목을 둔다.

- Tenant Logo
- Head 목록
- Head 관리 바로가기
- 사용자 정보
- 현재 권한 표시
- 알림 / 승인 대기 / 작업 상태 표시

Head는 박스형 버튼보다 글씨 중심의 메뉴로 표시한다. Head 추가, 이동, 삭제, 비활성화, 하부 항목 관리는 EDIM Developer의 Head Registry에서 처리한다.

## Left Panel

좌측 Panel은 Head별 Hierarchy와 업무용 Template을 호출한다.

역할:

- Head별 Hierarchy 호출
- 공통 Hierarchy와 Head 전용 Hierarchy 구분
- 직접 편집 가능한 Tree와 호출 전용 Tree 구분
- 각 Node에 연결된 Code, Table, Drawing, Document, Macro, Workflow 표시
- Hierarchy 위치 변경 시 Stable ID로 연결 추적
- 하단에 일정, 해야 할 일, 후속 업무 알림 표시

주의:

Hierarchy는 Data 자체가 아니라 사용자가 Data를 찾는 주소이다. 실제 Data, File, Drawing, Table은 별도 DB/File Storage에서 관리하고, Hierarchy Node는 Stable ID로 연결한다.

## Center Main Panel

중앙 Main Panel은 실제 업무 실행 공간이다.

Head와 선택된 Hierarchy Node에 따라 다음 UI를 호출한다.

- CPQ: 견적, 기술자료, 승인도서
- PLM: Sub Code, Product Code, Relationship, BOM, Drawing
- ERP: 구매, 자재, 품질, 일정, Dashboard
- EDIM Developer: Head Registry, Global System Settings, Engine Adapter, Permission, Release

Main Panel은 다음 Template 유형을 지원한다.

- System Template
- Tenant Override Template
- User Custom Template

System Template은 직접 수정하지 않고 Fork/Override 방식으로 변경한다.

## Right Panel

우측 Panel은 Sub Work Place이며 Accordion 방식으로 구성한다.

기본 항목:

- Design Tool
- Coding List
- Table
- Relationship
- Sub Item
- BOM
- Drawing
- EDIM Run
- Approval / History

우측 Panel은 Head, 선택된 Hierarchy Node, 중앙 Main UI의 작업 상태에 따라 필요한 Accordion만 호출한다.

## Required Binding Data

Main Shell을 구현하기 위해 DB에 다음 연결 정보를 저장해야 한다.

- `head_registry`: Head 이름, 순서, 상태, 권한, Developer 관리 정보
- `hierarchy_node`: Parent ID, Stable ID, 이름, 비고, 종류, 상태
- `panel_binding`: Head와 좌측/중앙/우측 Template 연결
- `template_registry`: System, Tenant, User Template 구분과 Version
- `permission_point`: 보기, 작성, 수정, 승인, 실행 권한
- `audit_event`: 변경 이력, 위치 변경, Template 변경, 승인 이력

## Main Rule

Head를 선택하면 시스템은 다음 순서로 화면을 구성한다.

1. 사용자와 Tenant 권한 확인
2. 선택된 Head의 상태 확인
3. Head에 연결된 좌측 Hierarchy Template 호출
4. 선택된 Hierarchy Node 확인
5. Node에 연결된 중앙 Main Template 호출
6. Main Template에 필요한 우측 Accordion Template 호출
7. 권한 없는 Action은 숨기거나 비활성화
8. 변경 시 Audit와 Approval 조건 확인

## Open Design Items

- 좌측 Task 영역의 세부 항목
- Head별 기본 Template 목록
- User Custom Template 편집 범위
- 우측 Accordion의 상세 입력 방식
- Main Panel 하단 Action Bar 구성
- 권한 없는 기능의 표시 방식

