# Decision: Sub Code Entry Quality

Date: 2026-05-08

## 결정

Sub Code 입력 화면은 빠른 입력과 정확성 검증을 동시에 제공한다.

이름, 비고, Item No, Item Remark, 속성값 입력 시 등록 상태, 중복 후보, 연결 상태, Validation 결과를 함께 표시한다.

## 이유

Sub Code는 Product Code와 BOM Run의 기준 데이터다.

입력 편의성만 높이고 검증이 부족하면 중복과 오류가 빠르게 누적된다.

## 원칙

- 입력은 Grid/Table 방식으로 빠르게 한다.
- 중요한 값은 Data Dictionary와 Code Set 기반 선택을 우선한다.
- 등록 전 Validation과 Duplicate Check를 수행한다.
- Published 전까지 공식 BOM Run에 사용하지 않는다.
- Product Code/Part Relationship 연결 상태를 입력 화면에서 보여준다.

