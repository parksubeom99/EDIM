# lmd M-2 — CP4 직전 정리 회수서 (CC → 엘 · 2026-10-01)

- 인계: ccmd M-2 · 작업 브랜치 `claude/ccmd-m2-cp4-close-4974f1`(worktree) · base `origin/main f369926` → 문서 PR #3 머지 뒤 `ce73119` 위로 rebase
- 이번 청크 PR: **[parksubeom99/EDIM#4](https://github.com/parksubeom99/EDIM/pull/4) · 머지 안 함(회장님 승인 대상)**
- 증빙: `docs/03-handoff/m2-evidence/` · CP4 사실 묶음: `docs/03-handoff/cp4-facts-20261001.md`

## 1. 한 일

| STEP | 한 줄 |
|---|---|
| 0 | main `f369926` · 문서 PR #3 OPEN · L(`fix/l-b-tidy`) 미커밋 3파일 · 원격 L 브랜치 없음 — PASS |
| 1 | EBIT 판정 **(가) 설계대로**. 산식은 고치지 않았다. PCR 표 밑에 원가 기준 한 줄을 넣고(인쇄본 · Excel), Contract 근거 칸의 낡은 문구를 고쳤다. 타이 단언: 단위 +1 · e2e S80d |
| 2 | `docs/DEMO.md` — "견적 = 원가 그대로 · 한 원도 다를 수 없다"(M-1 이후 틀린 말)를 원가 ₩15,487,170 / 견적 ₩17,035,887 구분으로 고쳤다 · 마진율 10% 샘플 표기 · 방어 카드 2장 |
| 3 | e2e host-only 표시(`EDIM_E2E_TARGET=kit`) → 킷 1회 **381/381 · EXIT 0** · 건너뜀 **3**(S76d · S79d · S80c — 예상 2보다 1개 많음) · 볼륨은 이름 지정 1개 삭제 |
| 4 | PR #3(문서 2파일 · CI pass) ff 머지 `f369926..ce73119` · 이번 청크 PR #4 생성 · 전수 재검증 PASS |
| 5 | `--check` EXIT 1(어긋남 확인) → 재생성 → EXIT 0 · 70 = 42·5·4·19 · 설계 결정 장부 · 연결 장부 · CP4 사실 묶음 |

커밋(PR #4): `718f47b` EBIT 원가 기준 · S80d · DEMO / `793d9fb` e2e host-only / `c62a4eb` 사실 묶음 · 장부 · page-map / `848f968` 이 lmd

## 2. STEP 0 실측

```
C:/dev/EDIM                                                f369926 [main]
C:/dev/EDIM/.claude/worktrees/ccmd-cp3-close-20a82a        a3b1853 (detached HEAD)
C:/dev/EDIM/.claude/worktrees/ccmd-edim-document-ae72a5    ce73119 [docs/m1-lmd]
C:/dev/EDIM/.claude/worktrees/ccmd-edim-file-review-0a058c 0fbb112 [fix/l-b-tidy]
C:/dev/EDIM/.claude/worktrees/ccmd-m2-cp4-close-4974f1     f369926 [claude/ccmd-m2-cp4-close-4974f1]
origin/main -1: f369926 docs(m1-L-memo): ccmd L rebase 메모 …
gh pr list --state open: 3  docs: ccmd M-1 회수서(lmd) · L 메모 머지 커밋  docs/m1-lmd  OPEN
git -C <L> status --short:
 M apps/web/app/(app)/drawings/[id]/annotate/annot-editor.tsx
 M apps/web/app/lib/output/dxf.ts
 M scripts/demo_e2e.py
git ls-remote --heads origin fix/l-b-tidy: (없음)
```

## 3. EBIT 판정

### 3-1. 세로 계산 원문 (Own acc. 열 · S80a 견적 body `pcrDetail` · DB 에서 뽑음)

```
pcr {'fullCost': 15487170, 'material': 11718500, 'overhead': 1659340, 'directCost': 13827830, 'manufacturing': 2109330}
total 17035887 · margin pct 10 · costUnit 15487170 · unitPrice 17035887 · pcr-rules.sample.json #0771c2c1fde2
Contract Amount 17035887
[Procurement cost] direct
    Ex-Work | BOM Data · 스냅샷 재료비 | 11718500
    Air/Sea freight | Ex-Work × % | 0
    Customs tax & cost | Ex-Work × % | 0
    Inland trucking, etc | Ex-Work × % | 58593
    Procurement overhead | Ex-Work × % | 117185
    Avoidable interest | Ex-Work × % | 35156
   subtotal 11929434
[Sub-manufacturing cost] direct
    Manufacturing (F10) | 스냅샷 인건비(F10) | 2109330
    Site installation | Ex-Work × % | 0
    Equipment rental | Ex-Work × % | 0
    Vendor assembly | Ex-Work × % | 58593
    Site management | Ex-Work × % | 0
    A/S Commissioning | Ex-Work × % | 46874
   subtotal 2214797
[Other direct cost] direct
    Provision for delivery | 견적 금액 × % | 51108
    Provision for risks | 견적 금액 × % | 85179
   subtotal 136287
[Sales & Adm. cost] sna
    Sales overhead | 견적 금액 × % | 255538
    Adm overhead | 견적 금액 × % | 170359
    Bad dept provision | 견적 금액 × % | 34072
    Tech. R&D Cost | 견적 금액 × % | 85179
    Travel cost | 견적 금액 × % | 17036
   subtotal 562184
directTotal [14280518, 15020849, 15209430]
contribution [2755369, 2015038, 1826457]
snaTotal [562184, 749579, 579220]
fullCost [14842702, 15770428, 15788650]
ebit [2193185, 1265459, 1247237]
```

산술: 11,929,434 + 2,214,797 + 136,287 = 14,280,518(Direct) · + 562,184 = 14,842,702(Full) · 17,035,887 − 14,842,702 = **2,193,185** — EBIT 와 맞는다.

S80a 출력에 `17035887` 이 두 번 찍힌 것은 `d80.contract`(PCR 표의 Contract Amount)와 `q80.total`(견적 합계)이다. 둘은 같은 값이 맞다. 원가 칸이 아니다.

### 3-2. 원가 기준 (코드)

- `document.ts` `buildQuotationBody` → `buildPcrDetail({ material: cost.material × qty, labor: cost.labor × qty, contract: amount })`. **스냅샷 `cost.overhead` 는 넘기지 않는다.**
- 스냅샷 Overhead = `Math.round((material + labor) × OVERHEAD_RATIO 0.12)` (`bom.ts:138`) — 12% 일괄 간접비다.
- PCR 표는 그 뭉칫값 대신 간접비를 요율표 줄로 **항목별로 다시 센다**(Procurement overhead · Avoidable interest · Sales overhead · Adm overhead …). `pcr.ts` 머리 주석은 "입력 = 스냅샷 원가(재료비 · 인건비)"이고, 파서는 "bom · mfg 줄이 한 번씩 — 스냅샷 원가가 빠지거나 두 번 들어가지 않게"를 강제한다.
- 이 표의 원가 기준 = 재료비 + 인건비 **₩13,827,830** (≠ 스냅샷 원가 ₩15,487,170). 차이 ₩1,659,340 = 스냅샷 Overhead. Own acc. 에서 요율 줄 합은 14,842,702 − 13,827,830 = ₩1,014,872 로 12% 일괄보다 작다. 그래서 EBIT 가 견적 − 원가보다 ₩644,468 크다(1,659,340 − 1,014,872 = 644,468 — 엘이 적은 차이와 같다).

### 3-3. 판정 — (가) 기준 차이 · 설계대로

- 스냅샷 Overhead 까지 더하면 간접비가 두 번 들어가므로(12% 일괄 + 요율 줄), 지금 기준이 설계 의도다. **코드 산식은 고치지 않았다.**
- 한 것:
  1. PCR 세부 표 밑에 **원가 기준 한 줄**(`data-testid=pcr-cost-basis` · Excel 에는 필드 'PCR 세부 원가 기준'). `[샘플]` 표지는 그대로. 인쇄본 원문:
     `원가 기준: 이 표는 스냅샷 재료비 + 인건비 ₩13,827,830 에서 출발해 간접비를 위 요율표 줄로 다시 센다 — 스냅샷 원가의 Overhead(12% 일괄) ₩1,659,340 은 넣지 않는다(간접비 이중 계상 방지). 그래서 EBIT = 견적 − 요율표 기준 Full costs 이며, 견적 − 스냅샷 원가(₩1,548,717) 와 다를 수 있다.`
     캡처: `m2-evidence/pcr_cost_basis.png`
  2. `pcrDetail` 에 `costBase`(재료비 + 인건비) · `snapshotOverhead` 를 넣었다. 옛 견적 body 에는 이 칸이 없으므로 기준 문구가 Ex-Work + Manufacturing 줄로 대신 센다. 스키마 변경은 없다(`document.body` JSON).
  3. Contract Amount 근거 칸의 "이 견적서 금액(스냅샷 원가 그대로)"가 M-1 이후 틀린 설명이었다 → "이 견적서 금액 = 스냅샷 원가 × (1 + 마진율 10%)"(마진율 0 이면 옛 문구).
- 원가 ₩15,487,170 · 견적 ₩17,035,887 **불변**(e2e S80d 가 두 값을 못 박는다).

### 3-4. 타이 단언

- 단위 `pcr.test.ts` 신규 1건: 세로 합(구역 소계 + EBIT) = 견적 · EBIT ≤ 견적 − costBase · costBase 2,360,000 · Overhead 283,200 · 기준 한 줄 · 낡은 문구 없음.
- e2e **S80d**(개발 · 킷 모두 PASS):
```
PASS S80d EBIT 타이 — … → ([2193185, 1265459, 1247237], [17035887, 17035887, 17035887], 13827830, 1659340, 15487170, 17035887, '원가 기…')
```
- 검사기 음성 대조: 원가 기준을 스냅샷 원가(Overhead 포함)로 바꿔 넣으면 Own acc. 에서 `EBIT ≤ 견적 − 기준` 이 **False** 가 된다(실측 `neg-check … False`). 검사식이 어긋남을 잡는다.

## 4. 실측 수치 원문

전수 재검증(main `ce73119` + 이 브랜치 · `db:reset:demo` 직후):
```
pnpm install EXIT 0
pnpm db:generate EXIT 0
pnpm db:migrate EXIT 0
pnpm db:reset:demo EXIT 0
pnpm typecheck EXIT 0
pnpm -r test EXIT 0
packages/bom-code test:       Tests  58 passed (58)
packages/macro-registry test:       Tests  15 passed (15)
packages/hierarchy-address test:       Tests  18 passed (18)
packages/macro-dsl test:       Tests  54 passed (54)
packages/macro-verify test:       Tests  19 passed (19)
packages/macro-compile test:       Tests  13 passed (13)
apps/web test:       Tests  170 passed (170)
```
단위 **347**(M-1 346 + 1).

DB 검증 — `packages/db/package.json` 의 `:test` 12종 전부:
```
backbone:test EXIT 0 · ALL PASS (14)
consulting:test EXIT 0 · ALL PASS (14)
document:test EXIT 0 · ALL PASS (37)
drawing:test EXIT 0 · ALL PASS (30)
hierarchy:test EXIT 0 · HIERARCHY DOMAIN: PASS
learning:test EXIT 0 · 24/24
macro:test EXIT 0 · MACRO REGISTRY RLS: PASS
platform:test EXIT 0 · ALL PASS (25)
project:test EXIT 0 · PROJECT DOMAIN: PASS
revision:test EXIT 0 · ALL PASS
rls:test EXIT 0 · RLS ISOLATION: PASS
special:test EXIT 0 · 23/23
```
(루트 `package.json` 에는 `:test` 가 없다. 목록은 `packages/db/package.json` 에서 뽑았다.)

개발 e2e(host · `next dev`):
```
e2e EXIT 0
[demo_e2e] target=host · 384/384 steps passed
```
기준선(M-2 변경 전 · 같은 세션): `383/383`.

킷 e2e(`docker compose -p edim-prod-m2` · `next start` 컨테이너 · 이번 코드로 빌드 — 이미지 안에 `pcr-cost-basis` 가 들어 있는 것 확인):
```
config EXIT 0 (name: edim-prod-m2 · volume edim-prod-m2_edim-prod-pgdata)
up EXIT 0 · Image edim-migrate:local Built · Image edim-web:local Built
edim-prod-m2-db-1 Up (healthy) · edim-prod-m2-migrate-1 Exited (0) · edim-prod-m2-web-1 Up 0.0.0.0:3000->3000
SKIP(host-only) S76d — 저장소 폴더 packages/bom-code/cad-rules 에 cad-rules.local.json 을 둔다 — 킷 컨테이너는 호스트 폴더를 못 본다
SKIP(host-only) S79d — 호스트 DB 에 bench:seed 를 돌린다 — 킷 DB 가 아니라 호스트 .env 의 DB 에 닿는다
SKIP(host-only) S80c — 저장소 폴더 packages/bom-code/cost-rules 에 pcr-rules.local.json 을 둔다 — 킷 컨테이너는 호스트 폴더를 못 본다
[demo_e2e] target=kit · 381/381 steps passed · host-only 건너뜀 3: S76d, S79d, S80c
e2e EXIT 0
```
- host-only 가 **3개**다(ccmd 예상은 2개). S76d(CAD 규칙서 파일 교체)도 S80c 와 같은 이유로 킷에서 못 돈다. 킷에서만 실패한 단계는 0이다.
- 결과 JSON(`demo_e2e_result.json`)에도 `_skipped_host_only` 로 남는다. 기본값(host)에서는 전부 돈다.

볼륨(`m2-evidence/kit_volumes.txt`):
```
before 36 → mid 37(diff: > local edim-prod-m2_edim-prod-pgdata) → docker volume rm edim-prod-m2_edim-prod-pgdata → after 36 · before == after
```
와일드카드 · prune 는 쓰지 않았다. 옛 볼륨(`edim-prod_…` · `edim-prod-k0_…` · `edim-prod-m_…` 등)은 그대로 있다.

운영 모드 host e2e(`next start` · 저장소에서)는 이번에 **따로 돌리지 않았다**. 운영 모드는 킷 e2e 로 확인했다.

## 5. 문서 PR 머지 · 이번 청크 PR

```
gh pr diff 3 --name-only
docs/03-handoff/lmd-M1-cp4-final-20260930.md
docs/03-handoff/m-to-L-rebase-20260930.md
gh pr checks 3: verify pass 1m22s
mergeable MERGEABLE · CLEAN · merge-base --is-ancestor → ff-ok
before: f369926
   f369926..ce73119  origin/docs/m1-lmd -> main
{"mergedAt":"2026-09-30T20:44:47Z","state":"MERGED"}
```
- 이번 청크 PR: **#4**(머지 대기). 커밋 4개 · 16파일(코드 5 · 문서 · 증빙). `ci.yml` · DEPLOY 주석 · p42/43/44/69 · 툴바 설계 심볼은 건드리지 않았다.

## 6. CP4 사실 묶음 · 판정 수

- 경로: `docs/03-handoff/cp4-facts-20261001.md`
```
check(before regen) EXIT 1   ← DRIFT(생성기 근거 문구를 먼저 고친 상태)
pages 70 · 실동 42 · 부분 5 · 미착수 4 · 개념·표지 19 (실동(샘플) 3) · slides 75
gen EXIT 0
OK — page-map.md = PAGES 출력
check EXIT 0
```
- 판정 변경 0. 근거 문구만 2쪽 고쳤다.
  - **p5**: "연결 장부 14고리 중 이어짐 12 · 없음 2"는 엘 확정판 4 이전 문구였다 → "14 · 0 · 0"(장부 · 확정판 4). ccmd 가 말한 "이어짐 14 · 약함 0 · 없음 0 유지"를 page-map 에도 맞췄다.
  - **p66**: "견적 합계 = 스냅샷 원가 그대로" → "× (1 + 마진율 · 샘플 10%)" · S80a~d.
- 연결 장부: M-2 절을 추가했다. 이어짐 14 · 약함 0 · 없음 0 그대로다.
- 설계 결정 장부(`docs/04-decisions/2026-09-19-business-architecture-ledger.md`): 5절 표에 한 줄을 넣고, 2026-10-01 불변식 절에 ccmd 의 5줄을 그대로 옮겼다.
- 생성기 산출 HTML 은 저장소 밖 `C:\dev\EDIM_shots\reports\m2_20261001\` 에 있다.
- `features\*.sinc` 없음 → 건너뜀.

## 7. 엘에게 묻는 것

1. **완료 정의 4항목 원문** — 저장소 · 인계 파일에서 목록을 찾지 못했다(번호로 남은 것은 "완료 정의 4 = 파일 교체만으로 반영" 하나). 사실 묶음 6절은 4번만 대조했다.
   (a) 엘이 목록을 주면 CC 가 대조표를 채운다 (b) 엘이 CP4 보고서에서 직접 대조한다
2. **host-only 3단계를 킷에서도 돌릴지** —
   (a) 이대로(host e2e 가 덮음 · D-5 빈틈 3을 기록만) (b) 규칙 폴더를 킷에 볼륨으로 붙이고(`EDIM_PCR_RULES` 등) S76d · S80c 를 킷에서도 돌린다. S79d(bench:seed)는 컨테이너 안 실행으로. 이건 `docker-compose.prod.yml` 을 바꾸므로 DEPLOY 와 겹친다 → L 이후.
3. **PCR EBIT 기준 표기** — 지금은 "기준을 밝힌다"(가)다.
   (a) 이대로 (b) 회사 정책이 "스냅샷 Overhead 가 요율 줄을 대신한다"면, 요율표에 overhead 줄을 끄는 옵션을 넣는다(마진 정책과 같이 회사 결정 뒤)

## 8. 내가 한 판정은 '주장'이다

- EBIT **(가)** 판정은 CC 의 주장이다. 근거는 코드 주석 · 파서 규칙 · 요율 줄의 이름(간접비 항목)이고, 회사 회계 기준을 확인한 것은 아니다.
- DEMO 방어 카드의 문구도 CC 가 쓴 것이다. 시연 전 회장님이 읽어 보셔야 한다.
- findstr 참고: ccmd 의 검증 명령 `findstr /N "15,487,170 17,035,887" DEMO.md` 는 파일이 `docs/DEMO.md` 에 있고, findstr 가 쉼표를 구분자로 읽어서 **0건으로 오탐**한다. `/C:"487,170"` 한 단어씩 돌리면 두 값 모두 2줄(119 · 148행)이 나온다. 같은 결과를 grep 으로도 확인했다.
