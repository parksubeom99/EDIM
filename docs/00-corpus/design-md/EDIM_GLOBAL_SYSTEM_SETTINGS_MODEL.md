# EDIM Global System Settings Model

Date: 2026-05-09

이 문서는 EDIM의 각 엔진을 만들기 전에 시스템 전체에 걸쳐 먼저 설정해야 하는 전역 설정 구조를 정의합니다.

## 핵심 결정

EDIM Developer 아래에 `Global System Settings`를 둡니다.

이 설정은 특정 Tenant, Head, Hierarchy, Template, Engine 하나에만 적용되는 것이 아니라 EDIM 전체 시스템과 모든 엔진의 기본 동작 기준이 됩니다.

```text
EDIM Developer
└─ Global System Settings
   ├─ Tenant Boundary
   ├─ Permission Policy
   ├─ Data Governance
   ├─ Hierarchy Address Guardrail
   ├─ Template Protection
   ├─ EDIM Run Policy
   ├─ AI / Macro Safety
   ├─ CAD Adapter Sandbox
   ├─ Approval Trigger
   ├─ Release / Rollback
   ├─ Unit / Locale
   └─ External Adapter Policy
```

## 목적

전역 설정은 향후 개발할 엔진들이 서로 다른 기준으로 동작하지 않도록 공통 규칙을 제공합니다.

적용 대상:

- BOM Engine
- Rule Engine
- Macro / AI Engine
- Drawing Engine
- Approval Engine
- Template Engine
- ERP Workflow
- Mobile / Digital Twin
- File / Document / Drawing Storage
- Audit / Release

## 주요 전역 설정

### Tenant Data Boundary

회사별 데이터, 파일, Audit, API 접근을 `tenant_id` 기준으로 엄격히 분리합니다.

기본값:

```text
Strict Isolation
```

### Global PermissionPoint Policy

PermissionPoint 원본 Catalog는 EDIM Developer가 관리하고, Tenant는 허용된 범위 안에서 Grant만 설정합니다.

### Published Data Rule

Published Code, Template, Macro, Drawing Rule은 직접 수정하지 않습니다.

변경은 새 Version 또는 Change Request로 처리합니다.

### Address Guardrail

Hierarchy `path`는 표시와 검색용입니다.

실제 연결은 stable id, asset id, version id를 사용합니다.

### System Template Protection

System Template은 직접 수정하지 않습니다.

Tenant, Department, User는 Copy / Fork / Override 방식으로 확장합니다.

### EDIM Run Execution Policy

공식 Run은 Published 기준 자료만 사용합니다.

Draft는 권한 있는 사용자만 Test Run에서 사용할 수 있습니다.

### AI Macro Safety Policy

AI가 만든 Macro, Rule, Drawing Command는 검토와 승인 전 공식 실행할 수 없습니다.

### CAD Adapter Sandbox

CAD 원본 파일 수정은 Adapter Sandbox에서 먼저 실행하고, Revision Snapshot 후 반영합니다.

### Global Approval Trigger

고위험 변경은 Approval Workflow를 자동 연결합니다.

예:

- Head 구조 변경
- Shared Hierarchy 변경
- System Template 변경
- Rule / Macro 변경
- CAD Adapter 변경
- Published Code 변경

### Release And Rollback Policy

전역 설정 변경은 Release Version으로 배포하고 Rollback이 가능해야 합니다.

### Global Unit And Locale

단위, 통화, 날짜, 언어 기본값과 Tenant Override 허용 범위를 설정합니다.

### External Adapter Policy

ERP, CAD, Storage, Email, Mobile API 연결을 Adapter Registry 기준으로 관리합니다.

## 변경 흐름

전역 설정 변경은 다음 절차를 따릅니다.

```text
Draft
→ Validation
→ Impact Analysis
→ Test Tenant Preview
→ Approval
→ Release Publish
→ Rollback 가능
```

## 화면 구성

`EDIM Developer > Global System Settings` 화면은 다음을 표시합니다.

- Global Configuration Hierarchy
- Setting Group
- Setting Name
- Default Value
- Affected Engine / Module
- Edit Policy
- Risk
- Engine Impact Matrix
- Global Change Policy
- Guardrail

## 결정 사항

EDIM의 각 엔진을 만들기 전에 전역 설정 구조를 먼저 둡니다.

이 전역 설정은 모든 Engine, Head, Hierarchy, Template, Permission, Run, Adapter의 공통 기준입니다.
