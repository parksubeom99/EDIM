# 다음 세션 인계 노트 (nmd) — 2026-09-19

## 0. 시작 전에 읽을 것 (memory-gate M-1)
1. 프로젝트 메모리 `business-architecture` → `principles-and-architecture` → `overview` 순
2. repo `docs/04-decisions/2026-09-19-business-architecture-ledger.md` (같은 확정 장부)
3. 이 노트 + `docs/plan/` 의 20→80 시나리오

## 1. 지금 상태 (실측, 2026-09-19)
- **main = 6bfa8e6** + 이 세션 마지막 커밋(plan·nmd). 포함: M1~M3 · demo-ready · Tier B(code_revision) · `db:reset:demo` · e2e 14단계(S2d 잔재 탐지) · 덱 생성기 `docs/deck/` · 확정 장부.
- 검증(엘 샌드박스): typecheck 10 · 테스트 147 · revision:test ALL PASS · reset → demo_e2e **14/14** (455.4 · ₩15,487,170).
- 덱 v0.4: 16장, 청사진 확대 크롭 + 위치 썸네일, 다크 HTML + 흰 PDF. 생성: `docs/deck/build_deck.py`.
- 토큰 `el`: Contents 쓰기 OK, Pull requests·Workflows 403.

## 2. 이번 세션 결정(회장님)
- 토큰 전에 가능한 작업 먼저 / 지난 채팅의 기존 토큰 사용 승인
- 리허설 잔재 해결 · 전 파일 매칭 검토 · 지난 채팅 전수 확인 지시
- 메모리에 사업 구조 기록 + `memory-gate` 신설 + el-master QUICK INDEX 라우팅(v8.23)
- 미결 일괄 승인: fix/demo-reset·feat/deck 머지, 확정 장부 repo 이중화, 덱 크롭·Special 문구 정정
- 20→80 완성 시나리오·설계안 작성 후 세션 종료

## 3. 다음 세션 첫 작업 = 20→80 시나리오의 결정 5건 확인 후 P1 착수
- D1 Special Tool Box 첫 시연 사례 / D2 '80' 기준·가중 / D3 P1·P2 병행 여부 / D4 학습 AI 1수준 입력 / D5 발표 시점
- P1(코드 기반 등뼈): sub_code · product_code · code_relationship + bom_code_run 스냅샷, 등록 화면 3종(p31·33·34), 기존 buildBom 11행과 동일 결과 회귀 테스트. **스키마 변경 = Tier B → 착수 전 회장님 승인**.

## 4. 회장님 몫으로 남은 것 (엘이 대신 못 함)
- Windows 로컬 실행 1회 (DEMO.md §1, 여전히 0회) — 발표 최대 위험
- 회사 실 표(단가 · Table1/NS)
- 로컬 88md 코퍼스 보호 백업 (2026-08-17부터 미결, PC 필요)
- 스킬 3개 저장: memory-gate(신규) · el-master-system v8.23 · quality-meta-gate v8.13 — iOS 앱엔 저장 버튼이 없어 브라우저(claude.ai)에서

## 5. 시작 절차
```
git clone https://github.com/parksubeom99/EDIM.git && cd EDIM
cp .env.example .env && pnpm install --frozen-lockfile
pnpm db:up && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo
pnpm dev   # 다른 창: pnpm db:reset:demo → python3 scripts/demo_e2e.py http://localhost:3000 shots → 14/14 → pnpm db:reset:demo
```
샌드박스 메모: 호출 사이에 프로세스가 정리됨 → PG는 매 호출 `pg_ctl start`(포트 5433, /tmp 소켓), dev 서버와 e2e는 같은 호출 안에서 실행.
