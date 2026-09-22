# Decision: Auth and Permission Extensibility

Date: 2026-05-07

## 결정

EDIM은 SaaS 시스템이므로 Login, 회사 승인, 부서, 역할, 권한 구조를 EDIM Core 단계에서 먼저 준비한다.

권한은 고정 Role만으로 처리하지 않고, 기능이 추가될 때마다 권한 포인트를 등록할 수 있는 확장형 모델을 사용한다.

## 이유

EDIM은 CPQ, PLM, ERP, Toolbox, AI, Macro, Document, Drawing Run 등 권한이 필요한 기능이 계속 늘어난다.

초기에 모든 권한을 정의하는 것은 불가능하므로, 나중에 기능을 추가할 때마다 다음 방식으로 확장할 수 있어야 한다.

```text
새 기능 추가
→ PermissionPoint 등록
→ Role 또는 User에게 PermissionGrant 부여
→ Head/Template/Run/API에서 권한 확인
```

## 중요한 원칙

- User Account와 Tenant Membership을 분리한다.
- 사용자는 관리자 승인 전까지 EDIM Core Shell에 진입할 수 없다.
- 한 사용자는 여러 회사에 소속될 수 있다.
- 권한은 Role 기반으로 시작하되, 특정 사용자/부서/프로젝트 범위까지 확장할 수 있게 한다.
- 명시적 Deny는 Allow보다 우선한다.
- Macro, AI, EDIM Run은 별도 고위험 권한으로 분리한다.

## 영향

초기 개발 범위에 Auth, Tenant, Membership, Role, PermissionPoint, PermissionGrant가 포함된다.

CPQ, PLM, ERP 모듈은 이 권한 구조 위에서 작동한다.

