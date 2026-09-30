# lmd M-1 — CP4 마감 회수서 (CC → 엘 · 2026-09-30 ~ 10-01)

- 인계: ccmd M-1(lmd M 판정 회신 + CP4 마감) · 브랜치 `claude/ccmd-m-cp4-entry-f76623`(PR #2) · worktree
- 결과 한 줄: **마진율 반영(EBIT 양수 · 원가 불변) · 판정 SSOT 일원화(42·5·4·19 = 70 · `--check`) · 시연 = 운영 모드 · 개발/운영 모드 e2e 383/383 · PR #2 fast-forward 머지 → main `f369926`(머지 후 재검증 전부 통과) · 옛 볼륨 2개 삭제(3단 확인)**

## 1. 한 일

| STEP | 한 줄 |
|---|---|
| 0 | 재실측 — `.git` 있음 · PR #2 OPEN · CI(앞 헤드) pass · `parksubeom99/EDIM` · main `0fbb112` 그대로 · ccmd L 여전히 미커밋(push 없음) |
| 1 | p66 마진율: 샘플 요율표 `marginPct: 10` 한 줄 · 견적 단가 = 스냅샷 원가 × (1 + 마진율) · 원가 · PCR Full cost · 견적 적용 Table 불변 · 인쇄본 · Word/Excel 에 마진 줄 + '샘플 마진율' 표지 · e2e 단언 6곳을 새 규칙으로 · S80c 에 마진율 파일 교체 단언 |
| 2 | 판정 SSOT: 생성기 `PAGES` 에 판정자(`judge`) · 판정 근거(`why`) · 'CC 초안' 표지 전부 걷음 · page-map 에 두 칸 · `--check`(page-map ≠ PAGES 출력이면 종료코드 1) · 표지 "엘 판정 확정 (2026-09-30)" + "엘 저장소 실측 아님 · lmd 교차검증 기준" |
| 3 | DEMO.md 첫 화면에 "시연은 운영 모드" · 0-A 절((가) `pnpm build` → `pnpm --filter @edim/web start` · (나) docker 킷) · 개발 모드는 예비 경로 + 시연 직전 재시작 · README 시연 줄 |
| 4 | 개발 모드 전수(typecheck · 단위 346 · DB 12 · e2e 383/383) · **운영 모드 e2e 383/383 종료코드 0**(로컬 `next start`) · 서버 정리 |
| 5 | 게이트 7항목 + CI(헤드 `f369926` success) 충족 → main `0fbb112..f369926` fast-forward · 머지된 main 에서 typecheck · 단위 346 · DB 12 · 개발 e2e 383/383 재통과 |
| 6 | `edim-prod_edim-prod-pgdata` · `edim-prod-k0_edim-prod-pgdata` 조회 → 이름 · 사용 컨테이너 대조 → 하나씩 삭제 · 그 외 볼륨 불변 |
| 7 | L rebase 메모(`docs/03-handoff/m-to-L-rebase-20260930.md` — L 의 미커밋 diff 를 M 헤드에 `git apply --check` 로 잰 충돌 면) · 이 lmd. `features/*.sinc` 없음 → 건너뜀 |

## 2. STEP 0 실측 결과

```
/c/dev/EDIM/.git
C:/dev/EDIM                                                0fbb112 [main]
C:/dev/EDIM/.claude/worktrees/ccmd-cp3-close-20a82a        a3b1853 (detached HEAD)
C:/dev/EDIM/.claude/worktrees/ccmd-edim-document-ae72a5    ea68da3 [claude/ccmd-m-cp4-entry-f76623]
C:/dev/EDIM/.claude/worktrees/ccmd-edim-file-review-0a058c 0fbb112 [fix/l-b-tidy]
git log --oneline origin/main -1 → 0fbb112 feat(k-b-consulting): …
{"baseRefName":"main","headRefName":"claude/ccmd-m-cp4-entry-f76623","mergeable":"MERGEABLE","state":"OPEN"}
verify	pass	1m24s	https://github.com/parksubeom99/EDIM/actions/runs/36678218549/job/109767760151
parksubeom99/EDIM
--- L (fix/l-b-tidy):
 M apps/web/app/(app)/drawings/[id]/annotate/annot-editor.tsx
 M apps/web/app/lib/output/dxf.ts
 M scripts/demo_e2e.py
 L HEAD 0fbb112 · 원격에 L 브랜치 없음
```
판정: 5개 조건 전부 PASS — 중단 사유 없음.

## 3. 실측 수치 — 원문 그대로

### 3-1. 개발 모드(reset 직후 · 10-01)
```
Done in 8.8s
✔ Generated Prisma Client (v6.19.3) …
No pending migrations to apply.
Demo reset complete — first save will be Rev A, approved macro is back to the seeded revision.
typecheck EXIT 0
test EXIT 0
packages/bom-code test:       Tests  58 passed (58)
packages/macro-registry test:       Tests  15 passed (15)
packages/hierarchy-address test:       Tests  18 passed (18)
packages/macro-dsl test:       Tests  54 passed (54)
packages/macro-verify test:       Tests  19 passed (19)
packages/auth test: AUTH + TENANT CONTEXT: PASS
packages/macro-compile test:       Tests  13 passed (13)
apps/web test:       Tests  169 passed (169)
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
단위 345 → **346**(+1: pcr.test 의 marginPct · salePrice). e2e 단계 수는 383 그대로 — 새 단계를 더하지 않고 **기존 6단계의 단언을 새 규칙으로 바꿨고**(아래 3-3) S80a · S80c 에 마진 단언을 더했다.

### 3-2. 운영 모드 e2e — 경로: **로컬 `pnpm build` → `pnpm --filter @edim/web start`**(개발 DB 5433 · reset 직후 · 개발 서버 내림)
```
build EXIT 0
apps/web build:  ✓ Compiled successfully in 8.7s
apps/web build:  ✓ Generating static pages (85/85)
   ▲ Next.js 15.5.19
Demo reset complete — first save will be Rev A, approved macro is back to the seeded revision.
e2e EXIT 0
[demo_e2e] 383/383 steps passed
max pg connections: 12
min: 1
```
- 실행 중 `pg_stat_activity`(datname=edim) 3초 간격 31회 표본: `1 6 6 6 6 6 6 6 6 6 6 6 6 6 6 9 9 9 9 9 9 9 9 9 9 9 11 11 12 12 12` — 최대 **12**.
- docker 킷이 아니라 로컬 `next start` 를 고른 이유: e2e 의 두 단계가 서버와 같은 기계의 자원을 쓴다 — S79d(`pnpm --filter @edim/db bench:seed` 로 호스트 DB 표본 줄이기) · S80c(`pcr-rules.local.json` 을 저장소 폴더에 두기). 컨테이너 서버는 그 DB · 파일을 보지 못해 두 단계가 거짓 실패한다. docker 킷의 운영 모드 기동 · 화면 · 규칙 파일은 lmd M 3-4절에서 확인했다.

### 3-3. EBIT 양수 · 원가 불변 (개발 · 운영 모드 같은 값)
```
PASS S6b Cost total ₩15,487,170 → True
PASS S22b 견적 합계 = Cost API 값 × (1 + 마진율 10% — 요율표 샘플 · ccmd M-1) · … → ('QR-61313-01', 'A', 17035887, 15487170, 10)
PASS S80a … EBIT 전부 양수(ccmd M-1) … → (…, 17035887, 17035887, 'pcr-rules.sample.json', '0771c2c1fde2', [2193185, 1265459, 1247237])
PASS S80c … 마진율 10 → 20% 로 견적 합계 = 원가 × 1.2 · 원가(PCR Full cost)는 그대로 · 앞 견적은 합계까지 그대로 … → ([[0, 410148, 0]], [[0, 820295, 0]], 'e2e-local-1', 'pcr-rules.local.json', True, True, 422, 18584604, 15487170, 17035887)
PASS S52c … → (17219060, 15653691, True, [25000.0])
PASS S62c … → (15671656, 14246960, 768000, 11, 11952500, 11952500, True, True)
PASS S75b … → (200, 6280243, 5709312, [5000], …)
```
- EBIT(Own acc. · Biz Type 1 · Biz Type 2) = **2,193,185 · 1,265,459 · 1,247,237** — 전부 양수.
- 원가 ₩15,487,170 불변 · 견적 ₩17,035,887 = 15,487,170 × 1.1(반올림).
- **정직 기록 — 불변식이 바뀌었다**: 전에는 e2e 6곳이 "견적 합계 = 스냅샷 원가"를 못 박았다(S22b · S22c · S52c · S62c · S75b · S80a). 회장님 결정으로 규칙이 "견적 = 원가 × (1 + 마진율)" 로 바뀌었으므로 그 6곳을 **숫자를 맞춘 것이 아니라 새 규칙으로** 고쳤다 — 기대 견적은 그 견적 body 에 박힌 마진율로 계산하고(`quote_expect`), 원가 칸(`pcr.fullCost` = Cost API)은 따로 그대로임을 단언한다. ADR-003 에는 원문을 보존하고 갱신 주석을 달았다.

### 3-4. 확정판 5 판정 수
```
pages 70 · 실동 42 · 부분 5 · 미착수 4 · 개념·표지 19 (실동(샘플) 3) · slides 75
pages 70 · 실동 42 · 부분 5 · 미착수 4 · 개념·표지 19 (실동(샘플) 3)
OK — page-map.md = PAGES 출력
check EXIT 0
```
- 42 + 5 + 4 + 19 = **70**. 실동(샘플) 3 = p28 · p36 · p66. 부분 5 = p9 · p21 · p23 · p38 · p58. 미착수 4 = p42 · 43 · 44 · 69.
- `--check` 가 실제로 어긋남을 잡는지: 판정자 칸을 넣고 page-map 을 다시 만들기 **전**에 돌렸을 때 `DRIFT — docs/00-corpus/page-map.md 가 판정 데이터(PAGES)의 출력과 다르다 …` · `check EXIT 1` 이었다(실측).

## 4. 머지 결과

| # | 게이트 | 충족 | 근거 |
|---|---|---|---|
| 1 | STEP 4 개발 모드 전수 PASS | ✅ | 3-1절 원문 |
| 2 | **STEP 4 운영 모드 e2e 종료코드 0** | ✅ | 3-2절 `e2e EXIT 0` · `[demo_e2e] 383/383 steps passed` |
| 3 | DB 검증 12종 PASS | ✅ | 3-1절 |
| 4 | STEP 1 EBIT 양수 | ✅ | 3-3절 `[2193185, 1265459, 1247237]` |
| 5 | STEP 2 판정 수 42·5·4·19 = 70 | ✅ | 3-4절 |
| 6 | main 이 STEP 0 시점과 같음 | ✅ | 머지 직전 `before: 0fbb112` |
| 7 | ccmd L 이 main 에 없음 | ✅ | L HEAD `0fbb112` · 미커밋 · 원격 L 브랜치 없음 |
| + | PR #2 CI | ✅ | `gh run view 36768613301` → `{"conclusion":"success","status":"completed", … "updatedAt":"2026-09-30T19:53:13Z"}` (헤드 `f369926` · Auto-fix 안 켬) |

머지(fast-forward · 강제 push 없음):
```
before: 0fbb112
ff ok
To https://github.com/parksubeom99/EDIM.git
   0fbb112..f369926  HEAD -> main
after: f369926 docs(m1-L-memo): ccmd L rebase 메모 — …
HEAD:  f369926
MERGED 2026-09-30T19:53:26Z
```
- **main = `f369926`**(PR #2 가 GitHub 에서 MERGED 로 닫힘).

머지된 main(`tree = origin/main: yes`)에서 재검증 — reset 직후:
```
typecheck EXIT 0
test EXIT 0
packages/bom-code test:       Tests  58 passed (58)
packages/macro-registry test:       Tests  15 passed (15)
packages/hierarchy-address test:       Tests  18 passed (18)
packages/macro-dsl test:       Tests  54 passed (54)
packages/macro-verify test:       Tests  19 passed (19)
packages/auth test: AUTH + TENANT CONTEXT: PASS
packages/macro-compile test:       Tests  13 passed (13)
apps/web test:       Tests  169 passed (169)
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
- 이 lmd 와 L 메모의 머지 커밋 칸 채움은 **머지 뒤에 쓴 문서**라 main 에 직접 올리지 않고 문서 전용 PR 로 올렸다(아래 끝 · 머지는 회장님).
- 회장님 PC 의 `C:\dev\EDIM`(main 체크아웃)은 아직 `0fbb112` 이다 — H-5 절차의 `git pull` 로 받는다(CC 는 그 체크아웃을 건드리지 않았다).

## 5. 볼륨 삭제 결과

3단 확인(삭제 직전 다시):
```
[1단 조회] 38 줄
[2단 대조] edim-prod_edim-prod-pgdata · 정확히 일치 1 · 쓰는 컨테이너 0
[2단 대조] edim-prod-k0_edim-prod-pgdata · 정확히 일치 1 · 쓰는 컨테이너 0
```
실행(이름 하나씩 · 와일드카드 · prune 없음):
```
docker volume rm edim-prod_edim-prod-pgdata
edim-prod_edim-prod-pgdata
docker volume rm edim-prod-k0_edim-prod-pgdata
edim-prod-k0_edim-prod-pgdata
after: 36 줄
diff before after:
21,22d20
< local     edim-prod-k0_edim-prod-pgdata
< local     edim-prod_edim-prod-pgdata
```
- 두 볼륨만 사라졌고 그 외 36개는 그대로다(diff 가 위 두 줄뿐).

삭제 전 `docker volume ls` 원문:
```
DRIVER    VOLUME NAME
local     8f6c1de21b950bd18e136d8503a130e661f75a06b406f53fb2709bd5b58d05cb
local     41b5c978327522cf801682b8de58e55c4a331ddb0377356c76e49f96ab99b70a
local     54da9629e5a0865a3b75a1b725be135ccde72e88792c81d91f2a5c4b48ba8c38
local     1137fc163fca2b543f208d94b86c55fccaa7e8a72330f6454a440e2adbce11e5
local     4392f1862d3b67720fd5bd7949b724e25c99e515eb290b48f8cd47dd316f45a2
local     7952fca0e4094c252da9abd5f980aa14e7d7413051c5ace9e9fcbf5adde87ef5
local     404511e09b0eea27ef40c4db3ce24a786f213d82678f596a643d1de80b289e7d
local     018741974c0cc5880111e14c9e1841c1872a43daf263c099b9900525a0c2be60
local     a1f2fc8b8a1bc78870b41ec96c879b895927d0f86c88e20e8a9e0fbdebde01e9
local     agentops_pgdata
local     b859968f6520d1133aab2a4c18e30694c46f98ef3423450519ae98581ce36800
local     c6a2f9a0c5b7268b41a06d1c34bb7c2d1339f8424b6a281fb848fe38c031b4a0
local     ca2b1030c88114e4c5e8037bfce930a28df57b99a38e5ed7f7af7447326af374
local     cranky-antonelli-0d373a_ecs_pgdata
local     d52b945670553a0a44256fa8e5c392e1b3e38e11742f6c4045ce82c850b5bac8
local     dba7774c37536f85879d4a09ba5515264faa453c94f84e05875f7134b1be9d2b
local     dcb4cbdc1bd20428da3bb651b7d4d13fe87730d21a0e17c467154f65ae36730c
local     df20a4e37b41d12015277e9fa705dc32a9f163f5107d8ee63af40647f35ec8de
local     e324e7103bb1e780f7c6b723bebc1f5ffb95b58ab90c8cea3eb898e35655b403
local     edim-prod-k0_edim-prod-pgdata
local     edim-prod_edim-prod-pgdata
local     edim_edim-pgdata
local     el_supervisor_ecs_pgdata
local     f7f7486861bca65baf6a7015249de464d46f580d0f3c19c3cdaeb5a19185a043
local     gallant-germain-e25b6c_pgdata
local     hardcore-rosalind-50fd33_ecs_pgdata
local     hospitalproject_grafana-data
local     hospitalproject_kafka-data
local     hospitalproject_oracle-data
local     hospitalproject_redis-data
local     hospitalproject_tempo-data
local     hospitalproject_zookeeper-data
local     hospitalproject_zookeeper-log
local     infra_gp_postgres_data
local     peaceful-sanderson-1142a6_ecs_pgdata
local     upbeat-euler-2b0429_ollama
local     upbeat-euler-2b0429_pgdata
```
삭제 후 `docker volume ls` 원문:
```
DRIVER    VOLUME NAME
local     8f6c1de21b950bd18e136d8503a130e661f75a06b406f53fb2709bd5b58d05cb
local     41b5c978327522cf801682b8de58e55c4a331ddb0377356c76e49f96ab99b70a
local     54da9629e5a0865a3b75a1b725be135ccde72e88792c81d91f2a5c4b48ba8c38
local     1137fc163fca2b543f208d94b86c55fccaa7e8a72330f6454a440e2adbce11e5
local     4392f1862d3b67720fd5bd7949b724e25c99e515eb290b48f8cd47dd316f45a2
local     7952fca0e4094c252da9abd5f980aa14e7d7413051c5ace9e9fcbf5adde87ef5
local     404511e09b0eea27ef40c4db3ce24a786f213d82678f596a643d1de80b289e7d
local     018741974c0cc5880111e14c9e1841c1872a43daf263c099b9900525a0c2be60
local     a1f2fc8b8a1bc78870b41ec96c879b895927d0f86c88e20e8a9e0fbdebde01e9
local     agentops_pgdata
local     b859968f6520d1133aab2a4c18e30694c46f98ef3423450519ae98581ce36800
local     c6a2f9a0c5b7268b41a06d1c34bb7c2d1339f8424b6a281fb848fe38c031b4a0
local     ca2b1030c88114e4c5e8037bfce930a28df57b99a38e5ed7f7af7447326af374
local     cranky-antonelli-0d373a_ecs_pgdata
local     d52b945670553a0a44256fa8e5c392e1b3e38e11742f6c4045ce82c850b5bac8
local     dba7774c37536f85879d4a09ba5515264faa453c94f84e05875f7134b1be9d2b
local     dcb4cbdc1bd20428da3bb651b7d4d13fe87730d21a0e17c467154f65ae36730c
local     df20a4e37b41d12015277e9fa705dc32a9f163f5107d8ee63af40647f35ec8de
local     e324e7103bb1e780f7c6b723bebc1f5ffb95b58ab90c8cea3eb898e35655b403
local     edim_edim-pgdata
local     el_supervisor_ecs_pgdata
local     f7f7486861bca65baf6a7015249de464d46f580d0f3c19c3cdaeb5a19185a043
local     gallant-germain-e25b6c_pgdata
local     hardcore-rosalind-50fd33_ecs_pgdata
local     hospitalproject_grafana-data
local     hospitalproject_kafka-data
local     hospitalproject_oracle-data
local     hospitalproject_redis-data
local     hospitalproject_tempo-data
local     hospitalproject_zookeeper-data
local     hospitalproject_zookeeper-log
local     infra_gp_postgres_data
local     peaceful-sanderson-1142a6_ecs_pgdata
local     upbeat-euler-2b0429_ollama
local     upbeat-euler-2b0429_pgdata
```

## 6. 엘에게 묻는 것

1. **`--check` 를 CI 에 넣을지** — 이미지 없이 도는 검사라 CI 한 줄이면 된다. 다만 `.github/workflows/ci.yml` 은 ccmd L 의 LC(CI 주석) 범위와 겹쳐 이번엔 넣지 않았다. (a) L 이 LC 에서 함께 넣는다 (b) 다음 청크에서 CC 가 넣는다 (c) 넣지 않는다
2. **마진율을 Business Type 마다 다르게** 둘지 — 지금은 요율표 한 줄(10%) 하나다. 회사 정책이 유형별이면 요율표 형식을 넓혀야 한다(스키마 변경 없음 · 파일 형식만). (a) 지금 한 줄 유지 (b) 유형별로
3. **DEMO 방어 카드 숫자** — 견적 금액이 ₩15,487,170 → ₩17,035,887 로 바뀌었다. 방어 카드 숫자 정리는 L 의 LC 범위라 M 은 DEMO 본문 숫자를 고치지 않았다(0-A 절만 더함). (a) L 이 LC 에서 (b) CC 가 지금
4. L 인계 메모(`m-to-L-rebase-20260930.md`)의 충돌 풀이(`datumMm` 방향 인자 유지)를 엘이 L 에게 그대로 넘길지

## 7. 내가 한 판정은 '주장'이다

위 수치와 판정은 CC 의 실측 · 주장이다. 엘은 이번에도 저장소를 직접 재지 못했으므로(ccmd M-1 0.1) 최종 판정은 엘이 이 lmd 원문으로 한다.

---

## 부록 — 회장님 직접 확인(H-5)

```
cd /d C:\dev\EDIM
git fetch
git pull
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:reset:demo
pnpm build
pnpm --filter @edim/web start
```
(시연은 운영 모드 — DEMO.md 0-A. 개발 모드 `pnpm dev` 는 예비.)

정상이면: 원가 합계 **₩15,487,170** · 견적 인쇄본 합계 **₩17,035,887** · 그 위 "견적 단가 = 스냅샷 원가 ₩15,487,170 × (1 + 마진율 10%)" 줄과 **'샘플 마진율'** 표지 · 아래 `PCR 세부 · Business Type [샘플]` 표의 **EBIT 전부 양수** · `/setup/ui` UI 개발 AI · Object Inspector · Signal/Slot · Design ▸ Arrangement 의 '구동 방식' 열.
실패 신호: 원가가 ₩15,487,170 이 아님(마진이 원가에 들어감 — 되돌려야 함) · EBIT 음수 · PCR 세부표 없음.
