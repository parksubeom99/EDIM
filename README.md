# EDIM

AHU 파라메트릭 CTO 플랫폼 (RCCS).

> **이 repo는 EDIM 플랫폼입니다. 엘리베이터 CAD 프로젝트는 [elevator-cad](https://github.com/parksubeom99/elevator-cad) repo로 분리됐습니다.**
> 2026-07-17 이전까지 두 프로젝트가 `edim`이라는 한 이름을 공유해 혼선이 있었습니다. 이름이 같아서 생긴 사고이므로 다시 합치지 않습니다.

## 현재 단계

**P0.5 — 바닥 정리** (repo 분리 · 이름 정리 · 로컬 정리)

설계는 STEP 1~6까지 확정됐고(화면 · 코드 · 매크로 · 승인 · 데이터 · 스택), 그 설계를 얹을 저장소 바닥을 정리하는 중입니다.

## 로드맵

| 단계 | 내용 | 끝나는 기준 |
|---|---|---|
| **P0.5** | 저장소 바닥 정리 | `C:\dev\metaverse`에서 이 repo가 물려 돌아감 |
| **P1** | 데이터 바닥 — 2계층 스키마(RCCS / PLM 9개 테이블) + 고객사 격리 | 격리 테스트 통과 |
| **P2** | 엔진 — 매크로 계산기 (최대 고비) | p27 수식 넣어 **786** 산출 |
| **P3** | 승인 · 권한 — Design→Check→Approve→Accepted, 개정 이력 | 승인본 수정 불가 + Rev 회전 확인 |
| **P4** | 화면 뼈대 — Toolbar 3층 · Work Hierarchy · Inspector | — |
| **P5** | 작업면 — Main / Key / Sub Work Place 3영역 | — |

## 문서 구조

| 경로 | 내용 |
|---|---|
| `docs/00-corpus/` | EDIM.pdf 근거 인용 · 페이지 색인 |
| `docs/01-design/` | STEP 1~6 설계 문서 |
| `docs/02-reports/` | 보고서 등 납품물 |
| `docs/03-handoff/` | ccmd / lmd 인계 기록 |
| `docs/04-decisions/` | 결정 로그 — 무엇을 왜 정했나 |
