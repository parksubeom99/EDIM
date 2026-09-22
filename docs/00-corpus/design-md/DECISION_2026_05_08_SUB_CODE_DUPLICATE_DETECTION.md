# Decision: Sub Code Duplicate Detection

Date: 2026-05-08

## 결정

Sub Code 등록, 수정, Excel Import 과정에 중복 검사 기능을 둔다.

제목, 품목명, 설명, Remark, 규격, 재질, 단위, 도면번호, Custom Field를 기준으로 Exact/Near/Semantic Duplicate 후보를 탐지한다.

## 이유

Sub Code는 Product Code와 Part Relationship의 기초 데이터다.

중복 Sub Code가 늘어나면 자동 BOM, 도면, 원가, Macro 연결이 혼란스러워진다.

## 원칙

- 중복 후보가 있으면 자동 등록하지 않는다.
- 사용자가 후보를 검토하고 등록/기존 사용/Version 생성/병합 요청을 선택한다.
- Product Code와 연결된 후보는 더 강하게 경고한다.
- 중복 아님 판단과 신규 등록 강행은 Audit Log에 남긴다.

