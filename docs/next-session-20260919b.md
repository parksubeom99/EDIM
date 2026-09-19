# 다음 세션 인계 노트 (nmd) — 2026-09-19 (b)

## 0. 먼저 읽을 것
프로젝트 메모리(business-architecture → principles → overview) → `docs/04-decisions/2026-09-19-business-architecture-ledger.md` → `docs/01-design/P1-code-backbone.md` → 이 노트.

## 1. 회장님 결정 (2026-09-19)
- 발표는 **80% 완성 후**에 한다(D5). 20은 발표 불가.
- D2 '80' 기준·가중 = 제안대로 승인 · D3 = **순차**(P1 → P2) · D4 학습 AI 1수준 입력 = **하이브리드**(도면 + 기술문서). 회장님이 다른 채팅에서 DXF 추출 준비 연구 중 → P3 학습 1수준 설계 때 그 결과를 상속할 것.
- P1 스키마 변경(Tier B) 승인.
- **미정: D1 Special Tool Box 첫 시연 사례** — P3 착수 전까지 필요.

## 2. 상태 (실측)
- main = a70daa9 (변경 없음). 작업 브랜치 **`feat/p1-code-backbone`** (main 위 적층, push 완료). **main 머지는 회장님 승인 대기.**
- P1 완료분: `@edim/bom-code` 엔진 · 마이그레이션 `0006_code_backbone`(4 테이블) · Set-Up API 5종 · `/setup` 화면 3종 + Part List Running Test · Action Bar BOM/EBOM/Cost가 DB 카탈로그로 전환 + 스냅샷 · e2e 23/23.
- 검증: typecheck 11 · 테스트 156 · backbone:test 13/13 · revision:test · rls:test · demo_e2e 23/23 (455.4 · ₩15,487,170 불변).

## 3. P1 잔여(선택) → 그다음 P2
- Code Builder 선택지를 Sub Code DB에서 읽기 · 자식 코드 슬롯 상속(p34 `KDP 1-21-13-15`) · 다단 BOM · 덱에 P1 장면 추가.
- P2 = 청사진대로 Toolbox: 플로팅 창(UI Tool/Program Tool 탭·드래그·리사이즈·도킹) · 자연어→Macro 화면 연결 · STEP 5 역번역 · Table 등록.

## 4. 회장님 몫 (변동 없음)
Windows 로컬 실행 1회(0회) · 회사 실 표 · 88md 백업 · 스킬 3개 저장(이 세션 마운트 기준 el-master v8.22, memory-gate 없음 → 미저장으로 관측).

## 5. 시작 절차 (샌드박스)
pnpm·PostgreSQL 16이 매 세션 없음 → `npm i -g pnpm@9.15.0`, `apt-get install postgresql`, initdb `/tmp/pgdata`(포트 5433, /tmp 소켓, role edim superuser). 이후 DEMO.md §1과 동일. dev 서버와 e2e는 같은 호출 안에서.
