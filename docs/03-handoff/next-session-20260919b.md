# 다음 세션 인계 노트 (nmd) — 2026-09-19 (b)

## 0. 먼저 읽을 것
프로젝트 메모리(business-architecture → principles → overview) → `docs/04-decisions/2026-09-19-business-architecture-ledger.md` → `docs/01-design/P1-code-backbone.md` → 이 노트.

## 1. 회장님 결정 (2026-09-19)
- 발표는 **80% 완성 후**에 한다(D5). 20은 발표 불가.
- D2 '80' 기준·가중 = 제안대로 승인 · D3 = **순차**(P1 → P2) · D4 학습 AI 1수준 입력 = **하이브리드**(도면 + 기술문서). 회장님이 다른 채팅에서 DXF 추출 준비 연구 중 → P3 학습 1수준 설계 때 그 결과를 상속할 것.
- P1 스키마 변경(Tier B) 승인.
- **미정: D1 Special Tool Box 첫 시연 사례** — P3 착수 전까지 필요.

## 2. 상태 (실측)
- main = a70daa9 (변경 없음). 작업 브랜치 **`feat/p1-code-backbone`** → 그 위 **`feat/p2-toolbox`** (둘 다 push 완료). **main 머지는 회장님 승인 대기.**
- P1 완료분: `@edim/bom-code` 엔진 · 마이그레이션 `0006_code_backbone`(4 테이블) · Set-Up API 5종 · `/setup` 화면 3종 + Part List Running Test · Action Bar BOM/EBOM/Cost가 DB 카탈로그로 전환 + 스냅샷 · e2e 23/23.
- P1 추가: Code Builder 선택지 = 등록된 Sub Code · 표에 행 없는 값은 422.
- P2 완료분(`docs/01-design/P2-toolbox.md`): 플로팅 Toolbox 창(UI Tool/Program Tool · 드래그·리사이즈·도킹) · STEP 5 역번역 `describe()` · 흐름도 · Prompt→Macro 화면 연결(모델 미연결 시 정직 고지) · 명령 버튼 설정 ↔ Action Bar 실시간 동기화.
- 검증: typecheck 11 · 테스트 166 · backbone:test 13/13 · revision:test · rls:test · demo_e2e **36/36** (455.4 · ₩15,487,170 불변).

## 3. 남은 것 → 그다음 P3
- P1 잔여: 자식 코드 슬롯 상속(p34 `KDP 1-21-13-15` — **문법 해석을 회장님께 확인받고** 착수) · 다단 BOM.
- P2 잔여: Macro의 Table1·Var(NS)·용어집을 Set-Up DB 표에 연결 · Prompt→Macro 실제 모델 1회 확인(회장님 PC, API 키) · 덱에 P1·P2 장면 추가.
- P3 = 경계: 플랫폼 관리자 · Special 슬롯(**D1 필요**) · DB①→② 프로젝션 · 학습 1수준(하이브리드 — 회장님 DXF 추출 연구 상속).
- 샌드박스 주의: 인라인 명령에 `pkill -f "next dev"`를 쓰면 자기 셸이 죽는다(명령줄에 같은 문자열). 스크립트 파일 안에서만 쓸 것.

## 4. 회장님 몫 (변동 없음)
Windows 로컬 실행 1회(0회) · 회사 실 표 · 88md 백업 · 스킬 3개 저장(이 세션 마운트 기준 el-master v8.22, memory-gate 없음 → 미저장으로 관측).

## 5. 시작 절차 (샌드박스)
pnpm·PostgreSQL 16이 매 세션 없음 → `npm i -g pnpm@9.15.0`, `apt-get install postgresql`, initdb `/tmp/pgdata`(포트 5433, /tmp 소켓, role edim superuser). 이후 DEMO.md §1과 동일. dev 서버와 e2e는 같은 호출 안에서.
