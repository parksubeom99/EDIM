# 다음 세션 인계 노트 (nmd) — 2026-09-19 (c)

## 0. 시작 전에 읽을 것
1. 프로젝트 메모리 `business-architecture` → `principles-and-architecture` → `overview`
2. repo `docs/04-decisions/2026-09-19-business-architecture-ledger.md`
3. `docs/plan/connection-ledger.md` (유기 연결 장부 — 회장님 지시) · `docs/01-design/P3a-platform-admin-design.md` (**승인된 설계**)
4. 이 노트

## 1. 지금 상태 (실측)
- **main = f2b4277** — P1 코드 기반 등뼈 · P2 플로팅 Toolbox · 표 통일 · 자식 코드 상속 · 진행 보고서 생성기까지 병합됨(회장님 승인).
- 브랜치 `design/p3a-platform-admin` (main 위, 문서만): P3-a 설계안 + 연결 장부 + 이 노트. **main 미병합** — 다음 세션은 이 브랜치에서 구현 브랜치를 따면 된다.
- 검증(엘 샌드박스, main 트리와 동일 해시): typecheck 11 · 테스트 169 · backbone 13/13 · revision · rls · demo_e2e **39/39** (455.4 · ₩15,487,170 불변).
- 구역 평균 29 → 44 / 목표 78 (엘 제안 기준). 발표 9장면 중 4 실동 + 1 부분.

## 2. 회장님 결정 (이번 세션 전체)
- 발표는 80% 완성 후 · D2 승인 · D3 순차 · D4 하이브리드(회장님이 다른 채팅에서 DXF 추출 연구 중) · P1 스키마 승인
- 표 모양 = 청사진 모양으로 통일 · p34 자식 코드 상속 해석 확인 · main 머지 승인
- **기술 관련 문서(D1 Special 첫 시연 사례 포함)는 사장님 몫**
- 남은 순서 승인: **P3-a → P4 → P3-b(DXF 연구 결과 후) → P3-c(사장님 D1 후) → P6 통합 → P5 발표**
- **"마지막으로 다 연결하고 EDIM 전체가 유기적으로 돌아가야 한다 — 잊지 말 것"** → 연결 장부로 추적, P6 통합 기준 정의
- P3-a: **Q1 좁게 · Q2 나중에 · Q3 포함**

## 3. 다음 세션 첫 작업 = P3-a 구현 (설계 승인됨, Tier B)
설계서 §3·§4 그대로:
1. 마이그레이션 `0007`: `CREATE SCHEMA platform` · 역할 `edim_platform` · `platform.admin_user` · `platform.learning_source`(빈 골격) · `public.platform_request`(RLS, kind 첫 종류 = Special 의뢰/문의)
2. 권한: `edim_app` → platform 스키마 접근 0 · `edim_platform` → public 업무 테이블 SELECT 0 (tenant 메타·platform_request만)
3. `platformDb` 접속 모듈(`PLATFORM_DATABASE_URL`, Prisma multiSchema 미사용) · `getPlatformSession()` · 시드 `platform@edim.test`(별도 계정)
4. 화면: `/platform`(테넌트 목록·요청 대기열·DB① 상태) · `/m/company` User Management(owner 전용, 마지막 owner 강등 금지, 감사)
5. `platform:test`(권한 거부 실측) + e2e 추가 + `.env.example`·DEMO.md 갱신
6. 연결 장부의 "회사 → 플랫폼" 행을 갱신
그다음 P4는 **BOM 스냅샷 id를 입력으로** 삼아 연결 장부의 '약함' 3건(EDIM Run 값이 브라우저 상태로 전달 · 스냅샷을 읽는 곳 없음 · 어느 Rev로 돌렸는지 기록 없음)을 같이 해소한다.

## 4. 정직 고지 (여전히 미검증)
- 회장님 Windows PC 실행 **0회** · 표·단가 **샘플** · Prompt→Macro 실모델 **0회**(API 키 없음)
- `Var(NS)`·코드 이름 용어집 샘플 상수 · RCCS F 슬롯과 순번 상속의 관계 미정리(문법 결정 필요)
- 기존 Macro 탭과 Toolbox Program Tool 기능 중복 — 어느 쪽을 남길지 미정

## 5. 회장님 몫
Windows 로컬 실행 1회 · API 키로 Prompt 1회 확인 · 회사 실 표 · 88md 백업 · 스킬 3개 저장(memory-gate 신규 · el-master v8.23 · quality-meta v8.13 — 이 세션 마운트 기준 미저장으로 관측) · (사장님) D1·기술 문서

## 6. 샌드박스 시작 절차 (매 세션 초기화됨)
```
npm i -g pnpm@9.15.0 ; apt-get update && apt-get install -y postgresql
# PG: initdb /tmp/pgdata (trust) → pg_ctl -o '-p 5433 -k /tmp' → role edim(superuser)/db edim 생성
git clone …/EDIM.git && cd EDIM && git checkout design/p3a-platform-admin
cp .env.example .env && pnpm install --frozen-lockfile
pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo
# dev 서버와 e2e는 같은 호출 안에서: pnpm db:reset:demo → pnpm dev & → python3 scripts/demo_e2e.py http://localhost:3000 shots → 39/39
```
- 토큰: 샌드박스에서 삭제함 → **재개 시 회장님이 다시 주시거나 지난 채팅의 기존 토큰 사용을 승인**해 주셔야 함(Contents 쓰기 OK, PR·Workflows 403).
- 주의: 인라인 명령에 `pkill -f "next dev"`를 쓰면 자기 셸이 죽는다 → 스크립트 파일 안에서만. `pnpm -r test`는 PG가 떠 있어야 한다(auth 테스트가 DB 사용).
