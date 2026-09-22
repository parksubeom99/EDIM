# EDIM Developer Console Head Model

Date: 2026-05-09

이 문서는 EDIM Head에 개발자 전용 시스템 관장 통로를 두는 구조를 정의합니다.

## 핵심 결정

EDIM에는 일반 Tenant 관리자가 사용하는 `System Setup`과 별도로, EDIM 개발자 또는 플랫폼 운영자만 접근할 수 있는 `EDIM Developer` Head를 둡니다.

```text
System Setup = 사용자 회사 관리자가 자기 회사 설정을 관리
EDIM Developer = EDIM 플랫폼 개발자/운영자가 전체 시스템 기능을 관장
```

이 둘을 분리해야 SaaS 환경에서 회사별 관리 권한과 EDIM 제품 자체의 개발/운영 권한이 섞이지 않습니다.

## 목적

`EDIM Developer` Head의 목적은 다음입니다.

- EDIM Core Engine 설정
- Module / Head Registry 관리
- PermissionPoint Catalog 관리
- Template Schema 관리
- Data Dictionary 기본 구조 관리
- Rule / Macro Engine 관리
- CAD / Drawing Adapter 관리
- SaaS Tenant 운영 설정
- Release / Audit Control
- System Guardrail 관리

## 초기 Hierarchy 후보

```text
EDIM Developer
├─ Core Engine Registry
├─ Module / Head Registry
├─ Permission Point Catalog
├─ Template Schema Manager
├─ Rule / Macro Engine
├─ CAD / Drawing Adapter
├─ SaaS Tenant Operations
└─ Release / Audit Control
```

## System Setup과의 차이

### System Setup

Tenant 관리자 또는 회사 관리자가 접근합니다.

주요 관리 대상:

- 회사 사용자
- 부서
- 권한 배정
- Tenant Branding
- 회사별 Approval Workflow
- 회사별 Template Override
- 회사별 Hierarchy 관리

### EDIM Developer

EDIM 개발자, 플랫폼 운영자, 시스템 최고 관리자만 접근합니다.

주요 관리 대상:

- EDIM Core 구조
- 기본 Module과 Head 정의
- PermissionPoint 원본 Catalog
- System Template 원본
- Rule Engine / Macro Engine 설정
- CAD Adapter / External API Adapter
- SaaS Tenant 생성/정지/운영 정책
- Release Version
- Global Audit / Error Log

## 권한 원칙

`EDIM Developer` Head는 일반 Tenant 사용자에게 보이지 않아야 합니다.

접근 가능 사용자:

- EDIM Platform Developer
- EDIM Platform Owner
- EDIM System Super Admin
- 제한적으로 승인된 Support Engineer

관련 PermissionPoint:

- `developer_console.view`
- `developer_console.configure`
- `core_engine.configure`
- `module_registry.manage`
- `permission_point.manage`
- `system_template.manage`
- `rule_engine.configure`
- `macro_engine.configure`
- `cad_adapter.configure`
- `tenant_ops.manage`
- `release_control.manage`
- `global_audit.view`

## 안전장치

EDIM Developer Head에서 변경하는 내용은 전체 Tenant에 영향을 줄 수 있습니다.

따라서 다음 안전장치가 필요합니다.

- 변경 전 영향 분석
- System Template 직접 수정 제한
- Version / Release 관리
- Change Request
- Approval Workflow
- Rollback
- Global Audit Log
- Tenant별 적용 범위 선택
- Sandbox / Test Tenant에서 먼저 검증

## 구현 방향

초기 Prototype에서는 `EDIM Developer` Head를 추가하고 다음을 확인합니다.

- Head가 일반 Business Head와 분리되어 보이는가
- Core Engine, Permission, Template, CAD Adapter 등 주요 설정 통로가 보이는가
- 일반 System Setup과 역할이 구분되는가
- 향후 권한 제한을 적용할 위치가 명확한가

실제 개발에서는 Login 후 권한 로드 단계에서 `developer_console.view` 권한이 없으면 이 Head 자체를 숨깁니다.

## 결정 사항

EDIM에는 `EDIM Developer` 전용 Head를 둡니다.

이 Head는 EDIM 제품 자체의 핵심 기능, 엔진, 전역 권한, System Template, Adapter, Release, SaaS 운영 정책을 관장하는 통로입니다.

Tenant 회사 관리자가 사용하는 `System Setup`과 반드시 분리합니다.
