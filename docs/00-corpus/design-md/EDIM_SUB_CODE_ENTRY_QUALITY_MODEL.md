# EDIM Sub Code Entry Quality Model

이 문서는 Sub Code의 이름, 비고, Item No, Item Remark, 속성값 등을 입력할 때 편의성과 정확성을 동시에 확보하는 방식을 정의합니다.

기준 자료는 `EDIM Solution.pdf`의 30~31페이지입니다.

## 핵심 결정

Sub Code 입력 화면은 단순 Table 입력 화면이 아닙니다.

Sub Code는 Product Code, Part Relationship, BOM Run의 기준 데이터이므로 입력 편의성과 정확성 보장이 매우 중요합니다.

따라서 입력 화면은 다음 세 가지를 동시에 제공해야 합니다.

```text
빠른 입력
정확한 검증
등록/승인/연결 상태 표시
```

## 화면 구성 원칙

Sub Code 입력 화면은 중앙 Main Panel에서 Table 중심으로 구성하고, 우측 Panel에서 상세/자료/검증/이력을 보여줍니다.

```text
중앙 Main Panel:
Sub Code 목록 / 입력 Table / 속성값 / 상태

우측 Context Panel:
Detail / Upload / Drawing / Table / Macro / Duplicate / Impact / History
```

## 입력 항목 후보

기본 입력 항목:

- Sub Code
- Stable Key
- Code Type
- Code Group
- Hierarchy Address
- Name
- Description
- Remark
- Item No
- Item Name
- Item Remark
- Specification
- Material
- Unit
- Supplier
- Manufacturer
- Status
- Version
- Approval Status

속성 입력 항목:

- Attribute A
- Attribute B
- Attribute C
- Attribute D
- Attribute E
- Custom Field

## 입력 편의 기능

### 1. Grid / Table 입력

Excel처럼 여러 Row를 빠르게 입력할 수 있어야 합니다.

필요 기능:

- Row 추가
- Row 복사
- 다중 Row 붙여넣기
- Excel Paste
- Batch Edit
- Fill Down
- 이전 Row 값 복사
- Undo / Redo

### 2. Auto Complete

기존 등록 자료를 기반으로 자동완성을 제공합니다.

대상:

- Material
- Unit
- Supplier
- Manufacturer
- Specification
- Item Name
- Code Group

### 3. Controlled Value

중요 필드는 자유 입력보다 선택값을 우선합니다.

예:

- Code Type
- Unit
- Material Grade
- Supplier
- Status
- Approval Status

이 값들은 Data Dictionary / Code Set에서 관리합니다.

### 4. Auto Code Generation

Sub Code 규칙이 정해져 있으면 자동 Code 생성을 지원합니다.

예:

```text
Code Group + Attribute A + Attribute B + Serial
```

자동 생성 후 사용자가 수정할 수 있되, 중복 검사를 통과해야 합니다.

### 5. Template 기반 입력

Sub Code Type별 입력 Template을 제공합니다.

예:

- Raw Material Template
- Purchase Item Template
- Specification Template
- Motor Template
- Fan Template
- Casing Template

Template에 따라 필수 필드, 속성, 단위, 검증 규칙이 달라집니다.

## 정확성 보장 기능

### 1. Inline Validation

입력 즉시 오류를 표시합니다.

검증 예:

- 필수값 누락
- Code 중복
- Unit 불일치
- 숫자 형식 오류
- 허용 범위 초과
- Data Dictionary에 없는 값
- 승인되지 않은 Supplier

### 2. 중복 검사

입력 중에도 중복 후보를 표시합니다.

검사 기준:

- Code
- Name
- Item No
- Item Name
- Specification
- Material
- Unit
- Drawing No
- Remark 유사도

중복 후보가 있으면 자동 등록하지 않고 사용자가 검토합니다.

### 3. Normalization

입력값을 표준화합니다.

예:

```text
SUS 304 / SUS304 / Stainless 304
→ SUS304
```

```text
1.6t / 1.6T / 1.6 mm
→ 1.6 mm
```

### 4. Required Field by Type

Sub Code Type별 필수 항목을 다르게 둡니다.

예:

Raw Material:

- Material
- Unit
- Specification

Purchase Item:

- Supplier
- Manufacturer
- Lead Time
- Purchase Unit

Specification:

- Attribute
- Allowed Value
- Unit

### 5. Status Gate

입력 완료와 사용 가능 상태를 분리합니다.

```text
Draft
→ Validated
→ Review Requested
→ Approved
→ Published
```

Published 상태가 되기 전까지 Product Code와 BOM Run에서 공식 사용하지 않습니다.

## 등록 상태 표시

Sub Code 목록에는 등록 상태를 명확히 보여줘야 합니다.

표시 Badge:

- Draft
- Validated
- Review
- Approved
- Published
- Rejected
- Inactive
- Obsolete
- Duplicate Candidate
- Impact Warning
- Missing Required Data

상태별 색상:

- Published: 정상
- Draft: 작성 중
- Review: 검토 중
- Warning: 영향 있음
- Error: 등록 불가
- Inactive: 비활성

## 연결 상태 표시

각 Sub Code가 어디에 연결되어 있는지 보여줍니다.

표시 항목:

- Product Code 연결 수
- Part Relationship 연결 수
- Drawing 연결 수
- Table 연결 수
- Macro 연결 수
- Project 사용 수
- Published BOM 사용 여부

예:

```text
Product Code 12
Relationship 35
Drawing 4
Table 7
Macro 3
```

이 정보는 사용자가 변경 위험을 판단하는 데 필요합니다.

## 등록 전 Check List

등록 또는 승인 요청 전에 Check List를 표시합니다.

검사 항목:

- 필수 입력 완료
- 중복 후보 검토 완료
- Data Dictionary 값 일치
- Unit 검증 완료
- 연결 자료 확인
- Impact Warning 확인
- 작성 권한 확인
- 승인 Workflow 확인

## 우측 Panel 추천 구성

Sub Code 입력 화면의 우측 Panel은 Accordion 방식으로 구성합니다.

추천 Group:

- Detail
- Duplicate Candidate
- Asset Upload
- Drawing / Table / Macro
- Product Code Usage
- Impact Analysis
- Validation Result
- Approval
- History

## Import와의 연결

Excel Import로 들어온 Row도 같은 검증 UI를 사용합니다.

즉, 수동 입력과 Import 입력 모두 동일한 Validation, Duplicate Check, Impact Analysis를 거칩니다.

## 권한

관련 PermissionPoint:

- `sub_code.view`
- `sub_code.create`
- `sub_code.update`
- `sub_code.batch_edit`
- `sub_code.validate`
- `sub_code.review.request`
- `sub_code.publish`
- `sub_code.override_validation`
- `sub_code.status.change`

## MVP 반영 범위

첫 구현에서는 다음 기능을 준비합니다.

- Table/Grid 입력
- 필수 필드 검증
- Code 중복 검사
- Name/Item No 중복 후보 표시
- Draft / Published 상태 표시
- Product Code 연결 여부 표시
- 우측 Detail / Validation / History Panel

이후 확장:

- Auto Complete
- Fill Down
- Batch Edit
- Normalization Dictionary
- AI 기반 중복 후보
- Impact Analysis 상세

## 결정 사항

Sub Code 입력 화면은 Excel처럼 편리하게 입력할 수 있어야 하지만, 등록 전에는 Validation, Duplicate Check, Status Gate, Impact 확인을 거쳐야 합니다.

등록 상태와 연결 상태를 같은 화면에서 표시하여 사용자가 데이터 품질과 변경 위험을 동시에 확인할 수 있게 합니다.

