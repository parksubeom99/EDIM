# EDIM Panel Binding Registry Model

Date: 2026-05-10

## Purpose

Head ↔ Panel Binding은 Head를 선택했을 때 Main Shell의 좌측, 중앙, 우측 Panel에 어떤 Template을 호출할지 저장하는 연결 DB이다.

Template 자체가 아직 완성되지 않아도 Template 이름, 종류, 상태, 호출 위치를 먼저 등록할 수 있다. 이후 실제 UI Template을 만들면 같은 ID 또는 이름에 구현체를 연결한다.

## Core Idea

Main Shell은 고정하고, Head별 업무 차이는 Panel Binding으로 처리한다.

예:

- Head: PLM
- Left Panel: PLM Code Hierarchy Template
- Center Main Panel: PLM BOM Code Main Template
- Right Panel: Design Tool Accordion Group
- Right Accordion Modules: Design Tool, Coding List, Table, Relationship, BOM, Drawing, EDIM Run, Approval / History
- Permission: code.create
- Status: Planned / Draft / Review / Published

## Required Registries

### Template Registry

Template 자체의 목록을 관리한다.

- Template ID
- Template Name
- Template Type: Left, Main, Right Group, Accordion Module
- System / Tenant / User 구분
- Version
- Status
- Edit Policy
- Remark

### Panel Binding Registry

Head와 Panel Template을 연결한다.

- Binding ID
- Head ID
- Left Template
- Main Template
- Right Template Group
- Right Accordion Modules
- Default Hierarchy
- Required Permission
- Edit Policy
- Status
- Remark
- Updated At

## Prototype Implementation

현재 Prototype에서는 EDIM Developer > Module / Head Registry 화면에 Panel Binding Registry를 추가했다.

가능한 작업:

- Head별 Left Panel Template 선택
- Head별 Center Main Template 선택
- Head별 Right Panel Group 선택
- 우측 Accordion Module 조합 선택
- 기본 Hierarchy 선택
- Required Permission 선택
- Edit Policy 선택
- Binding Status 선택
- Remark 입력
- Panel Binding 저장
- 전체 Head의 Binding Matrix 확인

## Design Rule

Template이 아직 구현되지 않아도 Binding은 먼저 등록한다.

이 방식의 장점:

- Head가 많아져도 Main Shell 구조가 흔들리지 않는다.
- Template 구현 전에도 전체 호출 관계를 검토할 수 있다.
- 권한, 승인, Audit을 Template 연결 수준에서 미리 설계할 수 있다.
- CPQ, PLM, ERP, BOM, Drawing, AI Macro를 순차적으로 붙일 수 있다.

## Guardrails

- System Template은 직접 수정하지 않는다.
- Tenant별 수정은 Override 또는 Fork 방식으로 처리한다.
- Published Binding 변경은 승인과 Audit이 필요하다.
- Head 삭제 또는 비활성화 전 Binding 영향 분석이 필요하다.
- Binding은 이름이 아니라 Stable ID 기준으로 추적해야 한다.

