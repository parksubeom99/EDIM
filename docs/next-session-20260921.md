# 다음 세션 인계 노트 (nmd) — 2026-09-21 · P4 닫힘 · 다음 = 회장님 지시 대기(P6 후보)

## 0. 시작 전에 읽을 것
1. 프로젝트 메모리 `business-architecture` → `principles-and-architecture` → `overview` → `ways-of-working`
2. `docs/00-corpus/page-map.md` — **청사진 70쪽 대조**(쪽마다 판정·도는 것·없는 것·근거). 상태의 SSOT.
3. `docs/plan/connection-ledger.md` — 구역 간 연결(이어짐 11 · 약함 0 · 없음 3) + P4-a 결함 정정 절
4. 이 노트

## 1. 지금 상태 (실측 · 엘 샌드박스)
- 코드 기준 main = `1b7625e`(P4-b 머지). 그 뒤 문서 커밋(README · docs/screens · page-map · 대조 보고서 생성기 · 이 노트)이 얹혔다.
- typecheck 11 · 테스트 189 · rls · revision · backbone 13 · platform 25 · drawing 14 · document 28 · auth PASS · **demo_e2e 87/87**
- 청사진 70장: **실동 18 · 부분 22 · 미착수 11 · 개념·표지 19**
- P 카드: P1 · P2(부분) · P3-a · P4-a · P4-b 완료 / P3-b(회장님 DXF 연구 후) · P3-c(사장님 D1 후) · P6 · P5 남음

## 2. 이번 세션에 한 것
- P4-b 구현·머지: 0009_document_purchase · 견적/PCR · Tech Data · 구매 요청(PR→견적 요청→발주·PO·잠금) · CSV · 인쇄본
- P4-a 결함 정정: 스냅샷의 코드 개정 근거 = "최신"이 아니라 "그 슬롯으로 저장된 개정"(`revisionIdForSlots`)
- repo 점검에서 찾아 고친 것: README 가 7월(P0.5) 상태였음 → 전면 재작성 / repo 에 이미지 0장 → `docs/screens/` 27장 + `scripts/publish_screens.py` / `docs/00-corpus` 에 색인 없음 → `page-map.md` / `docs/ci/ci.yml` 에 DB 검증 6종 누락 → 보강
- 납품: 청사진 70장 대조 보고서(가로 75쪽 PDF + 다크 HTML) — 생성기 `docs/02-reports/build_blueprint_match.py`

## 3. 회장님 결정 대기
1. 코드 개정에 슬롯 **F** 를 넣을지 — 지금은 F 가 붙은 실행의 근거 개정이 빈 값(RCCS 문법 사안)
2. **Arrangement 묶음**(p13 · p35 · p36 · p46 · p58) 우선순위 — 70장 중 가장 큰 빈 곳
3. 다음 카드 — P6 통합으로 갈지(엘 권고: 연결 장부 '없음' 3 → 2)

## 4. 회장님 몫
Windows 로컬 실행 1회(pull 후 `pnpm db:generate && pnpm db:migrate`) · API 키로 Prompt 1회 · 회사 실 표(단가·Table1/NS) · 88md 백업 · DXF 추출 연구 결과 · **CI 배선**(`docs/ci/ci.yml` → `.github/workflows/ci.yml`, 토큰에 Workflows 권한이 없어 엘이 못 함) · (사장님) D1 · 기술 문서

## 5. 정직 고지 (여전히 미검증)
Windows 실행 0회 · 단가 샘플 · 도면은 선과 글자 · Prompt→Macro 실모델 0회 · PCR 은 p66 표 중 5줄 · Supplier 열 비어 있음 · 로그인은 이메일만 · 클라우드 배포 0회
- `docs/plan/build_plan.py` 는 **2026-09-19 시점의 계획서**로 그대로 뒀다(카드 상태가 그때 기준). 지금 상태는 page-map · connection-ledger · README 가 말한다.

## 6. 이번 세션에 엘이 낸 실수 (다음에 반복하지 말 것)
- 인라인 `pkill -f` 로 자기 셸을 죽임(이 노트 §7 에 이미 경고가 있었다) → 종료는 스크립트 파일로
- e2e 단언 이름이 실제 비교보다 컸다(S24c) → 이름값을 하게 고침
- 판정 기준을 써 놓고 스스로 어김(p58 자리만 있는 버튼을 '부분'으로) → 미착수로 정정
- 텍스트 추출본만 보고 p19 를 '빈 장'으로 단정 → 쪽 이미지를 보고 'Detail Process 간지'로 정정. **청사진은 텍스트가 아니라 쪽 이미지가 원본이다.**

## 7. 샌드박스 재개 절차 (매 세션 초기화됨)
```
npm i -g pnpm@9.15.0 ; apt-get update && apt-get install -y postgresql
# PG 는 bash 호출마다 죽는다 → up.sh(initdb /tmp/pgdata trust → pg_ctl -p 5433 -k /tmp → role/db edim)를 매 호출 앞에서
git clone …/EDIM.git && cd EDIM && cp .env.example .env
pnpm install --frozen-lockfile && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo
pip install ezdxf playwright matplotlib --break-system-packages   # chromium: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
# e2e 는 한 스크립트 안에서: db:reset:demo → pnpm dev & → python3 scripts/demo_e2e.py http://localhost:3000 shots → 87/87
# 보고서: unzip EDIM.pdf → python3 docs/02-reports/build_blueprint_match.py <corpus> <shots> <out> → playwright page.pdf(1920×1080)
```
- 토큰: 샌드박스에서 지웠다. 지난 채팅 본문의 기존 `el` 토큰을 엘이 찾아 쓰는 것을 회장님이 승인함(Contents 쓰기 OK · Workflows 403 → 머지는 ff push 로).
- 주의: 인라인 `pkill -f` 금지 · `pnpm -r test` 는 PG 필요 · reset:demo 는 도면·문서·구매 요청 → BOM 스냅샷 순서(FK)
