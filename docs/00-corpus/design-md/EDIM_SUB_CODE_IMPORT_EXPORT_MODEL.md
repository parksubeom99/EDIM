# EDIM Sub Code Import and Export Model

이 문서는 Sub Code를 Excel로 Import/Export하는 기능과, 기존 데이터와의 비교, 변경 검토, 영향 분석, 승인 후 등록하는 안전 절차를 정의합니다.

## 핵심 결정

Sub Code는 EDIM의 기준 데이터입니다.

따라서 Excel Import는 편의 기능이지만, 직접 DB에 반영하면 안 됩니다.

반드시 다음 흐름을 거칩니다.

```text
Excel Upload
→ Import Staging
→ Format Validation
→ Existing Data Compare
→ Change Classification
→ Impact Analysis
→ User Review
→ Approval
→ Apply / Publish
```

## 필요한 이유

Sub Code가 변경되면 Product Code, Part Relationship, BOM Run, Drawing, Table, Macro, Cost에 영향을 줄 수 있습니다.

따라서 Import 시 다음을 반드시 확인해야 합니다.

- 이미 등록된 Sub Code인가?
- 신규 Sub Code인가?
- 기존 값이 변경되었는가?
- 변경이 Minor인가 Major인가?
- Product Code와 연결되어 있는가?
- Part Relationship에서 사용 중인가?
- 승인된 BOM/도면/문서에서 사용 중인가?
- 변경 시 새 Version이 필요한가?

## Export / Import 기본 흐름

### 1. Export

사용자는 현재 Sub Code 목록을 Excel로 Export합니다.

Export 파일에는 반드시 시스템 식별 정보가 포함되어야 합니다.

필수 컬럼:

- `stable_key`
- `code`
- `name`
- `code_type`
- `hierarchy_path`
- `version`
- `status`
- `last_modified_at`
- `checksum`

사용자 편집 컬럼:

- description
- attribute values
- unit
- material
- supplier
- price
- remarks
- custom fields

### 2. Excel 편집

사용자는 Export 파일에 자료를 추가하거나 수정합니다.

권장:

- 기존 Row의 `stable_key`는 수정하지 않습니다.
- 신규 Row는 `stable_key`를 비워둡니다.
- 삭제는 Row 삭제보다 `status=inactive_request`처럼 표시하는 방식을 우선합니다.

### 3. Import

Excel을 다시 Import합니다.

Import 결과는 즉시 DB에 반영되지 않고 Import Batch에 저장됩니다.

## Import Staging

### ImportBatch

Import 작업 단위입니다.

주요 필드:

- `id`
- `tenant_id`
- `import_type`
- `file_asset_id`
- `status`
- `uploaded_by`
- `uploaded_at`
- `validated_at`
- `applied_at`

상태:

- `uploaded`
- `validated`
- `review_required`
- `approved`
- `applied`
- `rejected`
- `failed`

### ImportStagingRow

Excel의 각 Row를 임시 저장합니다.

주요 필드:

- `id`
- `tenant_id`
- `import_batch_id`
- `row_no`
- `stable_key`
- `code`
- `raw_data`
- `normalized_data`
- `match_status`
- `change_type`
- `validation_status`
- `impact_status`
- `review_status`
- `error_message`

## Match Status

Import Row와 기존 DB의 대조 결과입니다.

상태:

- `new`
- `matched`
- `changed`
- `unchanged`
- `duplicate`
- `conflict`
- `missing_required`
- `invalid`

## Change Type

변경 유형을 분류합니다.

### Minor Change

비교적 안전한 변경입니다.

예:

- 설명 변경
- 비고 변경
- 표시명 변경
- 첨부자료 추가

### Major Change

Product Code, BOM, 도면, 원가에 영향을 줄 수 있는 변경입니다.

예:

- 규격 변경
- 치수 변경
- 재질 변경
- 단위 변경
- 공급처/가격 변경
- Code Segment 변경
- Hierarchy 위치 변경
- 연결 Table 변경
- 연결 Drawing 변경
- 연결 Macro 변경

Major Change는 바로 반영하지 않고 새 Version 또는 Change Request로 처리합니다.

## 비교 기준

기존 데이터와 비교할 때 우선순위:

```text
1. stable_key
2. code + code_type + tenant
3. hierarchy_path + code
4. checksum
```

`stable_key`가 있으면 가장 신뢰합니다.

`stable_key`가 없고 code가 같은 경우에는 신규인지 기존인지 사용자가 검토해야 합니다.

## Impact Analysis

Import된 Row가 기존 Sub Code를 변경하는 경우 영향 범위를 분석합니다.

분석 대상:

- Product Code
- Product Code Segment
- Code Relationship
- Part Relationship
- BOM Run Definition
- DrawingRecord
- TableDefinition
- MacroDefinition
- Cost Table
- Work Process
- Published BOM
- 진행 중 Project
- 승인 완료 문서
- 진행 중 Approval

화면 표시 예:

```text
이 Sub Code는 다음 위치에서 사용 중입니다.

Product Code: 12개
Part Relationship: 35개
Drawing: 4개
Table: 7개
Macro: 3개
진행 중 Project: 8개
승인 완료 문서: 5개
```

## Review 화면

Import 후 사용자에게 대조 결과를 보여줍니다.

필요 화면:

- 신규 Row 목록
- 변경 Row 목록
- 오류 Row 목록
- 중복 Row 목록
- 영향 있음 Row 목록
- 변경 전/후 비교
- 영향 분석 결과
- 적용 방식 선택

적용 방식:

- 신규 등록
- 기존 자료 Minor Update
- 새 Version 생성
- 변경 요청 생성
- 무시
- Import Row 반려

## 안전 적용 원칙

### 신규 Sub Code

검증 통과 후 등록 가능합니다.

### 기존 Sub Code Minor Change

권한이 있으면 직접 적용 가능하지만, Audit Log를 남깁니다.

### 기존 Sub Code Major Change

새 Version 또는 Change Request로 처리합니다.

### Product Code와 연결된 Sub Code

바로 덮어쓰지 않습니다.

다음 중 하나를 선택합니다.

- 기존 Product Code는 기존 Version 유지
- 새 Version을 특정 Product Code에 적용
- 신규 Project부터만 적용
- 특정 적용일 이후 적용
- Change Request 승인 후 적용

## Version / Snapshot

Import 적용 시 다음을 저장합니다.

- 변경 전 Sub Code Snapshot
- 변경 후 Sub Code Snapshot
- Import Batch ID
- 적용자
- 적용 시간
- 적용 사유

Published Product Code나 BOM Run은 실행 당시 Version을 계속 참조합니다.

## Excel Template 관리

Excel Import 형식도 Template으로 관리합니다.

필요 기능:

- Excel Column Mapping
- 필수 컬럼 설정
- 데이터 타입 설정
- Code Set 검증
- Unit 검증
- 중복 검증
- 사용자 안내 행

## 권한

관련 PermissionPoint:

- `sub_code.export`
- `sub_code.import.upload`
- `sub_code.import.validate`
- `sub_code.import.review`
- `sub_code.import.apply`
- `sub_code.import.major_change`
- `sub_code.version.create`
- `sub_code.change_request.approve`

## Audit Log

기록 대상:

- Export 실행
- Import 파일 업로드
- Validation 결과
- 변경 전/후 비교
- Impact Analysis 결과
- 사용자 Review 결정
- 적용 결과
- 반려 사유

## MVP 반영 범위

첫 구현에서는 다음 기능을 준비합니다.

- Excel Export
- Excel Import Upload
- Import Staging
- stable_key 기반 매칭
- 신규/변경/오류 분류
- 변경 전/후 비교
- Product Code 연결 여부 표시
- 적용 전 사용자 확인
- Audit Log

다음 단계에서 Impact Analysis 상세, 승인 Workflow, Version 적용 범위 선택을 확장합니다.

## 결정 사항

Sub Code Import는 직접 반영하지 않고 Staging과 Review를 거칩니다.

기존 등록 데이터와 대조하고, 변경 사항과 Product Code 연결 상태를 확인한 뒤 안전하게 등록합니다.

