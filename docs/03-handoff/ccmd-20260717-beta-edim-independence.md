# ccmd — β 경로: EDIM 독립 (subtree split 이사 · 개명 · EDIM 생성 · 공개정리)

- 발행: 2026-07-17 · 엘 → CC
- 회장님 결정: **β 채택** — 엘리베이터 main에 병합하지 않고, 통합 브랜치에서 `edim/`만 잘라 새 EDIM repo의 main으로.
- 전제: 어젯밤 CC 산출물(`nightrun/edim-integration-20260716` · 98/98 · 10/10)을 **하나도 버리지 않고 이사**한다.

---

## ⚠ 0. 전제와 경계

> 기대값은 **엘의 2026-07-17 스냅샷 + CC의 lmd 보고 기준**이며 **실측이 항상 우선**.
> 불일치 시 **강행 금지 → 중단·보고**.

**β의 정의 (오해 차단)**
```
✅ 통합 브랜치에서 edim/ 폴더만 추출 → 새 EDIM repo main
❌ PR #21·#22를 엘리베이터 main에 병합   ← α이며, 회장님이 기각한 경로
```

### 회장님 확정 입력란

| 항목 | 기본값(엘 제안) | 확정 |
|---|---|---|
| 엘리베이터 새 이름 | `elevator-cad` | ( 그대로 / ______ ) |
| 새 repo 이름 | `EDIM` | ( 그대로 / ______ ) |
| 새 repo 공개 | `Private` | ( 그대로 / ______ ) |

---

## 1. STEP 0 — 실측 대조표 (읽기 전용 · 최우선)

| 행 | 명령 | 기대값 | 실측 | ❌일 때 |
|---|---|---|---|---|
| **[환경 전제]** (H-31) | `ls C:\dev\metaverse\edim-repo\.git` · `git -C C:\dev\metaverse\edim-repo remote -v` | 어젯밤 클론 **실재**, remote=`parksubeom99/edim` | | 부재 → 재클론 후 진행 (승인됨) |
| **[통합 브랜치]** | `git -C ... branch -a \| grep nightrun` · `git log --oneline -3 nightrun/edim-integration-20260716` | 브랜치 실재, HEAD=`f47f2cd` 계열 | | 부재 → **중단·보고** (이사 대상 없음) |
| **[목표 유효성]** (H-30) | `gh pr list --repo parksubeom99/edim --state all --limit 40 --json number,state,title` | #13~#20 OPEN + **#21·#22 draft OPEN**. main 병합 **0건** | | **#21·#22가 이미 MERGED면 β 전제 붕괴 → 즉시 중단·보고** |
| **[폴더 경계]** ★핵심 | `git ls-tree -r --name-only nightrun/edim-integration-20260716 \| grep -v "^edim/" \| head -40` | **미상 — 실측으로 확정**. 엘 추론: EDIM 코드가 `edim/` 하위에 모여 있음 | | `edim/` 밖에 **EDIM 필수 파일**이 있으면 목록화 후 §3-B로 |
| **[루트 인벤토리]** | 위 명령의 전체 출력 | 엘리베이터 Python + `docs/_state/`(#20 산출) + 루트 `ci.yml` 추정 | | — |
| **[edim/ 내부]** | `git ls-tree -r --name-only nightrun/... \| grep "^edim/" \| head -60` | `edim/packages/db/prisma/schema.prisma` · `edim/packages/macro-*` · `edim/apps/web` · `pnpm-workspace.yaml` 위치 확인 | | `pnpm-workspace.yaml`이 `edim/` 밖이면 **§3-B 분기** |

**★ [폴더 경계] 행이 이 ccmd의 분기점이다. 결과에 따라 §3-A / §3-B로 갈린다.**

---

## 2. STEP 1 — 이사 대상 추출 (로컬 · 되돌리기 가능)

### §3-A — `edim/`가 자족적인 경우 (권장 경로)

```
git -C C:\dev\metaverse\edim-repo checkout nightrun/edim-integration-20260716
git -C C:\dev\metaverse\edim-repo subtree split --prefix=edim -b edim-only
```
- `edim/` 를 건드린 커밋만 남고, 엘리베이터 Python 커밋은 **자동 제외**되며, **이력은 보존**된다.

[자가검증]
```
git -C ... ls-tree -r --name-only edim-only | grep -c "\.py$"        → 0 이어야 함 (파이썬 0줄)
git -C ... ls-tree --name-only edim-only                             → packages/ apps/ 가 루트에 옴
git -C ... log --oneline edim-only | wc -l                           → 1보다 큼 (이력 보존 확인)
```
[체크포인트] `.py` 카운트가 0이 아니면 → **중단·보고** (엘리베이터 코드 혼입)

### §3-B — `edim/` 밖에 필수 파일이 있는 경우

임의 판단 금지. 아래를 표로 **보고하고 대기**:
```
| 파일 | 왜 EDIM에 필요한가 | edim/ 안으로 이동 가능? |
```
- 예: `pnpm-workspace.yaml`이 루트에 있으면 split 후 워크스페이스가 깨진다 → 이동/재작성 필요 여부를 엘이 판단
- **`docs/_state/` 8종(#20 산출)** 은 값어치 있는 자료 → 이사 여부를 보고에 포함(엘 판단)

---

## 3. STEP 2 — 엘리베이터 repo 개명 (보존)

> 회장님 지시: **"엘리베이터는 따로 놔둬 — 나중에 CTO·EDIM에 도움될 수도."** 삭제·아카이브 금지.
> **대소문자 주의**: GitHub repo 이름은 대소문자 미구분으로 알려짐 → `edim` 존재 시 `EDIM` 생성 실패 예상. **개명이 반드시 먼저.**

```
gh repo rename elevator-cad --repo parksubeom99/edim --yes
git -C C:\dev\metaverse\edim-repo remote set-url origin https://github.com/parksubeom99/elevator-cad.git
```
[자가검증] `gh repo view parksubeom99/elevator-cad --json name,visibility` → `elevator-cad` / **PUBLIC 유지**
[체크포인트] 실패 시 중단·보고 (이름 충돌·권한)

---

## 4. STEP 3 — 새 EDIM repo 생성 + 이사

```
gh repo create parksubeom99/EDIM --private --description "EDIM — AHU parametric CTO platform (RCCS)"
git -C C:\dev\metaverse\edim-repo remote add edim-new https://github.com/parksubeom99/EDIM.git
git -C C:\dev\metaverse\edim-repo push edim-new edim-only:main
```
[자가검증]
```
gh repo view parksubeom99/EDIM --json name,visibility,defaultBranchRef  → EDIM / PRIVATE / main
gh api repos/parksubeom99/EDIM/contents --jq '.[].name'                 → packages, apps 등이 루트에 보임
```
[체크포인트] PUBLIC으로 생성됐으면 **즉시 private 전환 후 보고**

---

## 5. STEP 4 — 이사 검증 (합격 기준 = 어젯밤 성적 재현)

> **이 STEP이 통과해야만 STEP 5(PR 정리)로 간다.** 이사가 무손실이었음의 증명.

```
gh repo clone parksubeom99/EDIM C:\dev\metaverse\EDIM-verify
cd C:\dev\metaverse\EDIM-verify
npx pnpm install
npx pnpm -r exec prisma validate    (또는 packages/db 경로에서)
npx pnpm -r exec tsc --noEmit --no-bail
npx pnpm -r test    (DB 불필요 4종: macro-dsl · hierarchy-address · macro-verify · macro-compile)
```

| 검증 | 합격 기준 (어젯밤 실측) | 결과 |
|---|---|---|
| prisma validate | VALID | |
| typecheck | **10/10** | |
| 결정론 vitest | **98/98** (48·18·19·13) | |
| DB 게이트 | Docker 미기동 시 **"대기"로 보고** (위조·우회 금지, H-15) | |

[체크포인트] **98/98 미재현 → 이사 실패 → 즉시 중단·보고. PR 절대 손대지 말 것.**

---

## 6. STEP 5 — 문서 골격 + 결정 기록 (회장님 지시: "작업 과정을 깃에 기록")

새 EDIM repo에 브랜치로 추가 (main 직접 커밋 금지 → PR):
```
docs/00-corpus/     ← EDIM.pdf 근거 페이지 색인
docs/01-design/     ← STEP1~6 설계 HTML (회장님 보유분, 추후 업로드)
docs/02-reports/    ← 사장님 보고서 · 진행 지도
docs/03-handoff/    ← ccmd / lmd 기록 (이 파일 포함)
docs/04-decisions/  ← 결정 로그
README.md
```
**README 필수 문구 (재발 방지)**
```
- 이 repo = EDIM 플랫폼 (AHU 파라메트릭 CTO)
- 엘리베이터 CAD 프로젝트는 elevator-cad repo로 분리 보존됨 (별개 물건)
- 현재 단계 / 로드맵 P1~P5
```
**docs/04-decisions/2026-07-17-beta-migration.md** — 오늘 결정 기록:
```
- 결정: β (subtree split 이사) 채택, α(엘리베이터 main 병합) 기각
- 사유: 엘리베이터 보존물에 TS 코드 혼입 방지 + EDIM 첫 커밋부터 순수
- 이관 근거: 통합 브랜치 nightrun/edim-integration-20260716 (98/98·10/10)
- 해소된 충돌 3건 + 0003→0004 재번호 내역
```

---

## 7. STEP 6 — 원 PR 정리 (STEP 4 통과 후에만)

> PR close는 **reopen 가능** = 되돌릴 수 있음. 단 **STEP 4 검증 통과가 전제.**

`parksubeom99/elevator-cad`의 **#13~#19 · #21 · #22** 에 동일 코멘트 후 close:
```
EDIM 코드는 parksubeom99/EDIM repo로 이관 완료(subtree split, 이력 보존).
검증 재현: typecheck 10/10 · 결정론 테스트 98/98.
이 repo는 엘리베이터 CAD 전용으로 보존됩니다. 본 PR은 이관으로 종료합니다.
```
- **#20(정합 리포트)** 은 **닫지 말고 보고** — `docs/_state/` 8종의 이사 여부를 엘이 판단해야 함
- [자가검증] `gh pr list --repo parksubeom99/elevator-cad --state open` → #20만 남거나, 남는 것을 표로 보고

---

## 8. STEP 7 — 공개/비공개 정리

> 회장님 지시: **엘리베이터 · 병원 · 주식 = Public. 나머지 전부 Private.**

```
gh repo list parksubeom99 --limit 50 --json name,visibility,description,primaryLanguage
```
| repo | 현재 | 판정 | 조치 |
|---|---|---|---|
| elevator-cad | PUBLIC | 엘리베이터 → 유지 | 없음 |
| EDIM | PRIVATE | 유지 | 없음 |
| (병원 추정) | ? | ? | ? |
| (주식 추정) | ? | ? | ? |
| 그 외 | ? | Private | `gh repo edit <repo> --visibility private --accept-visibility-change-consequences` |

- **병원·주식 repo명을 엘이 모른다.** 설명·언어로 판정하되 **애매하면 손대지 말고 후보를 표로 보고**
- [자가검증] 조치 후 전수 재출력

---

## 9. STEP 8 — 로컬 실측 (보고만 · 삭제 금지)

```
□ ls -R C:\dev\metaverse\EDIM | head -40         (문서 스켈레톤 내용)
□ ls C:\dev\metaverse\edim-repo                  (어젯밤 작업본)
□ ls C:\dev\metaverse\EDIM-verify                (STEP 4 검증본)
□ 3개 폴더 대조표 — 무엇이 고유하고 무엇이 중복인가
```
> 회장님 지시는 **"로컬 EDIM 하나로 합친다"**이나, **유실 위험**이 있어 이번엔 대조표 보고까지. 통합은 다음 ccmd에서 승인 후.
> **[절대 금지] 로컬 폴더·파일 삭제·이동·덮어쓰기**

---

## 10. 절대 금지

```
X PR #21·#22를 엘리베이터 main에 병합            → α 경로. 회장님 기각분
X 엘리베이터 repo 삭제 · archive · force push     → "따로 놔둬" 지시 위반
X STEP 4(98/98) 미통과 상태에서 PR close         → 이관 미완인데 원본 닫기 = 유실
X #20 close                                     → docs/_state 처분 미정
X 로컬 폴더·파일 삭제·이동
X 판정 애매한 repo 공개설정 임의 변경             → 보고 후 대기
X 검증 실패를 "환경 탓"으로 우회·위조             → H-15, "대기"로 정직 보고
X 실측값 추정·보간                               → 모르면 "미상"
X P1(스키마 확장)·P2 진입                        → 이번 범위 밖
```

---

## 11. 보고 형식 (lmd)

```
## STEP 0 실측 대조표        (§1 표 + 폴더 경계 결과 = A/B 분기 판정)
## STEP 1 split 결과         (.py 0건 증명 · 커밋 수 · 트리 루트)
## STEP 2 개명 결과
## STEP 3 EDIM 생성·push 결과 (repo URL · visibility · 루트 목록)
## STEP 4 검증표             (10/10 · 98/98 재현 여부 — 미재현 시 원인)
## STEP 5 docs·README PR
## STEP 6 PR 정리 결과       (닫은 것 / 남긴 것)
## STEP 7 공개정리 전수표     (보류 건 명시)
## STEP 8 로컬 대조표
## 막힌 것 / 회장님 결정 필요
```

---

## 12. 다음 (엘 회수 후)

- `docs/_state/` 8종 이사 여부 판단
- 로컬 3폴더 통합 방안 → 회장님 승인
- 로드맵 재확정: **STEP6(실행 고리, 스키마 무변경)** vs **P1(2계층 스키마 확장)** — CC가 지적한 분기, 회장님 결정 사항
- **CC는 지시 없이 P1·STEP6로 넘어가지 않는다.**
