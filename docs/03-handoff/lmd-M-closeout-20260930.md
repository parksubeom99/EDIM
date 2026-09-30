# lmd M — 마감 청크 회수서 (CC → 엘 · 2026-09-30)

- 인계: ccmd M(마감 청크 · CP4 진입) · 작업 브랜치 `claude/ccmd-m-cp4-entry-f76623`(worktree) · base `origin/main 0fbb112`
- 커밋 7개(아래 1절) · **main 변경 없음 · 머지 안 함 · 공개 설정 안 건드림**
- 증빙 파일: `docs/03-handoff/m-evidence/`(운영 킷 화면 1 · 파일 교체 전후 2)

> **먼저 알릴 것 — ccmd L 이 병렬로 진행 중이다.** 다른 worktree(`fix/l-b-tidy`)에 ccmd L(LB-1 S69 시험 강화 · LB-2 CADRULE 글자 겹침) **미커밋 변경**이 있다(09-30 11:40). 엘 확정판 4 PDF 에 따르면 L 은 p42 · 43 · 44 · 69(LA) · 툴바 '설계 심볼'(LB) · DEPLOY/CI 주석(LC)을 맡는다. 그래서 M 은 **L 범위를 건드리지 않고** p21 · 25 · 26 · 36 · 66(+ 문서 · 배포)만 닫았다. 열린 PR 은 없어 중단 조건(열린 PR 과 겹침)에는 해당하지 않았다.
> 머지 때 겹칠 파일: `scripts/demo_e2e.py`(L: S69 · M: S10b · S28c · S80~S82) · `apps/web/app/lib/output/dxf.ts` `cadEntities`(L: 글자 배치 · M: `datumMm(…, sec.dir)` 두 줄). 둘 다 작은 충돌로 본다.

## 1. 한 일

| STEP | 한 줄 |
|---|---|
| 0 | 환경 · 식별자 · 목표 실측 — `.git` 있음 · worktree · autocrlf false/eol lf · `parksubeom99/EDIM` · **이미 PUBLIC** · 부분 10 · 미착수 4(저장소 판정 데이터 · 엘 확정판 4 는 9 · 4) |
| 1 | 도구 전부 있음(Docker 데몬은 꺼져 있어 Docker Desktop 을 켰다 — 설치 아님) · ezdxf 1.4.4 |
| 2 | 기준선 고정 — typecheck 0 · 단위 328 · DB 검증 12/12 · e2e **371/371** |
| 3 | 닫음: **p66**(PCR 세부 · Business Type · 샘플 요율표) · **p25 · p26**(UI Form 저장·삭제·등록 · Canvas · Call · 노드별 UI · Object Inspector · Signal/Slot · UI 개발 AI 결정론) · **p21 일부**(UI Tool 탭 = 노드의 폼) · **p36**(구동 방식 · 방향 ↔ 기준점 · 편집 화면). e2e +12(S80~S82) · 기존 고정 대기 2곳(S10b · S28c)을 상태 대기로 |
| 4 | 운영 킷 결함 수리(규칙 파일이 이미지에 없음) · docker 한 줄 실행 확인 · 카탈로그 파일 교체 경로 + 실측(원가 변화) · README 3단계 · DEPLOY 6~9절 |
| 5 | 브랜치 push · PR(아래 5절) · 공개 설정 3단 확인 = 이미 public → 아무것도 안 함 |
| 6 | 청사진 대조 확정판 5 초안 생성 · page-map · 연결 장부 · 이 lmd. `features/*.sinc` 없음 → 건너뜀 |

커밋: `b2cd290` p66 · `8952ebe` p25-p26 · `4bc7ccc` e2e S80 · S81 · S10b · `ed8b66a` p36 · `943bdfc` e2e S82 · S28c · `3c80a2f` 배포 · `2ae462e` 문서

## 2. STEP 0 대조표

| 축 | 확인 항목 | 기대값 | 실측 | 판정 |
|---|---|---|---|---|
| 환경 | `C:\dev\EDIM\.git` 존재 | 존재 | `/c/dev/EDIM/.git` 존재 | PASS |
| 환경 | worktree 여부 | (측정) | worktree 4개 — 이 작업 `ccmd-edim-document-ae72a5` (브랜치 `claude/ccmd-m-cp4-entry-f76623` · HEAD `0fbb112` = origin/main) · 다른 worktree `ccmd-edim-file-review-0a058c`(`fix/l-b-tidy` · **미커밋 변경 3파일 = ccmd L 진행 중**) | PASS(주의) |
| 환경 | `core.autocrlf` | (측정) | `false` · `core.eol=lf` | PASS |
| 시간 | main HEAD | ccmd L 반영본 | `0fbb112`(ccmd K 끝) — **ccmd L 은 main 에 없다**(다른 worktree 에서 미커밋 진행 중) | 기대와 다름 |
| 시간 | 열린 PR · 미머지 브랜치 | (측정) | 열린 PR 0(전체 PR 은 #1 MERGED 1건) · 원격 브랜치 다수(기능별 · 머지된 것) | PASS |
| 식별자 | `repos/parksubeom99/EDIM` full_name | `parksubeom99/EDIM` | `parksubeom99/EDIM` · remote `https://github.com/parksubeom99/EDIM.git` | PASS |
| 식별자 | visibility | (측정) | `{"isPrivate":false,"visibility":"PUBLIC"}` | PASS(이미 공개) |
| 목표 | 부분 쪽 목록 | 9쪽 | **10쪽** p9 · 21 · 23 · 25 · 26 · 28 · 36 · 38 · 58 · 66(저장소 생성기) — 엘 확정판 4 는 p28 을 실동(샘플)로 올려 9쪽(생성기에 아직 반영 안 됐던 것) | 차이 설명됨 |
| 목표 | 미착수 쪽 목록 | 4쪽 | 4쪽 p42 · 43 · 44 · 69 | PASS |
| 목표 | 연결 장부 없음 | 0 | 합계(CC 주장 · 엘 확정판 4 확정) 이어짐 14 · 약함 0 · 없음 0 | PASS |

## 3. 실측 결과 — 원문 그대로

### 3-1. STEP 1 도구
```
v24.14.1
9.15.4
Python 3.12.10
git version 2.53.0.windows.1
gh version 2.92.0 (2026-04-28)
Docker version 29.5.2, build 79eb04c
Docker Compose version v5.1.4
1.4.4                       (ezdxf)
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine … (데몬 꺼짐 → Docker Desktop 실행 → 29.5.2 응답)
```

### 3-2. STEP 2 기준선(09-30 13:0x · reset 직후)
```
pnpm install: Done in 6s · EXIT install 0
pnpm db:migrate: No pending migrations to apply.
typecheck EXIT 0   (apps/web typecheck: Done — 11 패키지)
packages/bom-code test:       Tests  52 passed (52)
packages/hierarchy-address test:       Tests  18 passed (18)
packages/macro-registry test:       Tests  15 passed (15)
packages/macro-dsl test:       Tests  54 passed (54)
packages/macro-verify test:       Tests  19 passed (19)
packages/macro-compile test:       Tests  13 passed (13)
apps/web test:       Tests  157 passed (157)
packages/auth test: AUTH + TENANT CONTEXT: PASS
== backbone:test EXIT 0 :: ALL PASS (14)
== rls:test EXIT 0 :: RLS ISOLATION: PASS
== revision:test EXIT 0 :: ALL PASS
== platform:test EXIT 0 :: ALL PASS (25)
== drawing:test EXIT 0 :: ALL PASS (30)
== document:test EXIT 0 :: ALL PASS (37)
== project:test EXIT 0 :: PROJECT DOMAIN: PASS
== macro:test EXIT 0 :: MACRO REGISTRY RLS: PASS
== hierarchy:test EXIT 0 :: HIERARCHY DOMAIN: PASS
== learning:test EXIT 0 :: LEARNING: ALL PASS (24/24)
== special:test EXIT 0 :: SPECIAL: ALL PASS (23/23)
== consulting:test EXIT 0 :: ALL PASS (14)
e2e EXIT 0
[demo_e2e] 371/371 steps passed
```
주: 루트 `package.json` 에 `test` 스크립트가 없어 `pnpm test` 대신 `pnpm -r test` 로 돌렸다(각 패키지의 test).

### 3-3. STEP 3 이후 재검증(최종 · 09-30 15:0x · reset 직후)
```
typecheck EXIT 0
packages/bom-code test:       Tests  58 passed (58)
packages/macro-registry test:       Tests  15 passed (15)
packages/hierarchy-address test:       Tests  18 passed (18)
packages/macro-dsl test:       Tests  54 passed (54)
packages/macro-verify test:       Tests  19 passed (19)
packages/auth test: AUTH + TENANT CONTEXT: PASS
packages/macro-compile test:       Tests  13 passed (13)
apps/web test:       Tests  168 passed (168)
== backbone:test EXIT 0 :: ALL PASS (14)
== rls:test EXIT 0 :: RLS ISOLATION: PASS
== revision:test EXIT 0 :: ALL PASS
== platform:test EXIT 0 :: ALL PASS (25)
== drawing:test EXIT 0 :: ALL PASS (30)
== document:test EXIT 0 :: ALL PASS (37)
== project:test EXIT 0 :: PROJECT DOMAIN: PASS
== macro:test EXIT 0 :: MACRO REGISTRY RLS: PASS
== hierarchy:test EXIT 0 :: HIERARCHY DOMAIN: PASS
== learning:test EXIT 0 :: LEARNING: ALL PASS (24/24)
== special:test EXIT 0 :: SPECIAL: ALL PASS (23/23)
== consulting:test EXIT 0 :: ALL PASS (14)
e2e EXIT 0
[demo_e2e] 383/383 steps passed
```
- 단위 328 → **345**(+17: pcr 5 · ui-form 6 · cad 6). e2e 371 → **383**(+12: S80a~c · S81a~e · S82a~d).
- e2e 흔들림 2건(정직 기록): 중간 실행에서 **S10b**(09-30 13:xx · 22kW 를 읽음)와 **S28c**(['1'])가 한 번씩 실패했다. 둘 다 **기존 고정 `time.sleep(1.5)`** 자리이고 이번 변경이 닿지 않는 화면이다(개발 서버가 새 경로를 컴파일하는 순간 느려짐 — 그때 dev 서버 node 프로세스가 16 GB 까지 불어 있었다). 둘 다 **상태 대기**(저장 응답 · 패널 수)로 바꿨고, 바꾼 뒤 최종 실행은 383/383.
- 운영 모드 e2e(`next start`)는 이번에 돌리지 않았다 — 머지 게이트(README)의 '운영 모드 1회'는 엘 재측정 · 머지 전 게이트에서 필요하다.

### 3-4. docker compose(운영 킷) — STEP 4
```
docker compose -p edim-prod-m -f docker-compose.prod.yml config  → config OK
up EXIT 0
 Image edim-migrate:local Built
 Image edim-web:local Built
 Container edim-prod-m-db-1 Healthy
 Container edim-prod-m-migrate-1 Exited
 Container edim-prod-m-web-1 Started
ps:  edim-prod-m-db-1 Up 17 seconds (healthy) · edim-prod-m-migrate-1 Exited (0) 7 seconds ago · edim-prod-m-web-1 Up 6 seconds
/app/packages/bom-code/cad-rules: cad-rules.sample.json symbols.sample.json
/app/packages/bom-code/cost-rules: pcr-rules.sample.json
login page 200
login 200
EU bom 200 10 runId True
EU cost total 15423733
quote total 15423733 pcrDetail types ['Own acc.', 'Biz Type 1 · 수출', 'Biz Type 2 · 현장 설치'] file pcr-rules.sample.json fp e21d86999cd4
SPF bom 422 Special 부여 필요 — 플랫폼에 의뢰하세요(팬 선정 · Company Info. ▸ 플랫폼에 의뢰) runId False
workbench title EDIM regions 5
docker compose … down → 컨테이너 · 네트워크 제거
```
- 화면 캡처: `m-evidence/01_docker_prod_workbench.png`(작업대 5구역 · 운영 모드).
- 프로젝트 이름을 `edim-prod-m` 으로 따로 줬다 — **엘이 '삭제는 회장님 승인'으로 남긴 옛 볼륨(`edim-prod_edim-prod-pgdata` · `edim-prod-k0_…`)을 건드리지 않으려고**. 새로 만든 `edim-prod-m_edim-prod-pgdata` 와, STEP 0 에서 실수로 생긴 빈 볼륨 `ccmd-edim-document-ae72a5_edim-pgdata`(내가 만든 것 · 비어 있음 · 쓰는 컨테이너 0)는 확인 후 지웠다.
- EU 원가 15,423,733 · 10줄 = API 로 노드 없이 돌려 매크로 값(방진구 줄)이 빠진 값이다(e2e 의 11줄 · 15,487,170 은 노드 · 승인 매크로 포함). SPF 422 는 새 DB 에 Special 부여가 없어서 — 정상 거부.
- **수리한 결함**: 09-29 에 빌드된 옛 이미지 `edim-web:local` 의 `/app/packages/bom-code` 에는 `package.json` 뿐이었다(실측). CAD 규칙서 · PCR 요율표를 실행 중에 파일로 읽으므로, 운영 킷에서는 SPF BOM Run(CAD 규칙서)과 PCR 세부가 파일을 못 찾는다. runner 에 두 폴더를 복사하도록 고쳤다(`3c80a2f`).

### 3-5. 파일 교체만으로 반영(완료 정의 4) — 실측
```
{"tag": "before",   "costTotalOnScreen": "₩15,487,170", "costApi": 15487170}
local catalog written  (catalog.local.json = 샘플 사본 · EU → PFB 1 unitCost {"lit": 62000} → {"lit": 162000})
Catalog seed: 회사 카탈로그 파일 …\packages\bom-code\catalog\catalog.local.json 을 읽습니다(샘플 대신).
{"tag": "after",    "costTotalOnScreen": "₩17,866,050", "costApi": 17866050}
(파일 삭제 + db:reset:demo)
{"tag": "restored", "costTotalOnScreen": "₩15,487,170", "costApi": 15487170}
```
- 화면 캡처 전 · 후: `m-evidence/02_catalog_before.png` · `03_catalog_after.png`(원가 카드 ₩17,866,050 · 하단 상태줄 'COST · ran · 원가 합계 ₩17,866,050').
- 코드 수정 0 — 파일 자리 규칙: `EDIM_CATALOG` → `catalog.local.json` → 샘플. CAD 규칙서(S76d) · PCR 요율표(S80c)도 e2e 가 같은 방식으로 못 박는다.

### 3-6. 청사진 대조 확정판 5 초안 · 연결 장부
```
pages 70 · 실동 42 · 부분 5 · 미착수 4 · 개념·표지 19 (실동(샘플) 3) · slides 75
```
- 실동(샘플) 3 = p28(엘 확정판 4) · p36 · p66(CC 초안). 부분 5 = p9 · p21 · p23 · p38 · p58. 미착수 4 = p42 · 43 · 44 · 69.
- 연결 장부: **이어짐 14 · 약함 0 · 없음 0**(엘 확정판 4 그대로 · M 은 칸을 바꾸지 않음 · 곁가지 4 기록).

## 4. 기대값 대비 차이

| 항목 | 엘 기대(09-30 메모리) | 실측 | 이유 |
|---|---|---|---|
| 청사진 판정 | 실동 38 · 부분 9 · 미착수 4 | 시작 시 저장소 생성기 **37 · 10 · 4** | 엘 확정판 4 의 p28 승격이 생성기에 반영돼 있지 않았다(K 는 "쪽 판정 칸은 그대로"라고 커밋에 적음). 이번에 반영 |
| main | ccmd L 반영본 | `0fbb112`(K 끝) | L 은 다른 worktree 에서 미커밋 진행 중 |
| 공개 여부 | 미상 | 이미 PUBLIC | ccmd I STEP 9 에서 처리된 것으로 보인다 |
| 연결 장부 | 14 · 0 · 0 | 14 · 0 · 0 | 같음 |
| 완료 후 판정(CC 초안) | — | 실동 42(샘플 3) · 부분 5 · 미착수 4 | 아래 5절 |

## 5. 닫지 못한 쪽

| 쪽 | 판정(CC) | 막는 것 | 누구 몫 |
|---|---|---|---|
| p9 | 부분 | 클라우드 배포 0회(배포 킷 · 운영 모드 실행까지는 됨 — D-5 충족) | 회장님(클라우드 계정 · 비용 결정) |
| p21 | 부분 | Enterprise DB 호출([EDIM Information Call] · Type of source) · 직접 입력 DB(공학 자료) · 회사 실자료 학습 | 회장님(회사 자료 원천 M2) — 범위가 정해지면 (가)로 닫을 수 있다 |
| p23 | 부분 | 3D 형상 · 스캔 OCR · PDF → DXF · 실도면 | 회장님(DXF 연구 · 회사 도면) |
| p38 | 부분 | 부품도(Sub Item DWG ①~⑤ — 부품 형상 없음) · 제작도 수준 · 치수선이 연관 치수 개체 아님 · KAD 문법 | CAD 담당(부품 CAD 자료) · 회장님(편집기 M4 · M5) · RCCS 문법(회장님 · 사장님) |
| p58 | 부분 | 툴바 '설계 심볼' 연결(→ **ccmd L LB 진행 중**) · Free CAD(편집기 결정) | ccmd L · 회장님 |
| p42 · 43 · 44 · 69 | 미착수 | 확장 단계 — ccmd M 참고표는 "EDIM 본체 완료 후", 엘 확정판 4 는 "ccmd L LA 대상" | ccmd L(엘 계획) · 회장님 확정 |

스키마 변경(Tier B)이 필요해진 쪽은 없었다 — 새 저장은 전부 기존 JSON 칸(`ui_form.spec` · `document.body` · `product_code.sections` · `bom_code_run.dims`) 안이다.

## 6. 엘에게 묻는 것

1. **p25 · p26 → 실동**으로 셀지. UI 개발 AI 는 결정론 설계기(D-6 폴백)이고, 실행 설정은 하이퍼링크 · 매크로 실행만(프로그램 실행 · 개체 실행 · 소리 없음), Signal/Slot 은 Set-up 에서 나온 연결의 **표**다(표에서 직접 잇지는 않음). (a) 실동 (b) 실동(샘플) (c) 부분 유지
2. **p36 → 실동(샘플)**로 셀지. 구동 방식 · 방향 결합 · 편집 화면이 돌지만 mm 규칙은 샘플 규칙서다. 엘 확정판 4 의 "구동 방식 규칙 · 방향 ↔ 기준점 결합 · 편집 화면" 세 칸이 이것으로 닫혔다고 볼지. (a) 실동(샘플) (b) 부분 유지(이유: …)
3. **p66 → 실동(샘플)**. 견적 금액은 스냅샷 원가 그대로 두고 PCR 세부는 요율표로 '나눠 본' 표다 — EBIT 가 음수로 나오는 열이 있다(견적 금액 = 원가라 마진이 없어서). 견적 금액에 마진을 얹는 정책은 회사 결정으로 남겼다. (a) 이대로 실동(샘플) (b) 마진 정책까지 넣어야 실동
4. **p21 의 Enterprise DB 호출 · 직접 입력 DB** — (a) 회사 자료 원천이 정해질 때까지 부분 유지 (b) 샘플 원천으로 지금 닫기(범위를 정해 주시면 다음 청크)
5. **ccmd L 과 머지 순서** — (a) M 먼저 머지 → L 이 rebase (b) L 먼저 → M 이 rebase(충돌: demo_e2e.py · dxf.ts cadEntities 두 줄)
6. 옛 운영 볼륨 2개(`edim-prod_edim-prod-pgdata` · `edim-prod-k0_edim-prod-pgdata`)는 **그대로 두었다**(K-0 Q1 회장님 승인 대기).

## 7. 내가 한 판정은 '주장'이다

위 판정 수(실동 42 · 부분 5 · 미착수 4)와 연결 장부 합계는 **CC 주장**이다. 최종 판정은 엘이 재측정한 뒤 한다. 판정 데이터의 CC 초안 쪽에는 "CC 초안(ccmd M) — 엘 재측정 전" 표지를 달았다.

---

## 부록 A. 머지 승인 게이트 증거(분할 유지)

- [x] STEP 2 기준선 수치 원문 — 3-2절
- [x] STEP 3 이후 재검증 수치 원문(e2e 371 → 383 · 전부 통과) — 3-3절
- [x] DB 검증 전 종목 PASS — 3-3절(12종)
- [x] `docker compose up -d` 후 화면 캡처 1장 — `m-evidence/01_docker_prod_workbench.png`
- [x] 샘플 파일 교체 → reset → 화면 숫자 변화 캡처 2장 — `m-evidence/02_catalog_before.png` · `03_catalog_after.png`
- [x] 청사진 확정판 5(초안) 판정 수 — 3-6절
- [x] main 미변경 — `git log --oneline origin/main -1` = `0fbb112`(push 뒤에도 같음 · 5절 PR 은 브랜치만)
- [ ] 운영 모드 e2e 1회(README 머지 게이트) — 이번에 안 돌림

## 부록 B. 회장님 직접 확인(H-5)

```
cd /d C:\dev\EDIM
git fetch
git checkout claude/ccmd-m-cp4-entry-f76623
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:reset:demo
pnpm dev
```
정상이면: `/workbench` 5구역 · BOM Run 뒤 원가 ₩15,487,170 · Document 탭 견적 인쇄본 아래 **'PCR 세부 · Business Type [샘플]'** 표 · `/setup/ui` 왼쪽 **'UI 개발 AI — 설명으로 설계'** · 오른쪽 **Object Inspector · Signal/Slot · Work Hierarchy** · Design ▸ Arrangement 표에 **'구동 방식'** 열.
실패 신호: 견적에 PCR 세부가 없음(요율표 파일 경로) · UI Form 저장·등록 403(owner 로 로그인했는지) · 도면 422(설계 검증 — 메시지 확인).
