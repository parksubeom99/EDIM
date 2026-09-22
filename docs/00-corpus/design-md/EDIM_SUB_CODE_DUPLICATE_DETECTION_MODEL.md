# EDIM Sub Code Duplicate Detection Model

이 문서는 Sub Code 등록, 수정, Excel Import 과정에서 제목, 품목명, 설명, Remark, 속성값이 중복되는지 검사하는 기능을 정의합니다.

## 핵심 결정

Sub Code는 EDIM의 Raw Data이자 자동 BOM의 기준 데이터입니다.

따라서 Sub Code가 중복 등록되면 Product Code, Code Relationship, BOM Run, Drawing, Table, Cost, Macro에 혼란이 생깁니다.

Sub Code 등록과 Import에는 반드시 중복 검사 기능을 둡니다.

```text
Sub Code 입력 / Import
→ Normalize
→ Exact Match
→ Similar Match
→ Semantic Match
→ Duplicate Candidate Review
→ 등록 / 기존 자료 사용 / 병합 / 반려
```

## 중복 검사 대상

검사 대상 필드:

- `code`
- `name`
- `title`
- `description`
- `remarks`
- `item_name`
- `specification`
- `material`
- `unit`
- `supplier`
- `manufacturer`
- `drawing_no`
- `table_name`
- Custom Field 값

특히 다음 조합을 중요하게 봅니다.

```text
품목명 + 규격 + 재질 + 단위
품목명 + 도면번호
품목명 + 공급처 + 규격
Code Type + Attribute 조합
```

## 중복 유형

### 1. Exact Duplicate

완전히 같은 값입니다.

예:

```text
code = KDC-20
name = Inlet Cone
material = GI
size = 630
```

처리:

- 기본적으로 등록 차단
- 기존 Sub Code 사용 권장

### 2. Near Duplicate

철자, 공백, 단위 표기, 약어가 조금 다르지만 같은 항목일 가능성이 높은 경우입니다.

예:

```text
Inlet-Cone
Inlet Cone
Inlet cone W/O FF
INLET CONE W/O F.F.
```

처리:

- 중복 후보로 표시
- 사용자가 확인 후 등록/병합/무시 선택

### 3. Semantic Duplicate

표현은 다르지만 의미상 같은 항목일 가능성이 있는 경우입니다.

예:

```text
Galvanized Steel
GI Steel
아연도 강판
G.I
```

처리:

- AI/Dictionary 기반 후보로 표시
- 자동 병합하지 않음

### 4. Version Duplicate

기존 항목의 새 Version이어야 하는데 신규 Sub Code로 등록하려는 경우입니다.

예:

```text
같은 품목인데 치수 또는 재질만 변경
```

처리:

- 신규 등록 대신 새 Version / Revision 생성 권장

## Normalize 규칙

중복 검사를 위해 입력값을 표준화합니다.

Normalize 예:

- 대소문자 통일
- 공백 정리
- 특수문자 정리
- 하이픈/언더스코어 정리
- 단위 표준화
- 동의어 치환
- 약어 치환
- 숫자 형식 통일
- 한글/영문 용어 사전 적용

예:

```text
SUS304 / SUS 304 / Stainless 304
→ SUS304
```

```text
1.6t / 1.6T / 1.6 mm
→ 1.6 mm
```

## Similarity Score

중복 후보에는 유사도 점수를 표시합니다.

예:

- 100: 완전 동일
- 90~99: 매우 유사
- 75~89: 검토 필요
- 50~74: 참고 후보

유사도 계산 후보:

- Normalized Text Match
- Token Match
- Attribute Match
- Unit / Spec Match
- Drawing No Match
- Supplier / Manufacturer Match
- Semantic Similarity

## Duplicate Candidate Review

중복 후보 검토 화면이 필요합니다.

표시 항목:

- 신규 입력 Row
- 기존 후보 Sub Code
- 유사도 점수
- 중복 판단 이유
- 변경 전/후 비교
- 연결 Product Code 수
- 연결 Part Relationship 수
- 연결 Drawing / Table / Macro 수
- 현재 Status / Version

사용자 선택:

- 기존 Sub Code 사용
- 신규 Sub Code로 등록
- 기존 Sub Code의 새 Version 생성
- 기존 Sub Code와 병합 요청
- Import Row 반려
- 중복 아님으로 표시

## 자동 등록 제한

다음 경우에는 자동 등록하지 않습니다.

- 유사도 90 이상 후보 존재
- 같은 Drawing No 존재
- 같은 규격/재질/단위 조합 존재
- Product Code와 연결된 유사 Sub Code 존재
- 기존 Published Sub Code와 충돌
- Major Change 가능성 있음

## Merge / Alias

이미 중복으로 등록된 Sub Code가 발견될 수 있습니다.

이 경우 즉시 삭제하지 않고 Merge Request로 처리합니다.

필요 기능:

- Master Sub Code 선택
- Duplicate Sub Code Alias 처리
- Product Code Relationship 영향 분석
- 기존 BOM Snapshot 보존
- 관련 자료 Link 이전
- Audit Log 기록

## Import와의 관계

Excel Import 시 중복 검사는 Staging 단계에서 수행합니다.

```text
ImportStagingRow
→ Duplicate Candidate 생성
→ Review
→ Apply
```

Import Review 화면에서는 다음을 분류합니다.

- 신규 등록 가능
- 기존 자료와 동일
- 중복 후보 있음
- 기존 자료의 Version 변경 후보
- 충돌/오류

## 데이터 모델 후보

### DuplicateCheckRun

중복 검사 실행 기록입니다.

주요 필드:

- `id`
- `tenant_id`
- `source_type`
- `source_id`
- `status`
- `started_by`
- `started_at`
- `completed_at`

`source_type` 예:

- `manual_entry`
- `excel_import`
- `batch_check`
- `scheduled_check`

### DuplicateCandidate

중복 후보입니다.

주요 필드:

- `id`
- `tenant_id`
- `duplicate_check_run_id`
- `source_sub_code_id`
- `source_staging_row_id`
- `candidate_sub_code_id`
- `similarity_score`
- `match_type`
- `match_reason`
- `review_status`
- `reviewed_by`
- `reviewed_at`

`match_type` 예:

- `exact`
- `near`
- `semantic`
- `version_candidate`
- `drawing_no_match`
- `attribute_match`

### DuplicateReviewDecision

사용자 검토 결정입니다.

주요 필드:

- `id`
- `tenant_id`
- `duplicate_candidate_id`
- `decision`
- `comment`
- `created_by`
- `created_at`

`decision` 예:

- `use_existing`
- `create_new`
- `create_new_version`
- `merge_request`
- `reject_import_row`
- `not_duplicate`

## 권한

관련 PermissionPoint:

- `sub_code.duplicate_check.run`
- `sub_code.duplicate_check.review`
- `sub_code.duplicate_check.override`
- `sub_code.merge.request`
- `sub_code.merge.approve`
- `sub_code.alias.manage`

## Audit Log

기록 대상:

- 중복 검사 실행
- 후보 생성
- 사용자의 중복 아님 판단
- 기존 자료 사용 결정
- 신규 등록 강행
- Merge Request
- Alias 생성
- Version 생성

## MVP 반영 범위

첫 구현에서는 다음 기능을 준비합니다.

- 등록 시 Exact Duplicate 검사
- Import 시 Exact / Near Duplicate 후보 표시
- `name`, `description`, `specification`, `material`, `unit` 기준 비교
- Similarity Score 표시
- 중복 후보 검토 화면
- 기존 Sub Code 사용 또는 신규 등록 선택
- Audit Log

다음 단계에서 Semantic Similarity, AI 기반 동의어 탐지, Merge Request를 확장합니다.

## 결정 사항

Sub Code 등록과 Import에는 중복 검사 기능을 둡니다.

중복 후보가 있으면 자동 등록하지 않고 사용자가 검토한 후 처리합니다.

