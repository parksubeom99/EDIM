# EDIM Tenant Branding

이 문서는 EDIM SaaS에서 회사별 로고, 회사명, 브랜드 표시 정보를 관리하는 방식을 정의합니다.

## 핵심 개념

Tenant Branding은 EDIM을 사용하는 각 회사가 자신의 회사 로고와 표시 정보를 EDIM 화면과 출력 문서에 적용하는 기능입니다.

EDIM은 여러 회사가 함께 사용하는 SaaS이므로 사용자는 항상 현재 어떤 회사의 데이터 안에서 작업 중인지 알 수 있어야 합니다.

따라서 회사 로고는 단순 장식이 아니라 `Tenant Context`를 표시하는 핵심 UI 요소입니다.

## 표시 위치

초기에는 다음 위치에 Tenant Branding을 표시합니다.

- Login 이후 회사 선택 화면
- EDIM Core Shell 상단 Header
- 사용자 프로필/회사 전환 메뉴
- Project 화면
- 견적서
- 승인도서
- 기술자료
- 출력 PDF/Excel/Word 문서

## Header 배치 원칙

EDIM Core Shell 상단 Header 좌측에는 현재 회사 정보를 표시합니다.

```text
[Tenant Logo] [Tenant Name] [Current Project / Workspace]
```

상단 Header 우측에는 사용자와 시스템 상태를 표시합니다.

```text
[Search] [Notification] [User Name] [Role] [Settings]
```

한 사용자가 여러 회사에 소속될 수 있으므로 회사 로고와 회사명은 항상 명확하게 보여야 합니다.

## Tenant Branding 데이터

### Tenant

회사 기본 정보입니다.

주요 필드:

- `id`
- `name`
- `display_name`
- `business_registration_no`
- `business_type`
- `subscription_status`
- `status`
- `timezone`
- `locale`
- `created_at`
- `updated_at`

### TenantBranding

회사별 브랜드 설정입니다.

주요 필드:

- `id`
- `tenant_id`
- `logo_file_id`
- `small_logo_file_id`
- `document_logo_file_id`
- `brand_color`
- `accent_color`
- `default_document_header`
- `default_document_footer`
- `company_address`
- `company_phone`
- `company_email`
- `status`
- `updated_by`
- `updated_at`

### FileAsset

로고, 문서, 도면, 첨부파일 등 파일을 관리하는 공통 엔티티입니다.

주요 필드:

- `id`
- `tenant_id`
- `file_name`
- `original_file_name`
- `file_type`
- `mime_type`
- `file_size`
- `storage_path`
- `usage_type`
- `uploaded_by`
- `created_at`

`usage_type` 예:

- `tenant_logo`
- `tenant_small_logo`
- `document_logo`
- `document_attachment`
- `drawing_file`
- `technical_document`
- `approval_document`

## 로고 관리 원칙

- 로고가 없으면 EDIM 기본 로고를 표시한다.
- Header에는 작은 로고 또는 가로형 로고를 사용한다.
- 출력 문서에는 문서용 로고를 사용할 수 있다.
- 로고 파일은 회사별로 분리 저장한다.
- 로고 변경 이력을 Audit Log에 남긴다.
- 기존 문서의 과거 로고를 보존해야 하는 경우 GeneratedDocument에 당시 로고 정보를 스냅샷으로 저장한다.

## 디자인 제한

초기에는 회사별 과도한 테마 변경을 허용하지 않습니다.

허용:

- 회사 로고
- 작은 로고
- 문서용 로고
- 회사명
- 대표 색상
- 보조 색상

초기에는 제한:

- 전체 화면 레이아웃 변경
- 모든 UI 색상 변경
- 폰트 변경
- 복잡한 스킨 기능

이 제한은 EDIM의 화면 일관성과 유지보수성을 지키기 위한 것입니다.

## 권한

Tenant Branding은 회사 관리자가 변경할 수 있어야 합니다.

관련 PermissionPoint:

- `tenant.branding.view`
- `tenant.branding.update`
- `tenant.logo.upload`
- `tenant.logo.delete`

Platform Admin은 모든 회사의 Branding 설정을 관리할 수 있습니다.

Tenant Admin은 자신의 회사 Branding만 관리할 수 있습니다.

## MVP 반영 범위

첫 구현에서는 다음 기능만 만듭니다.

- 회사명 표시
- 회사 로고 업로드
- Header 좌측에 회사 로고 표시
- 로고가 없으면 기본 EDIM 로고 표시
- Tenant Branding 설정 조회/수정

문서 출력용 로고, 회사별 문서 머리글/바닥글은 이후 단계에서 확장합니다.

## 결정 사항

Tenant Branding은 EDIM Core의 기본 기능입니다.

EDIM Core Shell은 로그인 후 현재 선택된 Tenant의 로고와 회사명을 표시해야 합니다.

