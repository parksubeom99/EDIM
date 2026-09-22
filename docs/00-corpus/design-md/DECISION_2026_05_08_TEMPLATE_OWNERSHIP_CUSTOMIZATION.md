# Decision: Template Ownership and Customization

Date: 2026-05-08

## 결정

EDIM 중앙 Main Panel에 호출되는 UI Template은 System, Tenant, Department, User 소유권과 적용 범위를 가진다.

사용자는 System Template을 직접 수정하지 않고 Copy, Fork, Override 방식으로 편집한다.

접근 가능한 System 자료와 수정/편집 권한은 TemplateAccessPolicy와 PermissionPoint로 제어한다.

## 이유

사용자가 UI를 직접 만들거나 System Template을 편집할 수 있게 하면 자유도는 높아지지만, 잘못된 변경이 회사 전체 또는 System 전체에 영향을 줄 수 있다.

따라서 원본 System 자료 보호, Version 관리, Publish 승인, 권한 확인이 필요하다.

## 원칙

- System Template 원본은 Platform Admin만 수정한다.
- 일반 사용자는 개인 Template을 만들 수 있다.
- 회사 전체 적용 Template은 관리자 승인 후 Published 상태로 전환한다.
- Template은 Version과 Dependency를 가진다.
- Template 실행은 권한 확인과 안전성 검사를 거친다.

