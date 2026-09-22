# Decision: System Admin and Organization Permission

Date: 2026-05-08

## 결정

EDIM은 개발자 그룹/System 관리자 권한과 회사별 조직도 기반 권한을 분리한다.

Platform 권한은 EDIM 전체와 System 자료를 관리하고, Tenant 권한은 해당 회사의 업무 데이터와 사용자 권한을 관리한다.

## 이유

EDIM은 SaaS 플랫폼이므로 개발자, Platform Admin, 회사 관리자, 부서 사용자, 외부 협력사가 서로 다른 권한 범위를 가져야 한다.

권한 구조가 분리되지 않으면 고객 데이터 보호와 System 자료 보호가 어려워진다.

## 원칙

- Platform/System 권한과 Tenant 권한을 분리한다.
- 조직도 기반 권한 상속을 지원한다.
- Head, Hierarchy, Template, Code, Drawing, Macro 등 항목별 권한을 설정할 수 있게 한다.
- 명시적 Deny는 Allow보다 우선한다.
- 개발자의 Tenant 데이터 접근은 승인, 시간 제한, Audit Log를 요구한다.

