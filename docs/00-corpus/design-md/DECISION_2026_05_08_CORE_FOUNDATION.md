# Decision: EDIM Core Foundation Modules

Date: 2026-05-08

## 결정

EDIM은 CPQ, PLM, ERP를 바로 구현하기 전에 공통 기반 모듈을 먼저 준비한다.

필수 기반 모듈:

- Workspace Context
- Template Registry
- Data Dictionary / Custom Field
- File / Document / Drawing Management
- Audit Log / History
- Notification / Task Inbox
- EDIM Run Job Engine
- Accordion Panel UI

## 이유

EDIM은 단일 기능 프로그램이 아니라 CPQ, PLM, ERP, Toolbox, AI/Macro를 포함하는 SaaS 플랫폼이다.

공통 기반이 없으면 각 모듈이 서로 다른 방식으로 화면, 권한, 문서, 승인, 이력, 파일을 처리하게 되어 장기적으로 유지보수가 어려워진다.

## 원칙

- 먼저 EDIM Core Shell을 만든다.
- 공통 기반 모듈을 Core에 연결한다.
- CPQ는 Core 위에 붙는 첫 업무 모듈로 구현한다.
- 좌측/우측 Template은 Accordion 방식으로 표시한다.
- Template, 권한, Hierarchy, Run Job은 모두 확장 가능한 설정 데이터로 관리한다.

## 초기 구현 순서

```text
Login / Tenant / Membership
→ EDIM Core Shell
→ Tenant Branding
→ Head Management
→ WorkHierarchy Tree
→ Template Registry
→ Accordion Panels
→ Permission Check
→ Workspace Context
→ CPQ 첫 화면 연결
```

