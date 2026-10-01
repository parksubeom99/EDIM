# lmd N — 밤샘 청크 회수서: ccmd L 완주 + 통합 + CP4 자료 (CC → 엘 · 2026-10-01)

- 인계: ccmd N(`ccmd-N-L-finish-20261001.md`) · 작업 지시 원본 = ccmd L(`ccmd-L-E청크-20260930.md`)
- 작업 브랜치: `feat/n-l-finish` = main `733015e` 위 + 커밋 12개
- 이번 청크 PR: **머지 대기(회장님 승인 대상)** — 번호는 5절
- 증빙: `docs/03-handoff/n-evidence/` · CP4 사실 묶음: `docs/03-handoff/cp4-facts-20261001.md`(N 판으로 갱신)

## 1. 한 일

| STEP | 한 줄 |
|---|---|
| 0 | main `ce73119` · PR #4 OPEN/MERGEABLE/CI pass · L 미커밋 3파일 · ccmd L 원본 = Downloads — PASS |
| 1 | PR #4 ff 머지 `ce73119..733015e` · typecheck 0 |
| 2 | 완료 정의 4항목 원문을 결정 장부에 SSOT 로(`docs/04-decisions/2026-09-28-completion-definition.md`) · cp4-facts 의 '원문 미확보' 교체 |
| 3 | PCR 참고 줄 "스냅샷 원가 기준 이익 = 견적 − 스냅샷 원가 = 1,548,717"(계산 · 인쇄본 · Excel) · e2e S80e |
| 4 | ccmd L 완주: **LB** 4건 · **LA-2** p43 · p44 · **LA-3** p69 · **LA-1** p42 · **LC** CI · 문서. 마이그레이션 0038 · 0039 — **회장님 결정(아래 3-0)** |
| 5 | 통합 · 전수 — 단위 355 · DB 13종 · 개발 e2e 402/402 · 킷 e2e 399/399. 킷에서만 드러난 QR 주소 결함 1건 수리 |
| 6 | 판정 70 = 실동 46(샘플 7) · 부분 5 · 미착수 0 · 개념 19 · `--check` EXIT 0 · 연결 장부 14 · 0 · 0 |
| 7 | CP4 사실 묶음 N 판 · 이 lmd |

## 2. STEP 0 실측

```
C:/dev/EDIM                                                f369926 [main]
C:/dev/EDIM/.claude/worktrees/ccmd-edim-file-review-0a058c 0fbb112 [fix/l-b-tidy]
C:/dev/EDIM/.claude/worktrees/ccmd-m2-cp4-close-4974f1     733015e [claude/ccmd-m2-cp4-close-4974f1]
origin/main -1: ce73119 docs(m1-lmd): lmd-M1-cp4-final-20260930 …
gh pr list: 4  ccmd M-2: …  claude/ccmd-m2-cp4-close-4974f1  OPEN
gh pr checks 4: verify pass 1m34s
gh pr view 4: {"mergeStateStatus":"CLEAN","mergeable":"MERGEABLE","state":"OPEN"}
git -C <L> status --short:  M annot-editor.tsx ·  M dxf.ts ·  M scripts/demo_e2e.py
git -C <L> log --oneline -3: 0fbb112 · da10672 · a3b1853
원격 L 브랜치: 없음
```

- **ccmd L 원본은 저장소 · worktree 에 없었다.** `C:\Users\psb\Downloads\ccmd-L-E청크-20260930.md`(26,384 B · 09-30 11:38)에서 찾았다.
- 회장님 PC `C:\dev\EDIM`(main 체크아웃)은 여전히 `f369926` 이다. pull 은 회장님 몫으로 두고 건드리지 않았다.

## 3. ccmd L 완주 결과

### 3-0. 지시 충돌 — 회장님 결정으로 풀었다

- ccmd N 은 "신규 스키마 마이그레이션 금지(Tier B — 설계만)"였다.
- ccmd L 의 LA1~LA5(p43 · p44)와 LA7(p69)은 새 표가 본체다(0038~).
- N 대로 하면 미착수 4 중 3쪽이 남아 N 의 기대(미착수 → 0)와 맞지 않는다.
- LB · STEP 1~3 을 먼저 끝낸 뒤 회장님께 물었다. 답: **"ccmd L 설계대로 추가"**.
- 그래서 0038 · 0039 를 ccmd L 하드 가드대로 만들었다. 새 표 = 추가만 · tenant RLS ENABLE · FORCE · 기록 표는 edim_app 에 UPDATE · DELETE 없음 · edim_platform 0.

### 3-1. LB — 남은 칸 정리

| 항목 | 한 일 | 증명 |
|---|---|---|
| LB-1 S69 시험 강화 | L 미커밋분 그대로(data-busy · 5초 안에 개수가 안 늘면 같은 끌기 1회 재시도 · 재시도 사실을 단언 값에) | 7회 실행(개발 5 · 운영 킷 2) 전부 PASS · **재시도 0**(`'다시 끈 도구', []`) |
| LB-2 CADRULE 글자 겹침 | **L 미커밋분은 미완성이었다** — `placeLabels` 를 부르는데 정의가 없었다(그대로면 typecheck 실패). 보존 커밋 뒤 구현: 겹치면 한 줄(1.2h)씩 아래로 · 결정론 · 안 겹치면 자리 그대로 | 단위 1 · e2e **S76f**(ezdxf 글자 상자 교차 0). 검사가 헛돌지 않는지 실측: `SFN 1 @3150,1236` 이 1216 → 1162 로 비켜났다 |
| LB-3 작업대 툴바 '설계 심볼'(p58) | 잠긴 자리 → 이 스냅샷의 도면 목록 select → 고르면 `/drawings/{id}/annotate#symbol-panel` | e2e S41a(새 규칙: 잠긴 자리 = Free CAD 하나) · **S41s** |
| LB-4 생성기 확정판 4 반영 | p28 · p36 · p38 · p58 · p66 · p21~26 · 표지는 M 에서 이미 반영돼 있었다. 남은 p54 · p57 근거 칸만 보강(판정 불변) | `--check` |

LB-3 은 ccmd L 과 다르게 한 곳이 하나 있다(6절-1).

### 3-2. LA-2 — 생산 · 창고 · 품질(p43 · p44) · 0038

| 쪽 | 화면 경로 | e2e | 판정(CC 초안) | 샘플 표지 |
|---|---|---|---|---|
| p43 Work Process | `/setup/work-process` — Material 표 · Process 표 · 기준정보(작업장 3 · 기계 3 · 작업자 A~D · 창고 2) · 화면 등록 | S83a · S83b | 실동(샘플) | 있음(화면 · 작업지시서) |
| p44 MRP | `/m/mrp` — 수량 · 납기 저장 → 총소요 · 재고 · 입고 예정 · 순소요 · 시기 → 구매 요청 초안(기존 흐름 · 같은 스냅샷 409) · 작업지시 초안 | S84a · S84b | 실동(샘플) | 있음 |
| p44 작업지시 · 공정 · Capacity | `/m/work-orders` 아래 세 가지 · `/m/capacity`(초과 칸 빨강) | S85a~d | 실동(샘플) | 있음 |
| p44 창고 · 재고 | `/m/warehouse` — 현재고 · 단가 4종 · Min Stack 경고 · 음수 409 · 405(추가만) | S86 | 실동(샘플) | 있음 |
| p44 품질 | `/m/quality` — 검수 3종 · 불합격 → 하자(열림 → 조치 → 닫힘) · 반품 이동 · A/S | S87 | 실동(샘플) | — |
| 경계 | viewer 읽기 200 · 쓰기 403 / 다른 회사 404 · 0건 | S83b · S88 | — | — |

작업지시 화면의 세 가지:
- 지시
- 공정 착수 · 완료(추가만) · 앞 공정 409 · 완성품 검수 없이 마지막 완료 409 · 완료 시 재고 소모
- A4 작업지시서(QR)

- 계산 · 규칙 위치: `app/lib/mrp.ts`(결정론 · 단위 4) · `packages/db/src/mes.ts`(트랜잭션 · 잠금) · DB 트리거 `stock_move_guard`(음수 재고 · 동시 출고 경합 · 창고 회사 경계).
- `mes:test` 26: 다른 회사 0건 · 추가만 6표 UPDATE/DELETE 거부 · 작업지시 DELETE 거부 · 플랫폼 7표 읽기 거부 · 음수 거부 · 경합(3+3>4 → 하나만 · 현재고 1) · 단가 4종 · 공정 규칙 4 · 다른 회사 창고 404.
- **시연 수치 보호**: 원가 계산은 새 표를 읽지 않는다. EU 제품에 mfg_rate · 공정을 넣지 않았다. 원가 ₩15,487,170 · 견적 ₩17,035,887 은 S80d · S80e 가 못 박는다. 매크로 455.4 · BOM 11행 · 회귀 1,200 · S75~S79 는 기존 단계가 그대로 PASS.

### 3-3. LA-3 — 모바일 · QR(p69) · 0039

| 쪽 | 화면 경로 | e2e | 판정(CC 초안) | 샘플 표지 |
|---|---|---|---|---|
| p69 모바일 | `/mobile`(390×844) 다섯 탭(아래) | S89 | 실동(샘플) | 입출고 탭 |
| p69 QR | `/q/{토큰}`(route handler · 404/410 상태 코드 그대로) — 다섯 칸(아래) | S90 | 실동(샘플) | — |

- 모바일 다섯 탭: 승인(기존 API) · 대화(기존 활동 기록) · 입출고 · 검수 · 공지(owner) · 가로 넘침 없음.
- QR 다섯 칸: Project 정보 · 도면(발행본) · 각종 서류 · History · 할 일.
- QR 경계: 로그인 → 돌아옴 · 다른 회사 404 · 폐기 410 · 없는 토큰 404 · viewer 열람 200 / 만들기 403.
- QR 이 들어간 인쇄본: 작업지시서 · 발행 도면 시트.
- 유지보수(p69-5) = 하자 종류 `as` 재사용(새 표 없음). 증강 현실은 화면에 "확장 단계 — 아직 없음".
- **새 의존성 1개**(하드 가드 9): `qrcode-generator` **2.0.4** · **MIT** · 의존성 0 · lockfile 갱신.

### 3-4. LA-1 — 설계 우선순위 · 기준점 · 오류 체크(p42)

- 표 역할 `priority`(JSON 표 역할이라 마이그레이션 없음)를 **SPF 샘플 제품에만** 넣었다. 4행(W 1 상위설계 · H 2 · detail.Fan.A 3 · L 4 `> 300`).
- 오류 체크 식(`<= N` · `< W` …)은 **기존 `max` · `min` 규칙으로 컴파일**해 같은 `checkDesign` 이 판정한다(새 판정기 없음). 위반이면 도면 422 다.
- 스냅샷 `dims.priority` 에 남기는 것: 바꿀 후보(우선순위 역순) · 바꾸지 말 것(상위설계 우선자료) · 읽을 수 없는 식.
- 화면 `/setup/design-priority`: p42 표 · 최신 스냅샷 판정 · Material management 3칸 링크 · "3D 2D CAD Mapping — 아직 없음 — 필요한 입력: 3D 모델 · CAD 규칙(M4)".
- 증명: 단위 2(bom-code) · e2e **S91a**(샘플 위반 0 · EU 스냅샷에 priority 키 없음) · **S91b**(위반 3 → 후보 L → H · W 바꾸지 말 것 · 화면 같은 판정 · 되돌림).

### 3-5. LC — 운영 문서 · 정리

| 항목 | 결과 |
|---|---|
| DEPLOY.md | 빈 볼륨에서 시연 · e2e · `EDIM_E2E_TARGET=kit` · `EDIM_PUBLIC_URL` · 연결 최대 **14(실측)** / 엘 기록 17 |
| DEMO 방어 카드 수치 · 부록 L | 단위 355 · DB 13종 · e2e 402(킷 399) · 청사진 46 · 5 · 0 · 부록 L(생산 흐름 · 모바일 QR · 설계 우선순위) · 장면 번호 불변 |
| CI | 머리 주석 "DB 검증 9종" → 13종 · **`mes:test` 추가** · **`--check` 배선**(엘 판정: LC 에서) |
| README | 배지 · 테스트 표 · 머지 게이트 · CI · 청사진 줄 · 완료 정의 링크 |
| 연결 장부 | J · K 절 → "엘 확정 09-30 — 14 · 0 · 0" · 새 "ccmd L 이후(CC 주장)" 절(곁가지 5 · 14 · 0 · 0) |
| 옛 운영 킷 볼륨 삭제 | **이미 없음** — M-1 에서 삭제됨(`edim-prod_edim-prod-pgdata` 목록에 없음) · 이번에 지운 것 없음 |
| 새 시연 태그 `demo-20260930-l` | **만들지 않음** — L 통합분이 아직 main 에 없다(태그는 머지된 main 에 · 회장님 머지 뒤) |
| 반쪽 worktree 폴더 `k-c-cad1` · `kc-cad1-work` | **있음 · git 등록 없음(0)** · **지우지 않음** — 지우면 되돌릴 수 없어 ccmd N §0.5 에 따라 보고만 한다 |

## 4. 실측 수치 원문

전수(main `733015e` + 브랜치 · `db:reset:demo` 직후):
```
pnpm install EXIT 0 · pnpm db:generate EXIT 0 · pnpm db:migrate EXIT 0 · pnpm db:reset:demo EXIT 0 · pnpm typecheck EXIT 0 · pnpm -r test EXIT 0
packages/bom-code test:       Tests  60 passed (60)
packages/macro-registry test:       Tests  15 passed (15)
packages/hierarchy-address test:       Tests  18 passed (18)
packages/macro-dsl test:       Tests  54 passed (54)
packages/macro-verify test:       Tests  19 passed (19)
packages/macro-compile test:       Tests  13 passed (13)
apps/web test:       Tests  176 passed (176)
```
단위 **355**(M-2 347 + placeLabels 1 · 참고 줄 1 · MRP/Capacity 4 · 우선순위 2).

DB 검증 13종(`packages/db/package.json` 의 `:test` 전 종목):
```
backbone:test EXIT 0 :: ALL PASS (14)
consulting:test EXIT 0 :: ALL PASS (14)
document:test EXIT 0 :: ALL PASS (37)
drawing:test EXIT 0 :: ALL PASS (30)
hierarchy:test EXIT 0 :: HIERARCHY DOMAIN: PASS
learning:test EXIT 0 :: LEARNING: ALL PASS (24/24)
macro:test EXIT 0 :: MACRO REGISTRY RLS: PASS
mes:test EXIT 0 :: MES: ALL PASS (26/26)
platform:test EXIT 0 :: ALL PASS (25)
project:test EXIT 0 :: PROJECT DOMAIN: PASS
revision:test EXIT 0 :: ALL PASS
rls:test EXIT 0 :: RLS ISOLATION: PASS
special:test EXIT 0 :: SPECIAL: ALL PASS (23/23)
```

개발 e2e(host · `next dev` · 마지막 코드):
```
typecheck EXIT 0
[demo_e2e] target=host · 402/402 steps passed
e2e EXIT 0
```
- 384 → 402(+18). 늘어난 단계:
  - S41s · S76f · S80e — LB · STEP 3
  - S83a · S83b · S84a · S84b · S85a~d · S86 · S87 · S88 · S89 · S90 — LA-2 · LA-3
  - S91a · S91b — LA-1
- 바꾼 기존 단언 2곳(숫자를 맞춘 것이 아니라 새 규칙으로):
  - S41a: 설계 심볼이 명령이 되어 잠긴 자리는 Free CAD 하나
  - S61c: Work Process 가 링크가 되어 '아직 없음'은 그 밖의 ERP 하나
- 캡처 86장(S37) — 89 · 90~99 추가.

킷 e2e(`docker compose -p edim-prod-n2` · `next start` · 마지막 코드):
```
config EXIT 0 · up EXIT 0 · Applying migration `0038_mes` · `0039_mobile_qr` · Demo seed: MES sample master …
SKIP(host-only) S76d — 저장소 폴더 packages/bom-code/cad-rules 에 cad-rules.local.json 을 둔다 — 킷 컨테이너는 호스트 폴더를 못 본다
SKIP(host-only) S79d — 호스트 DB 에 bench:seed 를 돌린다 — 킷 DB 가 아니라 호스트 .env 의 DB 에 닿는다
SKIP(host-only) S80c — 저장소 폴더 packages/bom-code/cost-rules 에 pcr-rules.local.json 을 둔다 — 킷 컨테이너는 호스트 폴더를 못 본다
[demo_e2e] target=kit · 399/399 steps passed · host-only 건너뜀 3: S76d, S79d, S80c
e2e EXIT 0
pg_stat_activity 최대(1초 간격) = 14
```

**첫 킷 실행(`edim-prod-n`)은 EXIT 1 이었다(정직 기록).**
- 실패 지점: S90 에서 `Page.goto: net::ERR_ADDRESS_INVALID at http://localhost:3000/q/…` · 395단계.
- 원인(실측): 운영 컨테이너는 `HOSTNAME=0.0.0.0` 이라 `req.nextUrl.origin` = `http://0.0.0.0:3000` 이다. 그래서 두 가지가 0.0.0.0 을 가리켰다.
  - `/q` 리다이렉트
  - **인쇄본 QR 내용** — 휴대폰이 찍어도 못 간다
- 개발 모드에서는 안 보이는 결함이다. 이 청크의 새 코드에서 났다.
- 수리:
  - `publicOrigin()` — `EDIM_PUBLIC_URL` → `x-forwarded-*` → Host 헤더 순
  - `/q` 는 상대 Location
  - S90 에 "QR 주소 = 사용자가 연 주소" 단언 추가
- 수리 뒤 개발 402 · 킷 399 모두 PASS.

볼륨(`n-evidence/kit_volumes.txt`):
```
before 36 → mid 38(+ edim-prod-n_edim-prod-pgdata · edim-prod-n2_edim-prod-pgdata) → docker volume rm 두 이름 → after 36 · before == after
```

## 5. rebase 결과 · PR

- L 미커밋 3파일을 L worktree 에서 먼저 커밋했다(`3f95c7f` · 원본 보존 — "미완성(placeLabels 미정의)"을 메시지에 적음). 그 커밋을 `feat/n-l-finish` 로 가져와 main 위로 rebase 했다.
- **충돌 0건** — 예상한 두 면이 모두 git 자동 병합으로 풀렸다. 예상 밖 충돌도 없다.
  - `dxf.ts cadEntities`: M 의 `datumMm(…, sec.dir)` 두 줄이 그대로 남았다(rebase 뒤 실측 — 메모의 풀이 "방향 인자 유지"와 결과가 같다).
  - `demo_e2e.py`: 깨끗하다.
- PR: 아래 5절 끝에 번호. **머지하지 않았다.**

## 6. 설계와 다르게 한 곳(이유)

1. **LB-3 안내 문구**: ccmd L 은 "먼저 DWG View 에서 도면을 등록하세요"였다.
   - 실제로 도면을 등록하는 곳은 Design 탭의 '도면 등록'이다(DWG View 는 띄우기만 한다).
   - 그래서 "먼저 도면을 등록하세요 — Design 탭의 '도면 등록'"으로 썼다.
   - 잠긴 select 는 focus 를 못 받는다. 그래서 목록은 도면 등록 이벤트 · 창 focus 로 다시 읽는다.
2. **Capacity 정의**(ccmd L 에 세부 없음):
   - 지시된 단계를 작업지시 착수일부터 순서대로 날에 앉힌다(앞 단계 시간 합 × 수량 ÷ 8h).
   - 부하 = 시간 × 수량 × 인원 · 가용 = 작업장 가용 시간/일(샘플 8).
3. **재고 소모**: 제품 작업지시가 끝날 때 스냅샷의 **구매 품목 중 자재 정보가 있는 것만** 수량만큼 소모한다. 재고가 모자라면 409 이고 완료도 되돌린다.
4. **MRP 의 스냅샷**: 프로젝트 노드의 **최신** BOM 스냅샷(또는 같은 노드의 `run`). 프로젝트에 제품 코드 칸이 없어서다.
5. **재고 단가 4종 시험**: ccmd L 은 "단위"였지만 계산이 DB 쪽(`stockBalances`)이라 `mes:test`(DB)에서 시험했다.
6. **우선순위 오류 체크의 `<` · `>`**: 기존 규칙(max · min)처럼 경계값을 포함으로 본다.

## 7. 사이드이슈(고치지 않은 것)

- 개발 서버 node 가 e2e 한 번에 **6GB** 까지 분다(진행이 몇 분씩 느려짐 · 실패는 아님). M-1 이 적은 "16GB" 와 같은 부류다. 시연은 운영 모드(DEMO 0-A)다.
- 작업지시 화면은 완료된 공정에도 착수 · 완료 버튼 자리가 보인다(눌리지 않음 · 서버가 409). 화면 정리 거리.
- `docs/screens/`(README 의 "전체 68장")는 갱신하지 않았다 — e2e 캡처는 `shots/` 에 86장이 있다.

## 8. 엘에게 묻는 것

1. **p44 판정** — p44-6 "원가(자재 단가 · 인건비 · 공정비용)" 중 공정비용은 하드 가드 5(원가가 새 표를 읽지 않음) 때문에 없다.
   (a) 실동(샘플) 유지 · "없는 것"에 적힘 (b) 부분으로 내린다 (c) 회장님께 공정비용을 원가에 넣을지 묻는다(시연 원가가 바뀐다)
2. **p42 판정** — 3D 2D CAD Mapping 이 없다(필요한 입력: 3D 모델 · CAD 규칙). (a) 실동(샘플) (b) 부분
3. **반쪽 worktree 폴더 2개**(`k-c-cad1` · `kc-cad1-work` · git 등록 없음) — (a) 회장님이 직접 지운다 (b) 다음 청크에서 CC 가 지운다(승인 문구 필요) (c) 둔다
4. **시연 태그** — L 통합분 머지 뒤 `demo-20261001-n` 같은 새 이름으로? (a) 머지 직후 CC 가 annotated 태그 push (b) 회장님 (c) 만들지 않음

## 9. 내가 한 판정은 '주장'이다

- p42 · p43 · p44 · p69 실동(샘플) · p58 부분은 **CC 초안 — 엘 재측정 전**이다. 생성기 `judge` 칸에 그렇게 박았다.
- 마이그레이션은 회장님 대화 답("ccmd L 설계대로 추가")에 기댔다. QR 라이브러리 1개도 같은 답의 범위로 보았다(ccmd L 하드 가드 9 가 허용한 한 개). 회장님이 다르게 보셨다면 0039 · QR 라이브러리를 빼는 것이 이 PR 안에서 가능하다(커밋 `1b38629` 에 함께 있다).
- `features\*.sinc` 없음 → 건너뜀.
