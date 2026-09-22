# EDIM BOM Code Next Steps

이 문서는 BOM CODE에 집중하여 다음 개발/설계 단계를 정리합니다.

## 목표

BOM CODE를 EDIM의 첫 번째 핵심 업무 엔진으로 정의하고, 중앙 Main Panel에서 동작할 수 있는 MVP 구조를 준비합니다.

## Step 1: 용어 확정

정해야 할 용어:

- Product Code
- Sub Code
- Material Code
- Purchase Item Code
- Arrangement Code
- BOM Code
- Code Relationship
- BOM Run
- Part List

결과물:

- EDIM Code Glossary

## Step 2: BOM CODE 데이터 모델 상세화

정리할 엔티티:

- BomCodeDefinition
- BomCodeSegment
- BomCodeRelationship
- BomCodeRun
- BomCodeRunLine
- CodeDefinition
- CodeGroup
- HierarchyAssetLink

결과물:

- DB Schema 초안

## Step 3: 중앙 Main Panel 화면 설계

필요 화면:

- Product Code 선택
- Code Segment 표시
- Relationship Builder
- BOM Run Preview
- Validation Summary
- Action Area

결과물:

- BOM CODE Main UI Wireframe

## Step 4: 우측 Panel 연결 정의

BOM CODE 선택 항목별 우측 Panel:

- Code Detail
- Attribute
- Child Code Detail
- Drawing Link
- Table Link
- Macro Link
- Validation Result
- History

결과물:

- Right Panel Binding 목록

## Step 5: 조건 없는 BOM Run MVP

처음에는 조건식을 넣지 않고 기본 Parent/Child 관계만 사용합니다.

기능:

- Parent Code 선택
- Child Code 조회
- Quantity 적용
- BOM Preview 생성
- Validation

결과물:

- BOM Run Test Prototype

## Step 6: 조건부 Rule 확장

조건 예:

- Size 조건
- Material 조건
- Option 조건
- Arrangement 조건
- Quantity 계산 조건

결과물:

- Rule Engine 초안

## Step 7: Macro / AI 연결

AI/Macro 역할:

- 조건식 초안
- 누락 부품 탐지
- Relationship 추천
- 오류 설명

결과물:

- AI Assist 설계
- Macro Approval 흐름

## Step 8: Drawing / Table / Cost 연결

BOM CODE와 연결할 자료:

- DrawingRecord
- TableDefinition
- MacroDefinition
- Cost Table
- Work Process

결과물:

- BOM Code Asset Binding 설계

## Step 9: 승인 / Version / Published 적용

BOM CODE는 승인된 Version만 Project Run에 사용합니다.

결과물:

- Approval Workflow 연결
- Version Snapshot

## Step 10: CPQ 첫 화면과 연결

CPQ Product Selection에서 선택한 조건으로 BOM CODE를 실행합니다.

결과물:

- CPQ Selection → BOM Code Run 흐름

