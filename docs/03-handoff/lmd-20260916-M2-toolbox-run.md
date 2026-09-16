# lmd — M2 툴박스 실행 고리 (2026-09-16 · 엘 샌드박스 실행)

브랜치 `feat/m2-toolbox-run` (base: feat/m1-mainform) · 커밋 bf1fa7f → 038094b · 원격 push 완료

## 무엇이 닫혔나 (p57 Prompt → Macro → Verify → Approve → Run)

| 단계 | 구현 | 근거 |
|---|---|---|
| DSL 초안(직접 입력) | `POST /api/macros {node, dsl, mode:'draft'}` → 정적 verify + **런타임 dry-run 프로브** 통과 시만 `MacroRegistry` draft | `lib/macro/run.ts draftDslForSession` |
| 검증만 | `mode:'verify'` → 진단 목록 | 기존 `verifyMacroForSession` 재사용 |
| 승인/반려 | `POST /api/macros/[id] {decision}` → 기존 `approveMacro/rejectMacro` (owner/engineer, 재검증 후 승인) | `lib/macro/registry.ts` 재사용 |
| **EDIM Run** | `POST /api/run/edim {node, slots}` → **승인된 매크로만** parse → evaluate(슬롯 기반 DataProvider) | `runApprovedForSession` · 런타임 LLM 0 |
| DataProvider | 슬롯 → 코드참조 A B C D E F CAP CMH ROW · 샘플 Table1(A 팬kW / B 코일열 / C 패널mm) · Var(NS 10/15/20) | `lib/macro/provider.ts` (순수·테스트) |
| UI | Macro 탭: 편집기·Verify·Save draft·Registry 목록·승인/반려·마지막 Run / Key Work Place '매크로 산출' / Action Bar EDIM Run 상태 | `workbench/macro-panel.tsx` |

## DoD 실측 (Playwright, owner@acme.test, 노드 PS-61313-5)

| # | 시나리오 | 결과 |
|---|---|---|
| E0 | 매크로 없이 EDIM Run | `no-macro` (안내 메시지) |
| E1 | 샘플 DSL Verify | diagnostics 0 |
| E1b | `=IF(ZZ,ZZ>5,1,2)` 초안 | **거부** — `UNKNOWN_SYMBOL code 'ZZ'` (런타임 프로브가 잡음) |
| E2 | 샘플 초안 저장 | draft 1행 |
| E3 | 승인 | `approved` 1행, 재검증 통과 |
| E4 | EDIM Run B=55 | `ran · 455.4` (22kW×1.15×18) |
| E4' | 슬롯 B=10 후 Run | `ran · 66.6` (3.7kW×18) — **슬롯이 분기 결정** |
| 테스트 | apps/web vitest | 24/24 (rccs 10 · approval 8 · provider 6) · 전체 typecheck GREEN |

## 이 세션에서 잡은 결함 2건(코드)
1. 정적 verify는 코드참조를 모름 → 잘못된 코드참조가 초안·승인까지 통과 → **초안 게이트에 기본 슬롯 dry-run 추가**로 차단.
2. 샘플 DSL이 문법 위반(`Table1(A,ROW)`, 단일행) → 문법 확정치(`행범위 r:r` + `SUM`)로 정정.

## Tier B / 다음
- Table1·NS 값은 **샘플 상수** — 실 엔지니어링 테이블은 DB 바인딩(M3 또는 별도 결정).
- 기존 `approveMacro`는 정적 재검증만 — 런타임 프로브를 승인 시점에도 넣을지 결정 대상.
- `PreC`·`FES`는 사양 미확정(NOVA 대기)으로 런타임에서 의도적으로 에러.
- M3 = BOM Run/EBOM Run/Cost 실동 + BOM 테이블·도면(DXF)·원가 패널.
