# ccmd — P0.5 바닥 정리 (개명 · EDIM 생성 · 공개정리 · PR 진단 · 로컬 실측)

- 발행: 2026-07-17 · 엘 → CC
- 회장님 지시: "A(진단 후 이식) 채택. 엘리베이터 repo는 보존. 개명·생성·공개정리 전부 ccmd로."
- 계정: `parksubeom99` (repo 총 9건 — 화면 확인분 5건 + 미확인 4건)

---

## ⚠ 0. 전제 (읽고 시작할 것)

> 아래 기대값은 전부 **엘의 2026-07-17 스냅샷 기준**이며 **실측이 항상 우선**한다.
> 기대값과 실측이 다르면 **강행하지 말고 중단·보고**한다.
> **이식(migration)은 이번 범위 밖이다.** 이번은 바닥 정리 + 진단까지.

### 회장님 확정 입력란 (실행 전 회장님이 확인)

| 항목 | 기본값 (엘 제안) | 회장님 확정 |
|---|---|---|
| 엘리베이터 repo 새 이름 | `elevator-cad` | ( 그대로 / 변경: ______ ) |
| 새 EDIM repo 이름 | `EDIM` | ( 그대로 / 변경: ______ ) |
| 새 EDIM 공개 설정 | `Private` | ( 그대로 / 변경: ______ ) |

---

## 1. STEP 0 — 환경 실측 대조표 (최우선 · 읽기 전용)

| 행 | 검증 명령 | 엘 스냅샷 기대값 | 실측 | ❌일 때 |
|---|---|---|---|---|
| **[계정 인증]** | `gh auth status` | parksubeom99 로그인 | | 미인증 → 중단·보고 (임의 로그인 금지) |
| **[repo 전수]** | `gh repo list parksubeom99 --limit 50 --json name,visibility,description,updatedAt,primaryLanguage` | 총 9건. 확인분: `ecs-routine-probe`(Private) · `edim`(**Public**) · `el_supervisor`(Private) · `skillify-guard-layer`(Private) · `energyProject`(Private) + **미확인 4건** | | — |
| **[edim 실체]** | `gh repo view parksubeom99/edim --json description,defaultBranchRef` | 설명이 **"Elevator CAD (IFC/DXF) → parametric DB"** · Python = **엘리베이터 프로젝트**(EDIM 아님) | | 설명이 다르면 **중단·보고** (개명 대상 오인 위험) |
| **[이름 대소문자]** (H-31 계열) | `gh repo view parksubeom99/EDIM` 시도 | **GitHub repo 이름은 대소문자 미구분으로 알려짐** → `edim` 존재 시 `EDIM` 생성 실패 예상. **실측으로 확인** | | 이미 EDIM이 별도 존재하면 → **중단·보고** |
| **[환경 전제 · 로컬]** | `ls C:\dev\metaverse` · `ls C:\dev\metaverse\EDIM\.git` · `ls C:\dev\metaverse\edim-repo\.git` | `EDIM`(7/16 04:18) · `edim-repo`(7/16 04:08) · `el_supervisor` · `참고자료` **4개 폴더**. `EDIM`에는 `.git` **없음**(어제 실측) | | 경로 부재 → 해당 STEP만 중단·보고 |
| **[edim-repo 정체]** | `git -C C:\dev\metaverse\edim-repo remote -v` · `git log --oneline -5` · `git status` | **미상** — 실측으로 확정 | | 미커밋 변경 있으면 **손대지 말고 보고** |

**❗ [계정 인증] 또는 [edim 실체] ❌ → 이후 STEP 전부 중단.**

---

## 2. STEP 1 — PR #13~#20 진단 (읽기 전용 · 이식 방법을 결정하는 근거)

> 이 진단의 목적은 **"이 브랜치들을 새 EDIM repo로 어떻게 옮길 수 있는가"**를 밝히는 것.
> 특히 **엘리베이터 main에서 갈라져 나왔는지**가 핵심 — 그에 따라 이식 방법이 갈린다.

```
gh pr list --repo parksubeom99/edim --state all --limit 40 --json number,title,state,headRefName,baseRefName,createdAt,additions,deletions,changedFiles
```

각 OPEN PR(#13~#20)에 대해 아래를 채워 **결정표**로 보고:

| PR | 제목 | 브랜치 | base | 변경 파일 수 | **merge-base 커밋** | **엘리베이터 이력 포함?** | 주요 경로 |
|---|---|---|---|---|---|---|---|

- merge-base 확인: `git merge-base origin/main origin/<headRefName>` → 그 커밋이 **엘리베이터 Python 코드 위**인지 확인
- 브랜치 파일 트리: `git ls-tree -r --name-only origin/<headRefName> | head -40`
- **#20 내용 필독**: `gh pr view 20 --repo parksubeom99/edim --json title,body` → 본문 **원문 그대로** 보고 (요약 금지 — "머지 금지" 사유가 핵심)

**추가 판정 (엘이 이식 방법을 정하기 위해 필요)**
```
□ PR 브랜치들이 서로 쌓여 있는가(stacked), 독립인가?  → git log --oneline origin/main..origin/<branch> | wc -l
□ TS 모노레포 파일(package.json·pnpm-workspace.yaml·packages/)이 어느 브랜치에 있는가?
□ 엘리베이터 Python 파일과 TS 파일이 같은 브랜치에 섞여 있는가?
```

**이 STEP은 읽기 전용이다. PR을 close·merge·수정하지 않는다.**

---

## 3. STEP 2 — 엘리베이터 repo 개명 (보존 · 삭제 아님)

> 회장님 지시: **"엘리베이터는 따로 놔둬 — CTO 프로젝트나 EDIM에 도움될 수도 있으니."**
> 즉 **이름만 바꾸고 내용은 그대로 보존**. 삭제·아카이브 금지.

```
gh repo rename elevator-cad --repo parksubeom99/edim --yes
```
- 개명 후 설명 정리(선택): `gh repo edit parksubeom99/elevator-cad --description "Elevator CAD (IFC/DXF) -> parametric DB: parts, params, dependency graph, propagation, 3D regen"`
- **공개 설정 유지 = Public** (회장님 지시: 엘리베이터는 공개 유지)

[자가검증]
```
gh repo view parksubeom99/elevator-cad --json name,visibility,description   → name=elevator-cad, visibility=PUBLIC
gh pr list --repo parksubeom99/elevator-cad --state open | wc -l            → 7~8건 그대로 살아 있음 (개명은 PR을 지우지 않는다)
```
[체크포인트] PR 수가 줄었으면 **즉시 중단·보고**

---

## 4. STEP 3 — 새 EDIM repo 생성 (Private)

> **STEP 2 완료 후에만 실행.** (대소문자 미구분 → `edim`이 남아 있으면 생성 실패 예상)

```
gh repo create parksubeom99/EDIM --private --description "EDIM — AHU parametric CTO platform (RCCS)" --add-readme
```

생성 직후 문서 골격 커밋 (회장님 지시: "작업 과정을 깃에 기록"):
```
docs/
  00-corpus/        ← EDIM.pdf 근거 인용·페이지 색인
  01-design/        ← STEP1~6 설계 HTML (회장님 보유분, 추후 업로드)
  02-reports/       ← 사장님 보고서 등 납품물
  03-handoff/       ← ccmd / lmd 기록
  04-decisions/     ← 결정 로그 (무엇을 왜 정했나)
README.md           ← 프로젝트 개요 + 현재 단계 + 로드맵 P0~P5
```
- README에는 **"이 repo는 EDIM 플랫폼. 엘리베이터 CAD 프로젝트는 elevator-cad repo로 분리됨"** 한 줄 명시 (재발 방지)

[자가검증] `gh repo view parksubeom99/EDIM --json name,visibility` → name=EDIM, visibility=**PRIVATE**
[체크포인트] PUBLIC으로 생성됐으면 **즉시 private 전환 후 보고**

---

## 5. STEP 4 — 공개/비공개 정리

> 회장님 지시: **엘리베이터 · 병원 · 주식 프로젝트 = Public. 나머지 전부 Private.**

1. STEP 0의 repo 전수 목록에서 **병원 / 주식** 프로젝트에 해당하는 repo를 식별 (설명·언어·이름으로 판정)
2. **판정이 애매하면 임의 결정 금지** → 후보를 표로 보고하고 해당 건만 보류

| repo | 현재 | 판정 | 조치 |
|---|---|---|---|
| elevator-cad (구 edim) | PUBLIC | 엘리베이터 → 유지 | 없음 |
| EDIM (신규) | PRIVATE | 유지 | 없음 |
| (병원 추정) | ? | ? | ? |
| (주식 추정) | ? | ? | ? |
| 그 외 전부 | ? | Private | `gh repo edit <repo> --visibility private --accept-visibility-change-consequences` |

[자가검증] 조치 후 `gh repo list parksubeom99 --limit 50 --json name,visibility` 전수 재출력 → 표로 보고
[**절대 제약**] Public → Private 전환은 되돌릴 수 있으나, **star·fork·이슈 참조가 끊길 수 있다.** 확신 없는 repo는 **건드리지 말고 보고**.

---

## 6. STEP 5 — 로컬 정리 (실측·보고만 · 삭제 금지)

> 로컬에 `EDIM`과 `edim-repo` 둘이 있다. 회장님 지시는 **"EDIM 하나로 합친다"**.
> 다만 **어느 쪽에 무엇이 들었는지 모르는 상태에서 합치면 유실 위험** → 이번엔 **실측·보고까지만**.

```
□ ls -R C:\dev\metaverse\EDIM      | head -60      (파일 목록·크기)
□ ls -R C:\dev\metaverse\edim-repo | head -60
□ git -C C:\dev\metaverse\edim-repo remote -v / log --oneline -10 / status / branch -a
□ 두 폴더의 중복·고유 파일 대조표
```

그 다음 **새 EDIM repo만** 클론 (기존 폴더는 손대지 않음):
```
gh repo clone parksubeom99/EDIM C:\dev\metaverse\EDIM-work
```
- 폴더 통합은 **다음 ccmd에서 회장님 승인 후** — 이번엔 실측 대조표만 보고
- **[절대 금지] 로컬 폴더·파일 삭제·이동·덮어쓰기**

---

## 7. 절대 금지 (회장님 명시 지시 위반 = 최고 위험)

```
X 엘리베이터 repo 삭제 · archive · PR close  → "따로 놔둬" 지시 위반
X PR #13~#20 close · merge · 수정            → 진단 대상, 읽기 전용
X 새 EDIM repo에 코드 이식                    → 이번 범위 밖 (다음 ccmd)
X 로컬 폴더·파일 삭제·이동                     → 실측·보고만
X 판정 애매한 repo의 공개설정 임의 변경         → 보고 후 대기
X force push · main 이력 변경
X 실측값 추정·보간 (모르면 "미상")
```

---

## 8. 보고 형식 (lmd — 회장님이 엘에게 회수)

```
## STEP 0 실측 대조표        (§1 표, 실측 열 채움 + repo 9건 전수 목록)
## STEP 1 PR 진단 결정표     (§2 표 + #20 본문 원문 + 3개 추가 판정)
## STEP 2 개명 결과          (before/after + PR 잔존 수)
## STEP 3 EDIM 생성 결과      (name/visibility/docs 구조)
## STEP 4 공개정리 결과       (전수 재출력 표 + 보류 건)
## STEP 5 로컬 실측 대조표    (EDIM vs edim-repo + 클론 결과)
## 막힌 것 / 회장님 결정 필요 사항
```

---

## 9. 다음 (엘이 회수 후)

STEP 1 결정표를 근거로 **이식 방법**을 확정하고 다음 ccmd 발행:
- 케이스 A — PR 브랜치가 엘리베이터 이력과 **분리 가능** → 브랜치만 새 EDIM에 push
- 케이스 B — **뒤엉켜 있음** → 파일만 추출해 새 EDIM에 재커밋 (이력 포기)
- 케이스 C — **살릴 값어치 없음** → 백지 시작

**CC는 이식 방법을 스스로 정하지 않는다. 진단 보고 후 대기.**
