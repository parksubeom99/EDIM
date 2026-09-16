# 다음 세션 인계 (2026-09-16 종료 시점)

## 원격 상태 (SSOT = GitHub parksubeom99/EDIM)
- `main` 7718884 (7/17 β) — 미변경
- `feat/m1-mainform` d719427 (M1 작업대) ← main
- `feat/m2-toolbox-run` 1f7f7d3 (M2 실행 고리) ← m1
- `feat/m3-output` 613f16c (M3 출력부) ← m2
- PR 3건 **미생성** (PAT `el`에 Pull requests·Workflows 권한 없음). CI는 `docs/ci/ci.yml` 대기.

## 세션 시작 절차 (엘)
1. `git clone --branch feat/m3-output` (샌드박스 초기화 가정) → PG16 로컬 클러스터(:5433) → `cp .env.example .env` → `pnpm install` → `db:generate` → `db:migrate` → `db:seed`
2. 기준선: `pnpm typecheck` GREEN · `pnpm -r test` (기존 113 + web 33)
3. 토큰 권한이 추가됐으면: PR 3건 생성(m1→main, m2→m1, m3→m2) + `git mv docs/ci/ci.yml .github/workflows/ci.yml`

## 남은 작업 (우선순위)
1. **실데이터 주입** — `apps/web/app/lib/macro/provider.ts`(SAMPLE_TABLES·SAMPLE_VARS) · `lib/output/bom.ts`(단가·배율) 상수 교체. 회장님이 실 표를 주면 즉시.
2. **병합** — PR 리뷰 후 m1→main 순차 병합, CI green 확인.
3. **Tier B 결정 2건** — RCCS 조립 코드 영속 테이블 · Revision 모델(p24). 스키마 결정 시 migration 0005.
4. **M2 보강** — `approveMacro` 승인 시점에도 런타임 프로브 적용 여부.
5. **리허설** — 시연 대본(로그인 → 노드 선택 → 조립 → EDIM Run → BOM/Cost/DXF), 장애 대비 프로토타입 v2.
6. **코퍼스 백업** — 컴퓨터 여실 때 88md + EDIM.pdf를 `docs/00-corpus/`로.

## 검증 스크립트 (재현용, 샌드박스 /home/claude에 있었음 — 유실 시 lmd의 DoD 표로 재작성)
verify_m1.py(D1~D7) · verify_m2.py(E0~E4) · verify_m3.py(F1~F6)
