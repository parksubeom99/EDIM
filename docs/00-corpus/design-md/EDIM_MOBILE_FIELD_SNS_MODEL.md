# EDIM Mobile, Field Work, and SNS Model

이 문서는 EDIM에서 핸드폰 App, 현장 업무, 자재 입출고, 품질 관리, Digital Twin, SNS형 업무 기록 기능을 정의합니다.

## 핵심 결정

EDIM에는 회사 내부 업무용 Mobile App이 필요합니다.

Mobile App은 단순 조회용이 아니라 현장 업무 처리와 기록 수집의 핵심 도구입니다.

또한 SNS와 유사한 `Project Activity Feed` 기능을 두어 Project, 업무, 자재, 품질, 설치, A/S, 승인, 변경 이력을 자연스럽게 기록하고 공유합니다.

단, EDIM의 SNS는 공개형 SNS가 아니라 `Enterprise Work Feed`입니다.

```text
Mobile Field Work
→ Project Activity Feed
→ Task / Approval / Audit / Dashboard
→ 업무 개선 데이터
```

## Mobile App 주요 사용 영역

### 1. 자재 입출고

- QR/Barcode 스캔
- 자재 입고
- 자재 출고
- 재고 위치 확인
- 부족 자재 알림
- 사진 첨부
- 담당자 서명

### 2. 품질 관리

- 수입 검사
- 공정 검사
- 완제품 검사
- 불량 등록
- 하자 사진/동영상 첨부
- 검사 체크리스트
- 품질 승인/반려

### 3. 생산 / 공정

- 작업 시작
- 작업 완료
- 공정 지연 보고
- 작업자 배정
- 설비 상태 기록
- 작업 지시 확인

### 4. 출고 / 설치 / A/S

- 출고 확인
- 납품 확인
- 설치 일정
- 설치 사진
- 시운전 결과
- 유지보수 기록
- 고객 확인 서명

### 5. Digital Twin / Smart Factory

- 설비 상태 조회
- 센서 데이터 이벤트 확인
- 현장 사진/상태 기록
- 장비 QR Code 조회
- AR/XR 연계 준비

## SNS형 기능: Project Activity Feed

EDIM에는 Project 중심의 활동 Feed가 필요합니다.

Feed에 기록되는 내용:

- 사용자가 작성한 글
- 댓글
- 멘션
- 사진/동영상/파일 첨부
- 업무 완료 기록
- 승인 요청/승인/반려 기록
- 자재 입출고 기록
- 품질 검사 기록
- 도면 Revision 변경
- BOM 변경
- EDIM Run 완료/실패
- 고객 응답
- 협력사 의견

## SNS 기능의 목적

SNS 기능의 목적은 잡담이 아니라 업무 추적과 개선입니다.

목적:

- Project별 업무 흐름 기록
- 부서 간 의사소통 이력 보존
- 문제 발생 원인 추적
- 업무 지연 원인 분석
- 반복 문제 개선
- 고객/협력사 대응 이력 관리
- 신규 담당자 인수인계 지원

## Audit Log와 Activity Feed의 구분

둘은 목적이 다릅니다.

```text
Audit Log = 법적/시스템 추적용 변경 이력
Activity Feed = 사람이 이해하기 쉬운 업무 흐름과 커뮤니케이션 기록
```

예:

Audit Log:

```text
user_id=12 changed quote.status from draft to submitted
```

Activity Feed:

```text
김영업님이 Micron #7 견적서를 승인 요청했습니다.
```

둘 다 필요합니다.

## Project Activity Feed 구조

### ActivityFeedItem

Project나 업무 대상에 연결되는 Feed 항목입니다.

주요 필드:

- `id`
- `tenant_id`
- `project_id`
- `target_type`
- `target_id`
- `activity_type`
- `title`
- `content`
- `created_by`
- `created_at`
- `visibility`
- `security_grade`

`activity_type` 예:

- `post`
- `comment`
- `mention`
- `task_created`
- `task_completed`
- `approval_requested`
- `approval_approved`
- `approval_rejected`
- `material_in`
- `material_out`
- `quality_check`
- `drawing_revision`
- `bom_changed`
- `edim_run_completed`
- `edim_run_failed`

### ActivityComment

Feed 항목의 댓글입니다.

주요 필드:

- `id`
- `tenant_id`
- `activity_feed_item_id`
- `parent_comment_id`
- `content`
- `created_by`
- `created_at`

### ActivityMention

사용자, 부서, 역할 멘션입니다.

주요 필드:

- `id`
- `tenant_id`
- `activity_feed_item_id`
- `mentioned_type`
- `mentioned_id`
- `created_by`
- `created_at`

### ActivityAttachment

사진, 동영상, 파일 첨부입니다.

주요 필드:

- `id`
- `tenant_id`
- `activity_feed_item_id`
- `file_asset_id`
- `attachment_type`
- `created_by`
- `created_at`

## Mobile Field Event

현장 App에서 발생하는 이벤트입니다.

주요 필드:

- `id`
- `tenant_id`
- `project_id`
- `event_type`
- `target_type`
- `target_id`
- `device_id`
- `location`
- `qr_code`
- `content`
- `created_by`
- `created_at`

`event_type` 예:

- `qr_scan`
- `material_in`
- `material_out`
- `quality_check`
- `photo_upload`
- `signature`
- `installation_check`
- `maintenance_record`
- `digital_twin_event`

## Dashboard 활용

Activity Feed와 Mobile Field Event는 Dashboard에 활용합니다.

표현 항목:

- Project별 최신 이슈
- 지연 업무 원인
- 부서별 처리 속도
- 품질 불량 빈도
- 자재 입출고 지연
- 현장 설치 진행률
- A/S 발생 현황
- EDIM Run 실패 추이
- 고객 응답 지연

## 업무 개선 데이터

Feed와 Field Event는 업무 개선 데이터가 됩니다.

분석 가능 항목:

- 어느 단계에서 자주 지연되는가?
- 어떤 품목에서 품질 문제가 반복되는가?
- 어떤 부서 간 인계에서 문제가 생기는가?
- 어떤 협력사 납기가 자주 늦는가?
- 어떤 Macro/EDIM Run이 자주 실패하는가?
- 비표준 Option이 자주 발생하는 영역은 어디인가?

## Mobile App 필수 기능

초기 Mobile App 후보 기능:

- Login
- Tenant 선택
- My Tasks
- Project 검색
- QR/Barcode Scan
- 자재 입출고
- 품질 체크리스트
- 사진/동영상 첨부
- 댓글/멘션
- 승인/반려
- Push Notification

향후 확장:

- Offline Mode
- 전자서명
- 위치 기록
- AR/XR
- Digital Twin 실시간 상태
- 음성 메모
- OCR

## 보안 원칙

Mobile과 SNS 기능은 보안 위험이 있으므로 다음이 필요합니다.

- Tenant별 데이터 분리
- Project별 접근 권한
- Feed visibility
- 첨부파일 권한
- 보안 등급
- 기기 등록
- 분실 기기 차단
- Push 알림 민감정보 제한
- Audit Log 기록

## 권한

관련 PermissionPoint:

- `mobile.access`
- `mobile.device.manage`
- `activity_feed.view`
- `activity_feed.post`
- `activity_feed.comment`
- `activity_feed.attach`
- `activity_feed.mention`
- `field.material_in`
- `field.material_out`
- `field.quality_check`
- `field.installation_check`
- `digital_twin.view`
- `digital_twin.event.create`

## MVP 반영 범위

첫 구현에서는 Mobile App 전체를 바로 만들지 않습니다.

Core Web에서 먼저 다음 구조를 준비합니다.

- Project Activity Feed
- Comment
- Mention
- Attachment
- Task 연결
- Approval 이벤트 기록
- Material/Quality Event 구조

이후 Mobile App에서 이 API를 사용합니다.

## 결정 사항

EDIM에는 Mobile Field Work와 SNS형 Project Activity Feed를 포함합니다.

이 기능은 업무 기록, History 추적, 업무 개선, Dashboard 분석의 기반이 됩니다.

