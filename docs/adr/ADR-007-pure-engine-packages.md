# ADR-007: 순수 엔진 패키지와 어댑터 분리

- **상태**: 확정 (07-02 모노레포)

## 상황
BOM 산출 · 매크로 실행 · 주소 해석은 도메인의 심장이다. 이것이 DB · Next.js 에 묶이면 단위 테스트가 느려지고 교체가 어렵다.

## 결정
`bom-code` · `macro-dsl` · `macro-verify` · `macro-compile` · `hierarchy-address` 는 DB 도 화면도 모르는 순수 패키지. DB 접근은 `packages/db`, 화면 · API 는 `apps/web` 이 어댑터로 붙는다(헥사고날의 포트 · 어댑터 구분을 패키지 경계로).

## 검토한 대안
- apps/web 안에 전부

## 결과 — 얻은 것
엔진 단위 테스트 150여 개가 DB 없이 돈다. LLM 공급자도 인터페이스 뒤에서 교체 가능.

## 결과 — 치른 것
패키지 경계를 넘는 타입을 `core-ontology` 로 모아야 한다.

## 검증
typecheck 11 패키지 · 패키지별 vitest
