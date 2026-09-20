# 다음 세션 인계 노트 (nmd) — 2026-09-20 (a) · P4-b부터

## 0. 시작 전에 읽을 것
1. 프로젝트 메모리 `business-architecture` → `principles-and-architecture` → `overview`
2. `docs/plan/connection-ledger.md` (연결 장부 — 회장님 지시 "전체가 유기적으로 돌아가야 한다"의 추적 장치)
3. `docs/01-design/P4-output-breadth-design.md` (**승인된 설계** · P4-a는 구현됨 · **P4-b가 다음**)
4. 이 노트

## 1. 지금 상태 (실측 · 2026-09-20)
- **main = `8a16465`** (로컬·원격 일치). P3-a와 P4-a가 모두 머지됨.
- 검증(엘 샌드박스, main 트리): typecheck 11 · 테스트 **177** · rls · revision · backbone 13/13 · **platform 22/22** · **drawing 12/12** · auth PASS · **demo_e2e 69/69**.
- 연결 장부: **이어짐 9 · 약함 0 · 없음 5**. 약한 고리가 처음으로 0.
- 발표 대본 **9장면**(DEMO.md v3), 그중 치수 전파·도면 장면이 새로 실동.

## 2. 매칭표 — 한 것 / 안 한 것

### 2-1. P 카드 (승인된 20→80 순서)
| 카드 | 상태 | 근거 |
|---|---|---|
| P1 코드 기반 등뼈 | **완료** | `backbone:test` 13/13 · BOM 11행이 등록 관계에서 나옴 |
| P2 Toolbox | **완료(부분)** | 플로팅 창·역번역·흐름도·명령 동기화 실동 / **자연어 번역 실모델 0회**(API 키 없음) |
| P3-a 플랫폼 관리자 계층 | **완료** | `platform:test` 22/22 · 3계층 · DB①/② 권한 분리 |
| P3-b DB①→DB② 프로젝션·학습 1수준 | **미착수** | 회장님 DXF 추출 연구 결과 후 |
| P3-c Special Tool Box 슬롯 | **미착수** | 사장님 **D1**(첫 시연 사례) 후 |
| P4-a 치수 전파 · 도면 | **완료** | `drawing:test` 12/12 · e2e S18~S21 |
| **P4-b 견적·Tech Data·구매** | **다음 차례** | 설계서 §3 6~9 |
| P6 통합 | 미착수 | 장부 '없음' 0 + 한 코드가 등록→승인까지 사람 재입력 없이 |
| P5 발표 | 마지막 | 80% 완성 후(회장님 결정) |

### 2-2. 화이트보드 6구역 (점수는 **엘 추정**, 회장님 조정 대상)
| 구역 | 09-19 | 지금 | 목표 | 지금 움직인 것 |
|---|---|---|---|---|
| ※⑤ MainForm | 72 | **75** | 90 | Design 탭에서 도면 등록·상태, 핵심 치수가 등록값 |
| ※② EDIM Toolbox | 70 | 70 | 85 | 변동 없음 |
| CPQ · BOM 산출 | 60 | **70** | 85 | 도면이 등록 치수로 전파 · 모든 산출이 스냅샷 한 입구 |
| ※① PLM Set-Up | 50 | **60** | 75 | Key Dimension 표 등록(기존 표 종류) / p32·35·36 여전히 없음 |
| ※④ ERP | 15 | 15 | 60 | 변동 없음 — 구매는 P4-b |
| ※③ 관리자 영역 | 0 | **40** | 70 | 3계층·DB①/② 권한 분리·요청 통로 / Special·학습 남음 |
| **평균** | 44 | **55** | 78 | |

### 2-3. 연결 장부 14고리
- **이어짐 9** — 코드→BOM · 매크로→BOM(서버 실행) · Rev→스냅샷 · 스냅샷→EBOM·Cost · 스냅샷+치수→도면 · 회사→플랫폼 요청·결정 등
- **약함 0**
- **없음 5** — ①BOM→견적·Export ②BOM→구매 요청(ERP) *(①②는 P4-b)* ③프로젝트 승인↔Rev·BOM *(P6)* ④DB①→DB② 프로젝션 *(P3-b)* ⑤Special→MainForm *(P3-c)*

### 2-4. 회장님 결정 D1~D5
| # | 내용 | 상태 |
|---|---|---|
| D1 | Special 첫 시연 사례 | **사장님 몫 · 대기** |
| D2 | '80' 기준 구역 목표치 | 승인됨 |
| D3 | P1·P2 병행 여부 | 순차로 결정 |
| D4 | 학습 AI 입력(도면/기술문서) | 하이브리드 — 회장님 DXF 연구 중 |
| D5 | 발표 시점 | 80% 완성 후 |

## 3. 다음 세션 첫 작업 = **P4-b** (설계 승인됨 · Tier B)
설계서 §3 6~9 그대로, 모든 산출물은 `runId`(BOM 스냅샷)에서 나온다:
1. **Quotation / PCR**(p66): 스냅샷에 저장된 cost를 **그대로** 읽는 인쇄용 문서 1종 → 합계가 Cost 카드와 구조적으로 일치
2. **Tech Data 1종**(p15~16): 매크로 결과값 표 + 승인 매크로 revision·입력을 함께 박음
3. **구매 요청**(p51~52): 스냅샷 줄 중 `kind='purchase'`만 모아 `purchase_request`(PR 번호·상태·품목·수량·필요일) → 화면 목록 + Export
4. 문서도 `drawing`과 같은 status 4단계·발행 잠금을 공유 (트리거 재사용)
5. 마이그레이션 `0009_document_purchase` · `document:test` 추가 · e2e 장면 추가 · 연결 장부 '없음' 5 → 3

**착수 전 확인할 것 1가지**: 구매 요청 Export를 **CSV**로 할지 **xlsx**로 할지(카드 원문은 "엑셀 Export"). xlsx는 라이브러리 추가가 필요해 Tier가 올라갑니다 — 엘 권고는 CSV 먼저.

## 4. 이번 세션에 못 한 기록 갱신 (다음 세션 초반에)
- `docs/plan/build_plan.py` — 아직 **`main 6bfa8e6` 기준**. 카드 상태·구역 점수가 P3-a·P4-a 이전.
- `docs/02-reports/build_progress_20260919.py` — **09-19판**. 구역 평균 29→44로 멈춰 있음(지금은 55 추정).
- 둘 다 갱신 후 HTML 재생성 → 회장님께 납품.

## 5. 정직 고지 (여전히 미검증)
- 회장님 **Windows PC 실행 0회** — 위 수치는 전부 엘 샌드박스(Linux) 기준
- 표·단가 **샘플** · Prompt→Macro **실모델 0회**(API 키 없음)
- 도면은 여전히 **선과 글자** — 실제 제작도 수준 아님
- p38 `KAD-□□□…` 슬롯과 Key Dimension의 대응 **문법 미정**(P4-a는 "사이즈 행 → W/H/L" 한 수준만)
- 기존 Macro 탭과 Toolbox Program Tool 기능 **중복 미정**
- 다단 BOM · p32 Material code · p35~36 Arrangement · DWG 첨부 없음

## 6. 회장님 몫
Windows 로컬 실행 1회 · API 키로 Prompt 1회 확인 · 회사 실 표(단가·Table1/NS) · 88md 백업 · (사장님) **D1**·기술 문서 · DXF 추출 연구 결과

## 7. 샌드박스 재개 절차 (매 세션 초기화됨)
```
npm i -g pnpm@9.15.0 ; apt-get update && apt-get install -y postgresql
# PG는 호출마다 죽는다 → up.sh 같은 스크립트로 매 bash 호출 앞에서 재기동
#   initdb /tmp/pgdata (trust) → pg_ctl -o '-p 5433 -k /tmp' → role edim(superuser)/db edim
git clone …/EDIM.git && cd EDIM && cp .env.example .env   # .env 접속 주소 3개(소유자·회사·플랫폼)
pnpm install --frozen-lockfile && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo
# e2e는 한 호출 안에서: db:reset:demo → pnpm dev & → python3 scripts/demo_e2e.py http://localhost:3000 shots → 69/69
pip install ezdxf playwright --break-system-packages && playwright install chromium
```
- 토큰: 샌드박스에서 지웠다. 지난 채팅 본문에 남은 기존 `el` 토큰을 엘이 찾아 쓰는 것을 회장님이 승인함(Contents 쓰기 OK · PR·Workflows 403 → **머지는 ff push로**).
- 주의: 인라인에 `pkill -f "next dev"` 금지(자기 셸이 죽는다) · `pnpm -r test`는 PG 필요 · `reset:demo`는 **도면 → BOM 스냅샷** 순서로 지워야 한다(FK).
